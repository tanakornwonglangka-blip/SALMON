import type { RequestHandler } from "express";
import { allRows } from "../db.js";
import { merchantRow, menuRow } from "../mappers.js";
import { currentUser } from "../services/auth-service.js";

export const me: RequestHandler = (req, res) => {
  res.json({ user: currentUser(req) });
};

export const restaurants: RequestHandler = (req, res) => {
  const query = String(req.query.search ?? "").trim();
  const like = `%${query}%`;
  const merchants = query
    ? allRows(
        `
        SELECT DISTINCT m.* FROM merchants m
        LEFT JOIN menu_items mi ON mi.merchant_id = m.id
        WHERE m.name LIKE ? OR m.category LIKE ? OR m.location LIKE ? OR m.address LIKE ? OR (mi.deleted = 0 AND mi.name LIKE ?)
        ORDER BY m.rating DESC
        `,
        like, like, like, like, like
      )
    : allRows("SELECT * FROM merchants ORDER BY rating DESC");

  res.json({
    restaurants: merchants.map((merchant) => ({
      ...merchantRow(merchant),
      menuItems: allRows(
        "SELECT * FROM menu_items WHERE merchant_id = ? AND available = 1 AND deleted = 0 ORDER BY id",
        merchant.id
      ).map(menuRow)
    }))
  });
};
