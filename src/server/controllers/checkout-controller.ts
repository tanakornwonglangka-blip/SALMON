import type { RequestHandler } from "express";
import { nanoid } from "nanoid";
import { allRows, getRow, run, type DbRow } from "../db.js";
import { HttpError } from "../errors.js";
import { requireUser } from "../services/auth-service.js";
import {
  createOctopusPayment,
  inquireOctopusTransaction,
  inquireOctopusTransactionByOrderId,
  octopusErrorMessage,
  verifyOctopusContentSignature
} from "../services/payment-service.js";
import { transactionRow } from "../services/transaction-service.js";
import type { CartItemInput, PaymentMethod } from "../types.js";

export const checkout: RequestHandler = async (req, res) => {
  const user = requireUser(req);
  const data = req.body as { items?: CartItemInput[]; paymentMethod?: PaymentMethod };
  const items = data.items ?? [];
  if (!items.length) throw new HttpError(400, "ตะกร้าสินค้ายังว่างอยู่");

  const paymentMethod = data.paymentMethod;
  if (!["เงินสด", "QR PromptPay", "Card"].includes(String(paymentMethod))) {
    throw new HttpError(400, "ประเภทการจ่ายเงินไม่ถูกต้อง");
  }

  const ids = items.map((item) => Number(item.id));
  const placeholders = ids.map(() => "?").join(",");
  const rows = allRows(`SELECT * FROM menu_items WHERE id IN (${placeholders}) AND available = 1 AND deleted = 0`, ...ids);
  const lookup = new Map(rows.map((row) => [Number(row.id), row]));
  if (lookup.size !== new Set(ids).size) throw new HttpError(400, "มีเมนูที่ไม่พร้อมขายหรือถูกลบแล้ว");

  const first = lookup.get(ids[0]);
  if (!first) throw new HttpError(400, "มีเมนูที่ไม่พร้อมขายหรือถูกลบแล้ว");
  const merchantId = Number(first.merchant_id);
  let subtotal = 0;
  const orderLines: Array<{ menu: DbRow; quantity: number; lineTotal: number }> = [];

  for (const cartItem of items) {
    const menu = lookup.get(Number(cartItem.id));
    if (!menu) throw new HttpError(400, "มีเมนูที่ไม่พร้อมขายหรือถูกลบแล้ว");
    if (Number(menu.merchant_id) !== merchantId) throw new HttpError(400, "หนึ่งคำสั่งซื้อรองรับร้านเดียวก่อน");
    const quantity = Number(cartItem.quantity);
    const lineTotal = Number(menu.price) * quantity;
    subtotal += lineTotal;
    orderLines.push({ menu, quantity, lineTotal });
  }

  const deliveryFee = 20;
  const totalAmount = subtotal + deliveryFee;
  const transactionStatus = paymentMethod === "Card" ? "pending_payment" : "paid";
  const tx = run(
    "INSERT INTO transactions (merchant_id, user_id, customer_name, delivery_address, delivery_latitude, delivery_longitude, payment_method, subtotal, delivery_fee, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    merchantId,
    user.id,
    user.name,
    user.deliveryAddress,
    user.latitude,
    user.longitude,
    paymentMethod,
    subtotal,
    deliveryFee,
    totalAmount,
    transactionStatus
  );
  const transactionId = Number(tx.lastInsertRowid);
  for (const { menu, quantity, lineTotal } of orderLines) {
    run(
      "INSERT INTO transaction_items (transaction_id, menu_item_id, menu_name, unit_price, quantity, line_total) VALUES (?, ?, ?, ?, ?, ?)",
      transactionId,
      menu.id,
      menu.name,
      menu.price,
      quantity,
      lineTotal
    );
  }

  let paymentPayload = null;
  if (paymentMethod === "Card") {
    const orderId = nanoid();
    run(
      "INSERT INTO payment_attempts (transaction_id, order_id, status) VALUES (?, ?, 'REQUESTED')",
      transactionId,
      orderId
    );
    const payment = await createOctopusPayment({
      orderId,
      amount: totalAmount,
      customerEmail: user.email
    });
    paymentPayload = payment.payload;
    const nextStatus = payment.status === 200 ? "PENDING" : "FAILED";
    run(
      "UPDATE payment_attempts SET reference = ?, redirect_url = ?, status = ?, res_code = ?, res_desc = ?, request_payload = ?, response_payload = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?",
      payment.payload.reference ?? null,
      payment.payload.redirect_url ?? null,
      nextStatus,
      payment.payload.res_code ?? null,
      payment.payload.res_desc ?? payment.payload.error ?? null,
      JSON.stringify(payment.requestBody),
      JSON.stringify(payment.payload),
      orderId
    );
    if (payment.status !== 200) {
      run("UPDATE transactions SET status = 'payment_failed' WHERE id = ?", transactionId);
      throw new HttpError(400, octopusErrorMessage(payment.payload));
    }
  }

  const row = getRow(
    `
    SELECT t.*, m.name merchant_name FROM transactions t
    JOIN merchants m ON m.id = t.merchant_id
    WHERE t.id = ?
    `,
    transactionId
  );
  const response: Record<string, unknown> = { transaction: transactionRow(row!) };
  if (paymentPayload) {
    response.payment = {
      redirectUrl: paymentPayload.redirect_url,
      reference: paymentPayload.reference,
      response: paymentPayload
    };
  }
  res.status(201).json(response);
};

function normalizePaymentStatus(status: string | undefined): "success" | "failed" | "pending" {
  if (["APPROVED", "SETTLED"].includes(status ?? "")) return "success";
  if (["FAILED", "CANCELED", "VOIDED"].includes(status ?? "")) return "failed";
  return "pending";
}

function updateLocalPaymentStatus(attemptId: number, providerPayload: Record<string, unknown>, fallbackStatus?: string) {
  const transaction = providerPayload.transaction as Record<string, unknown> | undefined;
  const providerStatus = String(transaction?.status ?? fallbackStatus ?? "PENDING");
  const localStatus = normalizePaymentStatus(providerStatus);
  const attempt = getRow("SELECT * FROM payment_attempts WHERE id = ?", attemptId);
  if (!attempt) throw new HttpError(404, "ไม่พบรายการชำระเงิน");

  run(
    "UPDATE payment_attempts SET status = ?, res_code = ?, res_desc = ?, response_payload = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    providerStatus,
    providerPayload.res_code ?? null,
    providerPayload.res_desc ?? null,
    JSON.stringify(providerPayload),
    attemptId
  );
  if (localStatus === "success") {
    run("UPDATE transactions SET status = 'paid' WHERE id = ?", attempt.transaction_id);
  } else if (localStatus === "failed") {
    run("UPDATE transactions SET status = 'payment_failed' WHERE id = ?", attempt.transaction_id);
  }
  return { localStatus, providerStatus };
}

export const paymentStatus: RequestHandler = async (req, res) => {
  const user = requireUser(req);
  const transactionId = Number(req.params.transactionId);
  const transaction = getRow("SELECT * FROM transactions WHERE id = ? AND user_id = ?", transactionId, user.id);
  if (!transaction) throw new HttpError(404, "ไม่พบคำสั่งซื้อ");

  const attempt = getRow("SELECT * FROM payment_attempts WHERE transaction_id = ? ORDER BY id DESC LIMIT 1", transactionId);
  if (!attempt) {
    return res.json({ status: transaction.status, result: transaction.status === "paid" ? "success" : "pending" });
  }

  const reference = attempt.reference ? String(attempt.reference) : "";
  const orderId = String(attempt.order_id);
  const inquiry = reference ? await inquireOctopusTransaction(reference) : await inquireOctopusTransactionByOrderId(orderId);
  if (inquiry.status !== 200) {
    run(
      "UPDATE payment_attempts SET status = 'FAILED', res_code = ?, res_desc = ?, response_payload = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      inquiry.payload.res_code ?? null,
      inquiry.payload.res_desc ?? inquiry.payload.error ?? null,
      JSON.stringify(inquiry.payload),
      attempt.id
    );
    run("UPDATE transactions SET status = 'payment_failed' WHERE id = ?", transactionId);
    return res.json({
      status: "FAILED",
      result: "failed",
      error: octopusErrorMessage(inquiry.payload)
    });
  }

  const { localStatus, providerStatus } = updateLocalPaymentStatus(Number(attempt.id), inquiry.payload as Record<string, unknown>);
  res.json({
    status: providerStatus,
    result: localStatus,
    transaction: inquiry.payload.transaction,
    response: inquiry.payload
  });
};

export const octopusNotify: RequestHandler = (req, res) => {
  const rawBody = (req as typeof req & { rawBody?: string }).rawBody ?? JSON.stringify(req.body);
  const signature = String(req.headers["x-content-signature"] ?? "");
  if (signature && !verifyOctopusContentSignature(rawBody, signature)) {
    throw new HttpError(400, "Content Signature Mismatch");
  }

  const data = req.body as Record<string, unknown>;
  const orderId = data.order_id ? String(data.order_id) : "";
  const reference = data.reference ? String(data.reference) : "";
  const attempt = orderId
    ? getRow("SELECT * FROM payment_attempts WHERE order_id = ?", orderId)
    : getRow("SELECT * FROM payment_attempts WHERE reference = ?", reference);
  if (!attempt) return res.json({ ok: true });

  const providerStatus = String(data.status ?? data.process_status ?? attempt.status ?? "PENDING");
  run(
    "UPDATE payment_attempts SET reference = COALESCE(?, reference), status = ?, notify_payload = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    reference || null,
    providerStatus,
    JSON.stringify(data),
    attempt.id
  );
  const result = normalizePaymentStatus(providerStatus === "true" ? "APPROVED" : providerStatus === "false" ? "FAILED" : providerStatus);
  if (result === "success") run("UPDATE transactions SET status = 'paid' WHERE id = ?", attempt.transaction_id);
  if (result === "failed") run("UPDATE transactions SET status = 'payment_failed' WHERE id = ?", attempt.transaction_id);
  res.json({ ok: true });
};

export const checkPaymentRedirect: RequestHandler = async (req, res) => {
  requireUser(req);
  const url = String((req.body as { url?: unknown }).url ?? "");
  let paymentUrl: URL;
  try {
    paymentUrl = new URL(url);
  } catch {
    throw new HttpError(400, "ลิงก์ชำระเงินไม่ถูกต้อง");
  }

  const allowedHosts = new Set(["octopus-sit.digipay.dev", "octopus-unify-sit.digipay.dev"]);
  if (paymentUrl.protocol !== "https:" || !allowedHosts.has(paymentUrl.hostname)) {
    throw new HttpError(400, "ไม่อนุญาตให้ตรวจสอบลิงก์นี้");
  }

  const response = await fetch(paymentUrl, { method: "GET", redirect: "manual" });
  const ok = response.status >= 200 && response.status < 400;
  res.json({
    ok,
    status: response.status,
    statusText: response.statusText || (ok ? "สำเร็จ" : "ไม่สำเร็จ")
  });
};
