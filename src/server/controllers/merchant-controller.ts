import type { RequestHandler } from "express";
import { allRows, getRow, run } from "../db.js";
import { HttpError } from "../errors.js";
import { menuRow, merchantRow } from "../mappers.js";
import { merchantScopeIds, requireUser } from "../services/auth-service.js";
import { bindIdList, parseOptionalFloat } from "../utils.js";

export const merchantManagement: RequestHandler = (req, res) => {
  const user = requireUser(req);
  if (user.role === "admin") {
    return res.json({
      merchants: allRows("SELECT * FROM merchants ORDER BY id").map(merchantRow),
      menuItems: allRows("SELECT * FROM menu_items WHERE deleted = 0 ORDER BY id DESC").map(menuRow)
    });
  }

  const merchantIds = merchantScopeIds(user);
  const placeholders = bindIdList(merchantIds);
  res.json({
    merchants: allRows(`SELECT * FROM merchants WHERE id IN (${placeholders}) ORDER BY parent_merchant_id, id`, ...merchantIds).map(merchantRow),
    menuItems: allRows(`SELECT * FROM menu_items WHERE merchant_id IN (${placeholders}) AND deleted = 0 ORDER BY id DESC`, ...merchantIds).map(menuRow)
  });
};

export const saveMenuItem: RequestHandler = (req, res) => {
  const user = requireUser(req);
  if (!["admin", "merchant"].includes(user.role)) throw new HttpError(403, "ไม่มีสิทธิ์จัดการเมนู");

  const data = req.body as Record<string, unknown>;
  const merchantId = Number(data.merchantId);
  if (user.role === "merchant" && !merchantScopeIds(user).includes(merchantId)) {
    throw new HttpError(403, "จัดการได้เฉพาะร้านของตัวเอง");
  }

  const itemId = data.id ? Number(data.id) : null;
  const available = ["1", "true", "on", "yes"].includes(String(data.available ?? "true").toLowerCase()) ? 1 : 0;
  const imageUrl1 = data.imageUrl1 ? String(data.imageUrl1) : null;
  const imageUrl2 = data.imageUrl2 ? String(data.imageUrl2) : null;

  if (itemId) {
    const existing = getRow("SELECT * FROM menu_items WHERE id = ? AND deleted = 0", itemId);
    if (!existing) throw new HttpError(404, "ไม่พบเมนูอาหาร");
    if (user.role === "merchant" && !merchantScopeIds(user).includes(Number(existing.merchant_id))) {
      throw new HttpError(403, "จัดการได้เฉพาะร้านของตัวเอง");
    }
    run(
      "UPDATE menu_items SET merchant_id = ?, name = ?, description = ?, price = ?, category = ?, available = ?, image_url_1 = ?, image_url_2 = ? WHERE id = ?",
      merchantId,
      data.name,
      data.description,
      Number(data.price),
      data.category || "เมนูใหม่",
      available,
      imageUrl1 ?? existing.image_url_1,
      imageUrl2 ?? existing.image_url_2,
      itemId
    );
    return res.json({ menuItem: menuRow(getRow("SELECT * FROM menu_items WHERE id = ?", itemId)!) });
  }

  const cursor = run(
    "INSERT INTO menu_items (merchant_id, name, description, price, category, available, image_url_1, image_url_2) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    merchantId,
    data.name,
    data.description,
    Number(data.price),
    data.category || "เมนูใหม่",
    available,
    imageUrl1,
    imageUrl2
  );
  res.status(201).json({ menuItem: menuRow(getRow("SELECT * FROM menu_items WHERE id = ?", Number(cursor.lastInsertRowid))!) });
};

export const deleteMenuItem: RequestHandler = (req, res) => {
  const user = requireUser(req);
  if (!["admin", "merchant"].includes(user.role)) throw new HttpError(403, "ไม่มีสิทธิ์จัดการเมนู");
  const itemId = Number((req.body as { id?: unknown }).id ?? 0);
  const existing = getRow("SELECT * FROM menu_items WHERE id = ? AND deleted = 0", itemId);
  if (!existing) throw new HttpError(404, "ไม่พบเมนูอาหาร");
  if (user.role === "merchant" && !merchantScopeIds(user).includes(Number(existing.merchant_id))) {
    throw new HttpError(403, "จัดการได้เฉพาะร้านของตัวเอง");
  }
  run("UPDATE menu_items SET deleted = 1, available = 0 WHERE id = ?", itemId);
  res.json({ ok: true });
};

export const updateMerchant: RequestHandler = (req, res) => {
  const user = requireUser(req);
  if (!["admin", "merchant"].includes(user.role)) throw new HttpError(403, "ไม่มีสิทธิ์แก้ไขร้านค้า");
  const data = req.body as Record<string, unknown>;
  const merchantId = Number(data.id || user.merchantId || 0);
  if (user.role === "merchant" && !merchantScopeIds(user).includes(merchantId)) {
    throw new HttpError(403, "แก้ไขได้เฉพาะร้านของตัวเอง");
  }
  run(
    "UPDATE merchants SET name = ?, category = ?, address = ?, location = ?, latitude = ?, longitude = ?, status = ?, eta = ? WHERE id = ?",
    data.name,
    data.category,
    data.address,
    data.location,
    parseOptionalFloat(data.latitude),
    parseOptionalFloat(data.longitude),
    data.status || "open",
    data.eta || "25-35 นาที",
    merchantId
  );
  res.json({ merchant: merchantRow(getRow("SELECT * FROM merchants WHERE id = ?", merchantId)!) });
};

export const saveSubMerchant: RequestHandler = (req, res) => {
  const user = requireUser(req);
  if (!["admin", "merchant"].includes(user.role)) throw new HttpError(403, "ไม่มีสิทธิ์เพิ่มร้านค้าย่อย");
  const data = req.body as Record<string, unknown>;
  const parentId = Number(data.parentMerchantId || user.merchantId || 0);
  if (user.role === "merchant" && parentId !== user.merchantId) {
    throw new HttpError(403, "เพิ่มร้านค้าย่อยได้เฉพาะร้านหลักของตัวเอง");
  }
  const cursor = run(
    "INSERT INTO merchants (parent_merchant_id, name, category, address, location, latitude, longitude, rating, status, eta) VALUES (?, ?, ?, ?, ?, ?, ?, 4.5, ?, ?)",
    parentId,
    data.name,
    data.category || "ร้านอาหาร",
    data.address || "ยังไม่ได้ระบุ",
    data.location || "กรุงเทพฯ",
    parseOptionalFloat(data.latitude),
    parseOptionalFloat(data.longitude),
    data.status || "open",
    data.eta || "25-35 นาที"
  );
  res.status(201).json({ merchant: merchantRow(getRow("SELECT * FROM merchants WHERE id = ?", Number(cursor.lastInsertRowid))!) });
};
