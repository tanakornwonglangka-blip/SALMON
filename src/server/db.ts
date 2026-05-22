import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { config } from "./config.js";
import { hashPassword } from "./services/password-service.js";

export type DbRow = Record<string, unknown>;

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!db) {
    mkdirSync(dirname(config.dbPath), { recursive: true });
    db = new DatabaseSync(config.dbPath);
    db.exec("PRAGMA foreign_keys = ON");
  }
  return db;
}

export function allRows(sql: string, ...params: unknown[]): DbRow[] {
  return getDb().prepare(sql).all(...params as SQLInputValue[]) as DbRow[];
}

export function getRow(sql: string, ...params: unknown[]): DbRow | undefined {
  return getDb().prepare(sql).get(...params as SQLInputValue[]) as DbRow | undefined;
}

export function run(sql: string, ...params: unknown[]) {
  return getDb().prepare(sql).run(...params as SQLInputValue[]);
}

export function createSchema(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS merchants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_merchant_id INTEGER,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      address TEXT NOT NULL,
      location TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      rating REAL NOT NULL DEFAULT 4.5,
      status TEXT NOT NULL DEFAULT 'open',
      eta TEXT NOT NULL DEFAULT '25-35 นาที',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_merchant_id) REFERENCES merchants(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK(role IN ('admin', 'merchant', 'user')),
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      delivery_address TEXT,
      latitude REAL,
      longitude REAL,
      merchant_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id)
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      category TEXT NOT NULL,
      available INTEGER NOT NULL DEFAULT 1,
      deleted INTEGER NOT NULL DEFAULT 0,
      image_url_1 TEXT,
      image_url_2 TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER NOT NULL,
      user_id INTEGER,
      customer_name TEXT NOT NULL,
      delivery_address TEXT,
      delivery_latitude REAL,
      delivery_longitude REAL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('เงินสด', 'QR PromptPay', 'Card')),
      subtotal REAL NOT NULL,
      delivery_fee REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'paid',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      menu_item_id INTEGER NOT NULL,
      menu_name TEXT NOT NULL,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      line_total REAL NOT NULL,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payment_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      provider TEXT NOT NULL DEFAULT 'octopus',
      order_id TEXT NOT NULL UNIQUE,
      reference TEXT,
      redirect_url TEXT,
      status TEXT NOT NULL DEFAULT 'REQUESTED',
      res_code TEXT,
      res_desc TEXT,
      request_payload TEXT,
      response_payload TEXT,
      notify_payload TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    );
  `);

  addColumnIfMissing("merchants", "parent_merchant_id", "INTEGER");
  addColumnIfMissing("merchants", "latitude", "REAL");
  addColumnIfMissing("merchants", "longitude", "REAL");
  addColumnIfMissing("users", "latitude", "REAL");
  addColumnIfMissing("users", "longitude", "REAL");
  addColumnIfMissing("menu_items", "image_url_1", "TEXT");
  addColumnIfMissing("menu_items", "image_url_2", "TEXT");
  addColumnIfMissing("menu_items", "deleted", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing("transactions", "delivery_latitude", "REAL");
  addColumnIfMissing("transactions", "delivery_longitude", "REAL");
  addColumnIfMissing("payment_attempts", "notify_payload", "TEXT");
}

function addColumnIfMissing(table: string, column: string, definition: string): void {
  const columns = allRows(`PRAGMA table_info(${table})`).map((row) => row.name);
  if (!columns.includes(column)) {
    getDb().exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function seedDatabase(): void {
  const existing = getRow("SELECT COUNT(*) count FROM users");
  if (Number(existing?.count ?? 0) > 0) return;

  const merchants = [
    ["ครัวสมใจ", "อาหารอีสาน", "88/12 ถนนสุขุมวิท แขวงคลองตัน เขตวัฒนา กรุงเทพฯ 10110", "อโศก", 13.7371, 100.5604, 4.8, "open", "20-30 นาที"],
    ["แซ่บสเตชั่น", "ส้มตำและปิ้งย่าง", "12/7 ถนนลาดพร้าว แขวงจอมพล เขตจตุจักร กรุงเทพฯ 10900", "ลาดพร้าว", 13.8163, 100.5617, 4.7, "open", "25-35 นาที"],
    ["นัวโบวล์", "ข้าวหน้าเนื้อ", "55 ซอยทองหล่อ 10 เขตวัฒนา กรุงเทพฯ 10110", "ทองหล่อ", 13.7307, 100.5827, 4.6, "busy", "35-45 นาที"]
  ];
  for (const merchant of merchants) {
    run(
      "INSERT INTO merchants (name, category, address, location, latitude, longitude, rating, status, eta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ...merchant
    );
  }

  const merchantIds = new Map(allRows("SELECT id, name FROM merchants").map((row) => [String(row.name), Number(row.id)]));
  const users = [
    ["admin", "admin@zaabnua.test", "admin", "ณรา", "แอดมิน", "อาคาร ZaabNua ชั้น 8 กรุงเทพฯ", 13.7563, 100.5018, null],
    ["merchant", "merchant@zaabnua.test", "merchant", "สมใจ", "สุขครัว", "88/12 ถนนสุขุมวิท กรุงเทพฯ", 13.7371, 100.5604, merchantIds.get("ครัวสมใจ")],
    ["user", "user@zaabnua.test", "user", "มะลิ", "ใจดี", "24/6 ซอยอารีย์ 2 แขวงพญาไท กรุงเทพฯ", 13.7797, 100.5448, null]
  ];
  for (const [username, email, role, firstName, lastName, address, latitude, longitude, merchantId] of users) {
    const { salt, hash } = hashPassword(config.seedPassword);
    run(
      "INSERT INTO users (username, password_hash, password_salt, email, role, first_name, last_name, delivery_address, latitude, longitude, merchant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      username, hash, salt, email, role, firstName, lastName, address, latitude, longitude, merchantId
    );
  }

  const menus = [
    [merchantIds.get("ครัวสมใจ"), "ส้มตำไทยไข่เค็ม", "ครบรส เปรี้ยวหวาน เผ็ดกำลังดี", 95, "ยอดนิยม"],
    [merchantIds.get("ครัวสมใจ"), "ลาบหมูคั่ว", "ข้าวคั่วหอม สมุนไพรแน่น", 120, "เมนูแซ่บ"],
    [merchantIds.get("ครัวสมใจ"), "ไก่ย่างสมุนไพร", "หมักข้ามคืน เสิร์ฟพร้อมแจ่ว", 145, "ปิ้งย่าง"],
    [merchantIds.get("แซ่บสเตชั่น"), "คอหมูย่างจิ้มแจ่ว", "นุ่มฉ่ำ มันกำลังดี", 135, "ปิ้งย่าง"],
    [merchantIds.get("แซ่บสเตชั่น"), "ตำปูปลาร้า", "ปลาร้านัว กลิ่นสะอาด", 85, "เมนูแซ่บ"],
    [merchantIds.get("นัวโบวล์"), "ข้าวหน้าเนื้อไข่ออนเซ็น", "ซอสหอม เนื้อสไลซ์นุ่ม", 169, "ข้าวจานเดียว"]
  ];
  for (const menu of menus) {
    run("INSERT INTO menu_items (merchant_id, name, description, price, category) VALUES (?, ?, ?, ?, ?)", ...menu);
  }

  seedOrders(merchantIds);
}

function seedOrders(merchantIds: Map<string, number>): void {
  const user = getRow("SELECT id FROM users WHERE username = 'user'");
  const itemLookup = new Map(allRows("SELECT * FROM menu_items").map((row) => [String(row.name), row]));
  const seedOrdersData = [
    [merchantIds.get("ครัวสมใจ"), Number(user?.id), "มะลิ ใจดี", "24/6 ซอยอารีย์ 2 แขวงพญาไท กรุงเทพฯ", "QR PromptPay", [["ส้มตำไทยไข่เค็ม", 1], ["ลาบหมูคั่ว", 2]]],
    [merchantIds.get("แซ่บสเตชั่น"), null, "ธันวา", "อาคาร A ลาดพร้าว กรุงเทพฯ", "Card", [["ตำปูปลาร้า", 1], ["คอหมูย่างจิ้มแจ่ว", 1]]],
    [merchantIds.get("นัวโบวล์"), null, "กฤต", "ทองหล่อ กรุงเทพฯ", "เงินสด", [["ข้าวหน้าเนื้อไข่ออนเซ็น", 1]]]
  ] as const;

  for (const [merchantId, userId, customer, address, paymentMethod, items] of seedOrdersData) {
    const subtotal = items.reduce((total, [name, quantity]) => total + Number(itemLookup.get(name)?.price ?? 0) * quantity, 0);
    const tx = run(
      "INSERT INTO transactions (merchant_id, user_id, customer_name, delivery_address, delivery_latitude, delivery_longitude, payment_method, subtotal, delivery_fee, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid')",
      merchantId, userId, customer, address, 13.7563, 100.5018, paymentMethod, subtotal, 20, subtotal + 20
    );
    const transactionId = Number(tx.lastInsertRowid);
    for (const [name, quantity] of items) {
      const item = itemLookup.get(name);
      if (!item) continue;
      run(
        "INSERT INTO transaction_items (transaction_id, menu_item_id, menu_name, unit_price, quantity, line_total) VALUES (?, ?, ?, ?, ?, ?)",
        transactionId, item.id, name, item.price, quantity, Number(item.price) * quantity
      );
    }
  }
}

export function initDb(): void {
  createSchema();
  seedDatabase();
}
