from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse
import base64
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time


ROOT = Path(__file__).parent.resolve()


def load_env():
    env_path = ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if not line or line.strip().startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


load_env()
DB_PATH = ROOT / os.environ.get("DB_PATH", "data/zaabnua.db")
APP_SECRET = os.environ.get("APP_SECRET", "local-dev-secret")
PBKDF2_ITERATIONS = int(os.environ.get("PBKDF2_ITERATIONS", "120000"))


def connect_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def hash_password(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    peppered = f"{APP_SECRET}:{password}".encode("utf-8")
    digest = hashlib.pbkdf2_hmac("sha256", peppered, salt, PBKDF2_ITERATIONS)
    return base64.b64encode(salt).decode(), base64.b64encode(digest).decode()


def verify_password(password, salt_text, hash_text):
    salt = base64.b64decode(salt_text.encode())
    _, candidate = hash_password(password, salt)
    return hmac.compare_digest(candidate, hash_text)


def create_schema(conn):
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS merchants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          address TEXT NOT NULL,
          location TEXT NOT NULL,
          rating REAL NOT NULL DEFAULT 4.5,
          status TEXT NOT NULL DEFAULT 'open',
          eta TEXT NOT NULL DEFAULT '25-35 นาที',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          merchant_id INTEGER NOT NULL,
          user_id INTEGER,
          customer_name TEXT NOT NULL,
          delivery_address TEXT,
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
        """
    )
    conn.commit()


def seed_database(conn):
    if conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]:
        return

    seed_password = os.environ.get("SEED_PASSWORD", "password")
    merchants = [
        ("ครัวสมใจ", "อาหารอีสาน", "88/12 ถนนสุขุมวิท แขวงคลองตัน เขตวัฒนา กรุงเทพฯ 10110", "อโศก", 4.8, "open", "20-30 นาที"),
        ("แซ่บสเตชั่น", "ส้มตำและปิ้งย่าง", "12/7 ถนนลาดพร้าว แขวงจอมพล เขตจตุจักร กรุงเทพฯ 10900", "ลาดพร้าว", 4.7, "open", "25-35 นาที"),
        ("นัวโบวล์", "ข้าวหน้าเนื้อ", "55 ซอยทองหล่อ 10 เขตวัฒนา กรุงเทพฯ 10110", "ทองหล่อ", 4.6, "busy", "35-45 นาที"),
    ]
    conn.executemany(
        "INSERT INTO merchants (name, category, address, location, rating, status, eta) VALUES (?, ?, ?, ?, ?, ?, ?)",
        merchants,
    )

    merchant_ids = {row["name"]: row["id"] for row in conn.execute("SELECT id, name FROM merchants")}

    users = [
        ("admin", "admin@zaabnua.test", "admin", "ณรา", "แอดมิน", "อาคาร ZaabNua ชั้น 8 กรุงเทพฯ", None),
        ("merchant", "merchant@zaabnua.test", "merchant", "สมใจ", "สุขครัว", "88/12 ถนนสุขุมวิท กรุงเทพฯ", merchant_ids["ครัวสมใจ"]),
        ("user", "user@zaabnua.test", "user", "มะลิ", "ใจดี", "24/6 ซอยอารีย์ 2 แขวงพญาไท กรุงเทพฯ", None),
    ]
    for username, email, role, first_name, last_name, address, merchant_id in users:
        salt, hashed = hash_password(seed_password)
        conn.execute(
            """
            INSERT INTO users (username, password_hash, password_salt, email, role, first_name, last_name, delivery_address, merchant_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (username, hashed, salt, email, role, first_name, last_name, address, merchant_id),
        )

    menus = [
        (merchant_ids["ครัวสมใจ"], "ส้มตำไทยไข่เค็ม", "ครบรส เปรี้ยวหวาน เผ็ดกำลังดี", 95, "ยอดนิยม"),
        (merchant_ids["ครัวสมใจ"], "ลาบหมูคั่ว", "ข้าวคั่วหอม สมุนไพรแน่น", 120, "เมนูแซ่บ"),
        (merchant_ids["ครัวสมใจ"], "ไก่ย่างสมุนไพร", "หมักข้ามคืน เสิร์ฟพร้อมแจ่ว", 145, "ปิ้งย่าง"),
        (merchant_ids["แซ่บสเตชั่น"], "คอหมูย่างจิ้มแจ่ว", "นุ่มฉ่ำ มันกำลังดี", 135, "ปิ้งย่าง"),
        (merchant_ids["แซ่บสเตชั่น"], "ตำปูปลาร้า", "ปลาร้านัว กลิ่นสะอาด", 85, "เมนูแซ่บ"),
        (merchant_ids["นัวโบวล์"], "ข้าวหน้าเนื้อไข่ออนเซ็น", "ซอสหอม เนื้อสไลซ์นุ่ม", 169, "ข้าวจานเดียว"),
    ]
    conn.executemany(
        "INSERT INTO menu_items (merchant_id, name, description, price, category) VALUES (?, ?, ?, ?, ?)",
        menus,
    )

    user_id = conn.execute("SELECT id FROM users WHERE username = 'user'").fetchone()["id"]
    item_lookup = {row["name"]: row for row in conn.execute("SELECT * FROM menu_items")}
    seed_orders = [
        (merchant_ids["ครัวสมใจ"], user_id, "มะลิ ใจดี", "24/6 ซอยอารีย์ 2 แขวงพญาไท กรุงเทพฯ", "QR PromptPay", [("ส้มตำไทยไข่เค็ม", 1), ("ลาบหมูคั่ว", 2)]),
        (merchant_ids["แซ่บสเตชั่น"], None, "ธันวา", "อาคาร A ลาดพร้าว กรุงเทพฯ", "Card", [("ตำปูปลาร้า", 1), ("คอหมูย่างจิ้มแจ่ว", 1)]),
        (merchant_ids["นัวโบวล์"], None, "กฤต", "ทองหล่อ กรุงเทพฯ", "เงินสด", [("ข้าวหน้าเนื้อไข่ออนเซ็น", 1)]),
    ]
    for merchant_id, order_user_id, customer, address, payment_method, items in seed_orders:
        subtotal = sum(item_lookup[name]["price"] * quantity for name, quantity in items)
        tx = conn.execute(
            """
            INSERT INTO transactions (merchant_id, user_id, customer_name, delivery_address, payment_method, subtotal, delivery_fee, total_amount, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid')
            """,
            (merchant_id, order_user_id, customer, address, payment_method, subtotal, 20, subtotal + 20),
        )
        transaction_id = tx.lastrowid
        for name, quantity in items:
            item = item_lookup[name]
            conn.execute(
                """
                INSERT INTO transaction_items (transaction_id, menu_item_id, menu_name, unit_price, quantity, line_total)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (transaction_id, item["id"], name, item["price"], quantity, item["price"] * quantity),
            )
    conn.commit()


def init_db():
    with connect_db() as conn:
        create_schema(conn)
        seed_database(conn)


def row_to_user(row):
    if not row:
        return None
    return {
        "id": row["id"],
        "username": row["username"],
        "email": row["email"],
        "role": row["role"],
        "firstName": row["first_name"],
        "lastName": row["last_name"],
        "name": f"{row['first_name']} {row['last_name']}",
        "deliveryAddress": row["delivery_address"],
        "merchantId": row["merchant_id"],
    }


def current_user(conn, headers):
    auth = headers.get("Authorization", "")
    token = auth.replace("Bearer ", "", 1).strip()
    if not token:
        return None
    row = conn.execute(
        """
        SELECT u.* FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ?
        """,
        (token,),
    ).fetchone()
    return row_to_user(row)


def merchant_row(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "category": row["category"],
        "address": row["address"],
        "location": row["location"],
        "rating": row["rating"],
        "status": row["status"],
        "eta": row["eta"],
    }


def menu_row(row):
    return {
        "id": row["id"],
        "merchantId": row["merchant_id"],
        "name": row["name"],
        "description": row["description"],
        "price": row["price"],
        "category": row["category"],
        "available": bool(row["available"]),
    }


def transaction_row(conn, row):
    items = [
        {
            "menuItemId": item["menu_item_id"],
            "menuName": item["menu_name"],
            "unitPrice": item["unit_price"],
            "quantity": item["quantity"],
            "lineTotal": item["line_total"],
        }
        for item in conn.execute("SELECT * FROM transaction_items WHERE transaction_id = ?", (row["id"],))
    ]
    return {
        "id": row["id"],
        "merchantId": row["merchant_id"],
        "merchantName": row["merchant_name"],
        "customer": row["customer_name"],
        "deliveryAddress": row["delivery_address"],
        "paymentMethod": row["payment_method"],
        "subtotal": row["subtotal"],
        "deliveryFee": row["delivery_fee"],
        "totalAmount": row["total_amount"],
        "status": row["status"],
        "createdAt": row["created_at"],
        "items": items,
    }


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def require_user(self, conn):
        user = current_user(conn, self.headers)
        if not user:
            self.send_json({"error": "กรุณาเข้าสู่ระบบ"}, 401)
            return None
        return user

    def do_GET(self):
        parsed = urlparse(self.path)
        if not parsed.path.startswith("/api/"):
            return super().do_GET()
        try:
            with connect_db() as conn:
                self.handle_api_get(conn, parsed)
        except Exception as error:
            self.send_json({"error": str(error)}, 500)

    def do_POST(self):
        parsed = urlparse(self.path)
        if not parsed.path.startswith("/api/"):
            return self.send_json({"error": "ไม่พบ API"}, 404)
        try:
            with connect_db() as conn:
                self.handle_api_post(conn, parsed, self.read_json())
        except sqlite3.IntegrityError as error:
            self.send_json({"error": f"ข้อมูลซ้ำหรือไม่ถูกต้อง: {error}"}, 400)
        except Exception as error:
            self.send_json({"error": str(error)}, 500)

    def handle_api_get(self, conn, parsed):
        if parsed.path == "/api/me":
            return self.send_json({"user": current_user(conn, self.headers)})

        if parsed.path == "/api/restaurants":
            query = parse_qs(parsed.query).get("search", [""])[0].strip()
            like = f"%{query}%"
            if query:
                merchants = conn.execute(
                    """
                    SELECT DISTINCT m.* FROM merchants m
                    LEFT JOIN menu_items mi ON mi.merchant_id = m.id
                    WHERE m.name LIKE ? OR m.category LIKE ? OR m.location LIKE ? OR m.address LIKE ? OR mi.name LIKE ?
                    ORDER BY m.rating DESC
                    """,
                    (like, like, like, like, like),
                ).fetchall()
            else:
                merchants = conn.execute("SELECT * FROM merchants ORDER BY rating DESC").fetchall()
            payload = []
            for merchant in merchants:
                items = conn.execute(
                    "SELECT * FROM menu_items WHERE merchant_id = ? AND available = 1 ORDER BY id",
                    (merchant["id"],),
                ).fetchall()
                payload.append({**merchant_row(merchant), "menuItems": [menu_row(item) for item in items]})
            return self.send_json({"restaurants": payload})

        user = self.require_user(conn)
        if not user:
            return

        if parsed.path == "/api/portal":
            if user["role"] == "admin":
                merchants = conn.execute("SELECT * FROM merchants ORDER BY id").fetchall()
                transactions = conn.execute(
                    """
                    SELECT t.*, m.name merchant_name FROM transactions t
                    JOIN merchants m ON m.id = t.merchant_id
                    ORDER BY t.id DESC
                    """
                ).fetchall()
            else:
                merchants = conn.execute("SELECT * FROM merchants WHERE id = ?", (user["merchantId"],)).fetchall()
                transactions = conn.execute(
                    """
                    SELECT t.*, m.name merchant_name FROM transactions t
                    JOIN merchants m ON m.id = t.merchant_id
                    WHERE t.merchant_id = ?
                    ORDER BY t.id DESC
                    """,
                    (user["merchantId"],),
                ).fetchall()
            return self.send_json({
                "merchants": [merchant_row(row) for row in merchants],
                "transactions": [transaction_row(conn, row) for row in transactions],
            })

        if parsed.path == "/api/merchant-management":
            if user["role"] == "admin":
                merchants = conn.execute("SELECT * FROM merchants ORDER BY id").fetchall()
                items = conn.execute("SELECT * FROM menu_items ORDER BY id DESC").fetchall()
            else:
                merchants = conn.execute("SELECT * FROM merchants WHERE id = ?", (user["merchantId"],)).fetchall()
                items = conn.execute("SELECT * FROM menu_items WHERE merchant_id = ? ORDER BY id DESC", (user["merchantId"],)).fetchall()
            return self.send_json({
                "merchants": [merchant_row(row) for row in merchants],
                "menuItems": [menu_row(row) for row in items],
            })

        if parsed.path == "/api/users":
            if user["role"] == "admin":
                rows = conn.execute(
                    """
                    SELECT u.*, m.name merchant_name FROM users u
                    LEFT JOIN merchants m ON m.id = u.merchant_id
                    ORDER BY u.id DESC
                    """
                ).fetchall()
            else:
                rows = conn.execute(
                    """
                    SELECT u.*, m.name merchant_name FROM users u
                    LEFT JOIN merchants m ON m.id = u.merchant_id
                    WHERE u.id = ?
                    """,
                    (user["id"],),
                ).fetchall()
            return self.send_json({
                "users": [{**row_to_user(row), "merchantName": row["merchant_name"]} for row in rows]
            })

        self.send_json({"error": "ไม่พบ API"}, 404)

    def handle_api_post(self, conn, parsed, data):
        if parsed.path == "/api/auth/login":
            row = conn.execute("SELECT * FROM users WHERE username = ?", (data.get("username"),)).fetchone()
            if not row or not verify_password(data.get("password", ""), row["password_salt"], row["password_hash"]):
                return self.send_json({"error": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"}, 401)
            token = secrets.token_urlsafe(32)
            conn.execute("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)", (token, row["id"], int(time.time())))
            conn.commit()
            return self.send_json({"token": token, "user": row_to_user(row)})

        if parsed.path == "/api/auth/register":
            role = data.get("role")
            if role not in ("merchant", "user"):
                return self.send_json({"error": "สมัครสมาชิกได้เฉพาะร้านค้าและผู้สั่งอาหาร"}, 400)
            required = ["email", "username", "password"]
            if any(not data.get(field) for field in required):
                return self.send_json({"error": "กรุณากรอก email, username และ password"}, 400)
            merchant_id = None
            if role == "merchant":
                merchant = conn.execute(
                    """
                    INSERT INTO merchants (name, category, address, location)
                    VALUES (?, ?, ?, ?)
                    """,
                    (
                        data.get("shopName") or f"ร้านของ {data.get('username')}",
                        data.get("category") or "ร้านอาหาร",
                        data.get("shopAddress") or data.get("deliveryAddress") or "ยังไม่ได้ระบุ",
                        data.get("location") or "กรุงเทพฯ",
                    ),
                )
                merchant_id = merchant.lastrowid
            salt, hashed = hash_password(data["password"])
            user_row = conn.execute(
                """
                INSERT INTO users (username, password_hash, password_salt, email, role, first_name, last_name, delivery_address, merchant_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    data["username"],
                    hashed,
                    salt,
                    data["email"],
                    role,
                    data.get("firstName") or data["username"],
                    data.get("lastName") or "-",
                    data.get("deliveryAddress") or data.get("shopAddress") or "",
                    merchant_id,
                ),
            )
            conn.commit()
            user = row_to_user(conn.execute("SELECT * FROM users WHERE id = ?", (user_row.lastrowid,)).fetchone())
            return self.send_json({"user": user}, 201)

        user = self.require_user(conn)
        if not user:
            return

        if parsed.path == "/api/auth/logout":
            token = self.headers.get("Authorization", "").replace("Bearer ", "", 1).strip()
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
            conn.commit()
            return self.send_json({"ok": True})

        if parsed.path == "/api/menu-items":
            if user["role"] not in ("admin", "merchant"):
                return self.send_json({"error": "ไม่มีสิทธิ์จัดการเมนู"}, 403)
            merchant_id = int(data.get("merchantId"))
            if user["role"] == "merchant" and merchant_id != user["merchantId"]:
                return self.send_json({"error": "จัดการได้เฉพาะร้านของตัวเอง"}, 403)
            cursor = conn.execute(
                """
                INSERT INTO menu_items (merchant_id, name, description, price, category, available)
                VALUES (?, ?, ?, ?, ?, 1)
                """,
                (merchant_id, data.get("name"), data.get("description"), float(data.get("price")), data.get("category") or "เมนูใหม่"),
            )
            conn.commit()
            item = conn.execute("SELECT * FROM menu_items WHERE id = ?", (cursor.lastrowid,)).fetchone()
            return self.send_json({"menuItem": menu_row(item)}, 201)

        if parsed.path == "/api/checkout":
            items = data.get("items", [])
            if not items:
                return self.send_json({"error": "ตะกร้าสินค้ายังว่างอยู่"}, 400)
            payment_method = data.get("paymentMethod")
            if payment_method not in ("เงินสด", "QR PromptPay", "Card"):
                return self.send_json({"error": "ประเภทการจ่ายเงินไม่ถูกต้อง"}, 400)
            ids = [int(item["id"]) for item in items]
            placeholders = ",".join("?" for _ in ids)
            rows = conn.execute(f"SELECT * FROM menu_items WHERE id IN ({placeholders})", ids).fetchall()
            lookup = {row["id"]: row for row in rows}
            first = lookup[ids[0]]
            merchant_id = first["merchant_id"]
            subtotal = 0
            order_lines = []
            for cart_item in items:
                menu = lookup[int(cart_item["id"])]
                if menu["merchant_id"] != merchant_id:
                    return self.send_json({"error": "หนึ่งคำสั่งซื้อรองรับร้านเดียวก่อน"}, 400)
                quantity = int(cart_item["quantity"])
                line_total = menu["price"] * quantity
                subtotal += line_total
                order_lines.append((menu, quantity, line_total))
            delivery_fee = 20
            tx = conn.execute(
                """
                INSERT INTO transactions (merchant_id, user_id, customer_name, delivery_address, payment_method, subtotal, delivery_fee, total_amount, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid')
                """,
                (
                    merchant_id,
                    user["id"],
                    user["name"],
                    user["deliveryAddress"],
                    payment_method,
                    subtotal,
                    delivery_fee,
                    subtotal + delivery_fee,
                ),
            )
            transaction_id = tx.lastrowid
            for menu, quantity, line_total in order_lines:
                conn.execute(
                    """
                    INSERT INTO transaction_items (transaction_id, menu_item_id, menu_name, unit_price, quantity, line_total)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (transaction_id, menu["id"], menu["name"], menu["price"], quantity, line_total),
                )
            conn.commit()
            row = conn.execute(
                """
                SELECT t.*, m.name merchant_name FROM transactions t
                JOIN merchants m ON m.id = t.merchant_id
                WHERE t.id = ?
                """,
                (transaction_id,),
            ).fetchone()
            return self.send_json({"transaction": transaction_row(conn, row)}, 201)

        self.send_json({"error": "ไม่พบ API"}, 404)


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer(("127.0.0.1", 5173), Handler)
    print(f"ZaabNua server running at http://127.0.0.1:5173 using {DB_PATH}")
    server.serve_forever()
