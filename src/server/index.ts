import { config } from "./config.js";
import { initDb } from "./db.js";
import { createApp } from "./app.js";

initDb();

const app = createApp();
app.listen(config.port, config.host, () => {
  console.log(`ZaabNua server running at http://${config.host}:${config.port} using ${config.dbPath}`);
});
