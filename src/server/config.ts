import "dotenv/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const config = {
  port: Number(process.env.PORT ?? 5173),
  host: process.env.HOST ?? "127.0.0.1",
  dbPath: resolve(ROOT_DIR, process.env.DB_PATH ?? "data/zaabnua.db"),
  appSecret: process.env.APP_SECRET ?? "local-dev-secret",
  pbkdf2Iterations: Number(process.env.PBKDF2_ITERATIONS ?? 120000),
  seedPassword: process.env.SEED_PASSWORD ?? "password",
  octopus: {
    paymentUrl: "https://octopus-unify-sit.digipay.dev/v2/payment",
    transactionUrl: "https://octopus-unify-sit.digipay.dev/v2/transaction",
    redirectUrl: "http://127.0.0.1:5173/#/payment-result",
    notifyUrl: "http://127.0.0.1:5173/api/payments/octopus/notify",
    signKey: "RSLIeFKvY1ZojCjilM1jp3IuwupAt4Lb7zSNnqx/+fM=",
    headers: {
      "X-API-ID": "g76A1cSu6tqPQVeJUZS4kuJwlmtURwQ_AqmzTTPNB3c",
      "X-API-Key": "6IGGa0clqjd5_pEAZvsjbmD1PSumR1Xk8OHpzMszAUo",
      "X-Partner-ID": "1726728694",
      "Accept-Language": "en",
      "Content-Type": "application/json"
    },
    body: {
      mid: "4012375676",
      description: "ZabbNua Payment Test",
      tokenize: false
    }
  }
} as const;
