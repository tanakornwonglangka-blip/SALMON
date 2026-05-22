import type { RequestHandler } from "express";
import { getRow, run } from "../db.js";
import { rowToUser } from "../mappers.js";
import { requireUser } from "../services/auth-service.js";
import { parseOptionalFloat } from "../utils.js";

export const updateUserProfile: RequestHandler = (req, res) => {
  const user = requireUser(req);
  const data = req.body as Record<string, unknown>;
  const deliveryAddress = String(data.deliveryAddress ?? "");
  const firstName = String(data.firstName ?? user.firstName);
  const lastName = String(data.lastName ?? user.lastName);
  const email = String(data.email ?? user.email);
  const latitude = parseOptionalFloat(data.latitude);
  const longitude = parseOptionalFloat(data.longitude);

  run(
    "UPDATE users SET first_name = ?, last_name = ?, email = ?, delivery_address = ?, latitude = ?, longitude = ? WHERE id = ?",
    firstName, lastName, email, deliveryAddress, latitude, longitude, user.id
  );
  if (user.role === "merchant" && user.merchantId) {
    run("UPDATE merchants SET address = ?, latitude = ?, longitude = ? WHERE id = ?", deliveryAddress, latitude, longitude, user.merchantId);
  }
  res.json({ user: rowToUser(getRow("SELECT * FROM users WHERE id = ?", user.id)) });
};
