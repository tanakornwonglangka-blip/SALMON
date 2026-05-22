import express from "express";
import { ROOT_DIR } from "./config.js";
import { errorHandler } from "./middleware/error-handler.js";
import { apiRoutes } from "./routes/api-routes.js";

export function createApp() {
  const app = express();
  app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(express.json({
    limit: "15mb",
    verify: (req, _res, buffer) => {
      (req as typeof req & { rawBody?: string }).rawBody = buffer.toString("utf8");
    }
  }));
  app.use("/api", apiRoutes);
  app.use(express.static(ROOT_DIR));
  app.use("/api", (_req, res) => res.status(404).json({ error: "ไม่พบ API" }));
  app.use(errorHandler);
  return app;
}
