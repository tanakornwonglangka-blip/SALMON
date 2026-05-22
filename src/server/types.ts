import type { Request } from "express";

export type Role = "admin" | "merchant" | "user";
export type PaymentMethod = "เงินสด" | "QR PromptPay" | "Card";

export interface UserDto {
  id: number;
  username: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  name: string;
  deliveryAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  merchantId: number | null;
}

export interface AuthedRequest extends Request {
  user?: UserDto;
}

export interface CartItemInput {
  id: number | string;
  quantity: number | string;
}

export interface OctopusPaymentResponse {
  request_uuid?: string;
  res_code?: string;
  res_desc?: string;
  reference?: string;
  redirect_url?: string;
  error?: string;
  message?: string;
  transaction?: {
    status?: string;
    [key: string]: unknown;
  };
}
