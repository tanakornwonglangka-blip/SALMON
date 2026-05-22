import { createHmac } from "node:crypto";
import { config } from "../config.js";
import type { OctopusPaymentResponse } from "../types.js";

interface CreateOctopusPaymentInput {
  orderId: string;
  amount: number;
  customerEmail: string;
}

export function octopusErrorMessage(payload: OctopusPaymentResponse): string {
  return payload.error ?? payload.res_desc ?? payload.message ?? payload.res_code ?? JSON.stringify(payload);
}

function signedHeaders(bodyText: string) {
  const signKey = Buffer.from(config.octopus.signKey, "base64");
  const contentSignature = createHmac("sha256", signKey).update(bodyText).digest("base64");
  return {
    ...config.octopus.headers,
    "X-Content-Signature": contentSignature
  };
}

export function verifyOctopusContentSignature(bodyText: string, signature = ""): boolean {
  return signedHeaders(bodyText)["X-Content-Signature"] === signature;
}

export async function createOctopusPayment(input: CreateOctopusPaymentInput): Promise<{ status: number; payload: OctopusPaymentResponse; requestBody: Record<string, unknown> }> {
  const body = {
    ...config.octopus.body,
    order_id: input.orderId,
    amount: Math.trunc(input.amount),
    url_redirect: config.octopus.redirectUrl,
    url_notify: config.octopus.notifyUrl,
    customer_email: input.customerEmail
  };
  const bodyText = JSON.stringify(body);

  try {
    const response = await fetch(config.octopus.paymentUrl, {
      method: "POST",
      headers: signedHeaders(bodyText),
      body: bodyText
    });
    const payload = await response.json().catch(async () => ({ error: await response.text() })) as OctopusPaymentResponse;
    return { status: response.status, payload, requestBody: body };
  } catch (error) {
    return { status: 0, payload: { error: error instanceof Error ? error.message : String(error) }, requestBody: body };
  }
}

export async function inquireOctopusTransaction(reference: string): Promise<{ status: number; payload: OctopusPaymentResponse }> {
  const response = await fetch(`${config.octopus.transactionUrl}/${encodeURIComponent(reference)}`, {
    method: "GET",
    headers: config.octopus.headers
  });
  const payload = await response.json().catch(async () => ({ error: await response.text() })) as OctopusPaymentResponse;
  return { status: response.status, payload };
}

export async function inquireOctopusTransactionByOrderId(orderId: string): Promise<{ status: number; payload: OctopusPaymentResponse }> {
  const response = await fetch(`${config.octopus.transactionUrl}/orderid/${encodeURIComponent(orderId)}`, {
    method: "GET",
    headers: config.octopus.headers
  });
  const payload = await response.json().catch(async () => ({ error: await response.text() })) as OctopusPaymentResponse;
  return { status: response.status, payload };
}
