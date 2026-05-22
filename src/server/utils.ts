import type { RequestHandler } from "express";

export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function bindIdList(ids: number[]): string {
  return ids.map(() => "?").join(",");
}

export function parseOptionalFloat(value: unknown): number | null {
  if (value == null || value === "") return null;
  return Number(value);
}
