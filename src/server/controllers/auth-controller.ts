import type { RequestHandler } from "express";
import { getRow, run } from "../db.js";
import { HttpError } from "../errors.js";
import { rowToUser } from "../mappers.js";
import { createSession, logout as logoutSession } from "../services/auth-service.js";
import { hashPassword, verifyPassword } from "../services/password-service.js";
import { parseOptionalFloat } from "../utils.js";

export const login: RequestHandler = (req, res) => {
  const data = req.body as Record<string, string>;
  const row = getRow("SELECT * FROM users WHERE username = ?", data.username);
  if (!row || !verifyPassword(data.password ?? "", String(row.password_salt), String(row.password_hash))) {
    throw new HttpError(401, "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  }
  const token = createSession(Number(row.id));
  res.json({ token, user: rowToUser(row) });
};

export const register: RequestHandler = (req, res) => {
  const data = req.body as Record<string, string>;
  if (!["merchant", "user"].includes(data.role)) {
    throw new HttpError(400, "สมัครสมาชิกได้เฉพาะร้านค้าและผู้สั่งอาหาร");
  }
  if (!data.email || !data.username || !data.password) {
    throw new HttpError(400, "กรุณากรอก email, username และ password");
  }

  let merchantId: number | null = null;
  if (data.role === "merchant") {
    const merchant = run(
      "INSERT INTO merchants (name, category, address, location) VALUES (?, ?, ?, ?)",
      data.shopName || `ร้านของ ${data.username}`,
      data.category || "ร้านอาหาร",
      data.shopAddress || data.deliveryAddress || "ยังไม่ได้ระบุ",
      data.location || "กรุงเทพฯ"
    );
    merchantId = Number(merchant.lastInsertRowid);
  }

  const { salt, hash } = hashPassword(data.password);
  const user = run(
    "INSERT INTO users (username, password_hash, password_salt, email, role, first_name, last_name, delivery_address, latitude, longitude, merchant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    data.username,
    hash,
    salt,
    data.email,
    data.role,
    data.firstName || data.username,
    data.lastName || "-",
    data.deliveryAddress || data.shopAddress || "",
    parseOptionalFloat(data.latitude),
    parseOptionalFloat(data.longitude),
    merchantId
  );
  res.status(201).json({ user: rowToUser(getRow("SELECT * FROM users WHERE id = ?", Number(user.lastInsertRowid))) });
};

export const logout: RequestHandler = (req, res) => {
  logoutSession(req);
  res.json({ ok: true });
};
