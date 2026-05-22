import type { ErrorRequestHandler } from "express";
import { HttpError } from "../errors.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }
  if (error && typeof error === "object" && "code" in error && String(error.code).startsWith("SQLITE_CONSTRAINT")) {
    return res.status(400).json({ error: `ข้อมูลซ้ำหรือไม่ถูกต้อง: ${String(error)}` });
  }
  res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
};
