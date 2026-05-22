import type { RequestHandler } from "express";
import { allRows } from "../db.js";
import { merchantRow } from "../mappers.js";
import { merchantScopeIds, requireUser } from "../services/auth-service.js";
import { transactionRow } from "../services/transaction-service.js";
import { bindIdList } from "../utils.js";

export const portal: RequestHandler = (req, res) => {
  const user = requireUser(req);
  if (user.role === "admin") {
    return res.json({
      merchants: allRows("SELECT * FROM merchants ORDER BY id").map(merchantRow),
      transactions: allRows(`
        SELECT t.*, m.name merchant_name FROM transactions t
        JOIN merchants m ON m.id = t.merchant_id
        ORDER BY t.id DESC
      `).map(transactionRow)
    });
  }

  const merchantIds = merchantScopeIds(user);
  const placeholders = bindIdList(merchantIds);
  res.json({
    merchants: allRows(`SELECT * FROM merchants WHERE id IN (${placeholders}) ORDER BY parent_merchant_id, id`, ...merchantIds).map(merchantRow),
    transactions: allRows(`
      SELECT t.*, m.name merchant_name FROM transactions t
      JOIN merchants m ON m.id = t.merchant_id
      WHERE t.merchant_id IN (${placeholders})
      ORDER BY t.id DESC
    `, ...merchantIds).map(transactionRow)
  });
};
