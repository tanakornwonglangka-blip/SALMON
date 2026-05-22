import type { RequestHandler } from "express";
import { allRows } from "../db.js";
import { rowToUser } from "../mappers.js";
import { requireUser } from "../services/auth-service.js";

export const users: RequestHandler = (req, res) => {
  const user = requireUser(req);
  const rows = user.role === "admin"
    ? allRows(`
        SELECT u.*, m.name merchant_name FROM users u
        LEFT JOIN merchants m ON m.id = u.merchant_id
        ORDER BY u.id DESC
      `)
    : allRows(`
        SELECT u.*, m.name merchant_name FROM users u
        LEFT JOIN merchants m ON m.id = u.merchant_id
        WHERE u.id = ?
      `, user.id);
  res.json({ users: rows.map((row) => ({ ...rowToUser(row), merchantName: row.merchant_name })) });
};
