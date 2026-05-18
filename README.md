# ZaabNua

เว็บไซต์สั่งอาหารธีมสีส้ม แยกโครงสร้างแบบ clean architecture พร้อม backend API และ SQLite database

## Demo Accounts

- Admin: `admin` / `password`
- Merchant: `merchant` / `password`
- User: `user` / `password`

## Run

```bash
npm run dev
```

เปิด `http://127.0.0.1:5173`

ระบบจะสร้างฐานข้อมูล `data/zaabnua.db` และ seed ข้อมูลตั้งต้นจาก `server.py` อัตโนมัติเมื่อรันครั้งแรก

## Structure

- `src/domain`: entity และ business model
- `src/application`: use cases ที่ presentation เรียกใช้
- `src/infrastructure`: API client, auth repository, payment gateway adapter
- `src/presentation`: UI components, pages, router, app state
- `server.py`: static server + REST API + SQLite schema/seed
- `.env`: config สำหรับ DB path, app secret, password hashing iteration

รหัสผ่านใน DB ถูกเก็บเป็น salted PBKDF2 hash ไม่เก็บ plaintext
