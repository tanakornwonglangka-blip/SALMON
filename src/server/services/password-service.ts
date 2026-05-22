import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";

export function hashPassword(password: string, salt = randomBytes(16)): { salt: string; hash: string } {
  const peppered = Buffer.from(`${config.appSecret}:${password}`, "utf8");
  const digest = pbkdf2Sync(peppered, salt, config.pbkdf2Iterations, 32, "sha256");
  return {
    salt: salt.toString("base64"),
    hash: digest.toString("base64")
  };
}

export function verifyPassword(password: string, saltText: string, hashText: string): boolean {
  const salt = Buffer.from(saltText, "base64");
  const candidate = Buffer.from(hashPassword(password, salt).hash, "base64");
  const stored = Buffer.from(hashText, "base64");
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}
