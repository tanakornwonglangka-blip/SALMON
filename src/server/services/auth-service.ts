import { randomBytes } from "node:crypto";
import type { Request } from "express";
import { allRows, getRow, run } from "../db.js";
import { HttpError } from "../errors.js";
import { rowToUser } from "../mappers.js";
import type { UserDto } from "../types.js";

function bearerToken(req: Request): string {
  return String(req.headers.authorization ?? "").replace("Bearer ", "").trim();
}

export function currentUser(req: Request): UserDto | null {
  const token = bearerToken(req);
  if (!token) return null;
  const row = getRow(
    `
    SELECT u.* FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ?
    `,
    token
  );
  return rowToUser(row);
}

export function requireUser(req: Request): UserDto {
  const user = currentUser(req);
  if (!user) throw new HttpError(401, "กรุณาเข้าสู่ระบบ");
  return user;
}

export function createSession(userId: number): string {
  const token = randomBytes(32).toString("base64url");
  run("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)", token, userId, Math.floor(Date.now() / 1000));
  return token;
}

export function logout(req: Request): void {
  const token = bearerToken(req);
  run("DELETE FROM sessions WHERE token = ?", token);
}

export function merchantScopeIds(user: UserDto): number[] {
  if (user.role === "admin") {
    return allRows("SELECT id FROM merchants").map((row) => Number(row.id));
  }
  if (user.role !== "merchant" || !user.merchantId) return [];
  return allRows(
    "SELECT id FROM merchants WHERE id = ? OR parent_merchant_id = ?",
    user.merchantId,
    user.merchantId
  ).map((row) => Number(row.id));
}
