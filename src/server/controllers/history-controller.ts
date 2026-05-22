import type { RequestHandler } from "express";
import { allRows } from "../db.js";
import { requireUser } from "../services/auth-service.js";
import { transactionRow } from "../services/transaction-service.js";

export const history: RequestHandler = (req, res) => {
  const user = requireUser(req);
  const transactions = allRows(
    `
    SELECT t.*, m.name merchant_name FROM transactions t
    JOIN merchants m ON m.id = t.merchant_id
    WHERE t.user_id = ?
    ORDER BY t.id DESC
    `,
    user.id
  ).map(transactionRow);
  res.json({ transactions });
};
