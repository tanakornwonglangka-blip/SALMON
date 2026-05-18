import { formatCurrency } from "../../domain/entities.js";

export function merchantManagementPage({ merchants, menuItems }) {
  const defaultMerchantId = merchants[0]?.id ?? "";
  return `
    <section class="page-heading">
      <div>
        <p class="eyebrow">จัดการร้านค้า</p>
        <h1>จัดการข้อมูลร้านและรายการอาหาร</h1>
        <p>เพิ่มรายการอาหารและราคาลงฐานข้อมูลจริง เพื่อให้หน้าสั่งอาหารดึงไปใช้ทันที</p>
      </div>
    </section>

    <section class="management-grid">
      <form class="data-panel form-panel" data-form="menu-item">
        <div class="section-title">
          <p class="eyebrow">เพิ่มเมนู</p>
          <h2>เพิ่มรายการอาหาร</h2>
        </div>
        <label>ร้านค้า
          <select name="merchantId">
            ${merchants.map((merchant) => `<option value="${merchant.id}">${merchant.name}</option>`).join("")}
          </select>
        </label>
        <label>ชื่อเมนู <input name="name" placeholder="เช่น ต้มแซ่บกระดูกอ่อน" required /></label>
        <label>คำอธิบาย <textarea name="description" placeholder="รายละเอียดรสชาติ วัตถุดิบ หรือจุดเด่น"></textarea></label>
        <div class="form-row">
          <label>ราคา <input name="price" type="number" min="1" value="99" required /></label>
          <label>หมวดหมู่ <input name="category" value="เมนูใหม่" /></label>
        </div>
        <input type="hidden" name="available" value="true" />
        <button class="primary-button" type="submit" ${defaultMerchantId ? "" : "disabled"}>บันทึกเมนู</button>
      </form>

      <article class="data-panel">
        <div class="section-title inline">
          <div>
            <p class="eyebrow">คลังเมนู</p>
            <h2>รายการอาหารทั้งหมด</h2>
          </div>
          <span class="pill">${menuItems.length} เมนู</span>
        </div>
        <div class="menu-management-list">
          ${menuItems.map((item) => {
            const merchant = merchants.find((current) => current.id === item.merchantId);
            return `
              <div class="managed-item">
                <div>
                  <strong>${item.name}</strong>
                  <small>${merchant?.name ?? "ไม่พบร้าน"} · ${item.category}</small>
                  <p>${item.description}</p>
                </div>
                <div>
                  <strong>${formatCurrency(item.price)}</strong>
                  <span class="status ${item.available ? "paid" : "refunded"}">${item.available ? "พร้อมขาย" : "ปิดขาย"}</span>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </article>
    </section>
  `;
}
