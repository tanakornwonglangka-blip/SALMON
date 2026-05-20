import { formatCurrency } from "../../domain/entities.js";

export function menuItemForm(merchants, defaultMerchantId = "") {
  return `
    <form class="data-panel form-panel menu-item-form" data-form="menu-item">
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
      <div class="form-row">
        <label>รูปอาหาร 1 <input name="image1" type="file" accept="image/*" /></label>
        <label>รูปอาหาร 2 <input name="image2" type="file" accept="image/*" /></label>
      </div>
      <input type="hidden" name="available" value="true" />
      <div class="modal-actions">
        <button class="ghost-button" type="button" data-action="close-menu-form">ปิด</button>
        <button class="primary-button" type="submit" ${defaultMerchantId ? "" : "disabled"}>บันทึกเมนู</button>
      </div>
    </form>
  `;
}

export function merchantManagementPage({ merchants, menuItems }, user) {
  const defaultMerchant = merchants[0];
  const defaultMerchantId = defaultMerchant?.id ?? "";
  return `
    <section class="page-heading">
      <div>
        <p class="eyebrow">จัดการร้านค้า</p>
        <h1>จัดการข้อมูลร้านและรายการอาหาร</h1>
        <p>เพิ่มรายการอาหารและราคาลงฐานข้อมูลจริง เพื่อให้หน้าสั่งอาหารดึงไปใช้ทันที</p>
      </div>
    </section>

    <section class="management-grid">
      <div class="stacked-panels">
        ${defaultMerchant ? `
          <form class="data-panel form-panel" data-form="merchant-profile">
            <div class="section-title">
              <p class="eyebrow">ข้อมูลร้าน</p>
              <h2>${user.role === "merchant" ? "แก้ไขร้านของฉัน" : "แก้ไขร้านค้า"}</h2>
            </div>
            <input type="hidden" name="id" value="${defaultMerchant.id}" />
            <label>ชื่อร้าน <input name="name" value="${defaultMerchant.name}" required /></label>
            <div class="form-row">
              <label>ประเภทร้าน <input name="category" value="${defaultMerchant.category}" required /></label>
              <label>ย่าน <input name="location" value="${defaultMerchant.location}" required /></label>
            </div>
            <label>ที่อยู่ร้าน <textarea name="address" required>${defaultMerchant.address}</textarea></label>
            <div class="form-row">
              <label>สถานะ
                <select name="status">
                  <option value="open" ${defaultMerchant.status === "open" ? "selected" : ""}>เปิด</option>
                  <option value="busy" ${defaultMerchant.status === "busy" ? "selected" : ""}>คิวแน่น</option>
                  <option value="closed" ${defaultMerchant.status === "closed" ? "selected" : ""}>ปิดร้าน</option>
                </select>
              </label>
              <label>เวลาจัดส่ง <input name="eta" value="${defaultMerchant.eta}" required /></label>
            </div>
            <button class="primary-button" type="submit">บันทึกข้อมูลร้าน</button>
          </form>
        ` : ""}
      </div>

      <article class="data-panel">
        <div class="section-title inline">
          <div>
            <p class="eyebrow">คลังเมนู</p>
            <div class="heading-with-pill">
              <h2>รายการอาหารทั้งหมด</h2>
              <span class="pill">${menuItems.length} เมนู</span>
            </div>
          </div>
          <button class="icon-button add-menu-button" type="button" data-action="open-menu-form" aria-label="เพิ่มรายการอาหาร">+</button>
        </div>
        <div class="menu-management-list">
          ${menuItems.map((item) => {
            const merchant = merchants.find((current) => current.id === item.merchantId);
            return `
              <div class="managed-item">
                ${item.imageUrl1 ? `<img class="managed-thumb" src="${item.imageUrl1}" alt="${item.name}" />` : `<div class="managed-thumb fallback">${item.name.slice(0, 1)}</div>`}
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
