import { formatCurrency } from "../../domain/entities.js";
import { mapPicker } from "../components/layout.js";

const statusText = (status) => status === "open" ? "เปิด" : status === "busy" ? "คิวแน่น" : "ปิดร้าน";

export function menuItemForm(merchants, defaultMerchantId = "", item = null) {
  const selectedMerchantId = item?.merchantId ?? defaultMerchantId;
  return `
    <form class="data-panel form-panel menu-item-form" data-form="menu-item">
      <div class="section-title">
        <p class="eyebrow">${item ? "แก้ไขเมนู" : "เพิ่มเมนู"}</p>
        <h2>${item ? item.name : "เพิ่มรายการอาหาร"}</h2>
      </div>
      ${item ? `<input type="hidden" name="id" value="${item.id}" />` : ""}
      <input type="hidden" name="imageUrl1" value="${item?.imageUrl1 ?? ""}" />
      <input type="hidden" name="imageUrl2" value="${item?.imageUrl2 ?? ""}" />
      <label>ร้านค้า
        <select name="merchantId">
          ${merchants.map((merchant) => `<option value="${merchant.id}" ${String(selectedMerchantId) === String(merchant.id) ? "selected" : ""}>${merchant.name}</option>`).join("")}
        </select>
      </label>
      <label>ชื่อเมนู <input name="name" value="${item?.name ?? ""}" placeholder="เช่น ต้มแซ่บกระดูกอ่อน" required /></label>
      <label>คำอธิบาย <textarea name="description" placeholder="รายละเอียดรสชาติ วัตถุดิบ หรือจุดเด่น">${item?.description ?? ""}</textarea></label>
      <div class="form-row">
        <label>ราคา <input name="price" type="number" min="1" value="${item?.price ?? 99}" required /></label>
        <label>หมวดหมู่ <input name="category" value="${item?.category ?? "เมนูใหม่"}" /></label>
      </div>
      <div class="form-row">
        <label>รูปอาหาร 1 <input name="image1" type="file" accept="image/*" /></label>
        <label>รูปอาหาร 2 <input name="image2" type="file" accept="image/*" /></label>
      </div>
      <label class="check-row"><input type="checkbox" name="available" ${item?.available === false ? "" : "checked"} /> พร้อมขาย</label>
      <div class="modal-actions">
        <button class="ghost-button" type="button" data-action="close-menu-form">ปิด</button>
        <button class="primary-button" type="submit" ${selectedMerchantId ? "" : "disabled"}>${item ? "บันทึกเมนู" : "เพิ่มเมนู"}</button>
      </div>
    </form>
  `;
}

export function merchantProfileForm(merchant) {
  return `
    <form class="data-panel form-panel merchant-profile-form" data-form="merchant-profile">
      <div class="section-title">
        <p class="eyebrow">แก้ไขร้านค้า</p>
        <h2>${merchant.name}</h2>
      </div>
      <input type="hidden" name="id" value="${merchant.id}" />
      <label>ชื่อร้าน <input name="name" value="${merchant.name}" required /></label>
      <div class="form-row">
        <label>ประเภทร้าน <input name="category" value="${merchant.category}" required /></label>
        <label>ย่าน <input name="location" value="${merchant.location}" required /></label>
      </div>
      <label>ที่อยู่ร้าน <textarea name="address" required>${merchant.address}</textarea></label>
      ${mapPicker({ latitude: merchant.latitude ?? "", longitude: merchant.longitude ?? "", label: "ปักหมุดตำแหน่งร้าน" })}
      <div class="form-row">
        <label>สถานะ
          <select name="status">
            <option value="open" ${merchant.status === "open" ? "selected" : ""}>เปิด</option>
            <option value="busy" ${merchant.status === "busy" ? "selected" : ""}>คิวแน่น</option>
            <option value="closed" ${merchant.status === "closed" ? "selected" : ""}>ปิดร้าน</option>
          </select>
        </label>
        <label>เวลาจัดส่ง <input name="eta" value="${merchant.eta}" required /></label>
      </div>
      <div class="modal-actions">
        <button class="ghost-button" type="button" data-action="close-detail">ปิด</button>
        <button class="primary-button" type="submit">บันทึกร้านค้า</button>
      </div>
    </form>
  `;
}

export function subMerchantForm(merchants, defaultParentId = "") {
  return `
    <form class="data-panel form-panel merchant-profile-form" data-form="sub-merchant">
      <div class="section-title">
        <p class="eyebrow">ร้านค้าย่อย</p>
        <h2>เพิ่มร้านค้าย่อย</h2>
      </div>
      <label>ร้านหลัก
        <select name="parentMerchantId">
          ${merchants.filter((merchant) => !merchant.parentMerchantId).map((merchant) => `<option value="${merchant.id}" ${String(defaultParentId) === String(merchant.id) ? "selected" : ""}>${merchant.name}</option>`).join("")}
        </select>
      </label>
      <label>ชื่อร้านค้าย่อย <input name="name" placeholder="เช่น ครัวสมใจ สาขาอารีย์" required /></label>
      <div class="form-row">
        <label>ประเภทร้าน <input name="category" value="ร้านอาหาร" required /></label>
        <label>ย่าน <input name="location" value="กรุงเทพฯ" required /></label>
      </div>
      <label>ที่อยู่ร้าน <textarea name="address" required></textarea></label>
      ${mapPicker({ label: "ปักหมุดร้านค้าย่อย" })}
      <div class="form-row">
        <label>สถานะ
          <select name="status">
            <option value="open">เปิด</option>
            <option value="busy">คิวแน่น</option>
            <option value="closed">ปิดร้าน</option>
          </select>
        </label>
        <label>เวลาจัดส่ง <input name="eta" value="25-35 นาที" required /></label>
      </div>
      <div class="modal-actions">
        <button class="ghost-button" type="button" data-action="close-detail">ปิด</button>
        <button class="primary-button" type="submit">เพิ่มร้านค้าย่อย</button>
      </div>
    </form>
  `;
}

export function merchantManagementPage({ merchants, menuItems }, user) {
  const rootMerchants = merchants.filter((merchant) => !merchant.parentMerchantId);
  return `
    <section class="page-heading">
      <div>
        <p class="eyebrow">จัดการร้านค้า</p>
        <h1>จัดการข้อมูลร้านและรายการอาหาร</h1>
        <p>ดูข้อมูลร้านก่อน แก้ไขเมื่อจำเป็น และดูแลเมนูของทุกสาขาได้จากหน้าเดียว</p>
      </div>
    </section>

    <section class="management-grid">
      <div class="stacked-panels">
        <article class="data-panel">
          <div class="section-title inline">
            <div>
              <p class="eyebrow">ข้อมูลร้าน</p>
              <h2>${user.role === "merchant" ? "ร้านของฉัน" : "ร้านค้าทั้งหมด"}</h2>
            </div>
            <button class="ghost-button" type="button" data-action="open-sub-merchant-form">เพิ่มร้านค้าย่อย</button>
          </div>
          <div class="merchant-summary-list">
            ${merchants.map((merchant) => `
              <article class="merchant-summary-card">
                <div>
                  <strong>${merchant.name}</strong>
                  <small>${merchant.parentMerchantId ? "ร้านค้าย่อย" : "ร้านหลัก"} · ${merchant.category}</small>
                </div>
                <div class="detail-grid compact">
                  <span>ย่าน</span><strong>${merchant.location}</strong>
                  <span>สถานะ</span><strong>${statusText(merchant.status)}</strong>
                  <span>เวลาจัดส่ง</span><strong>${merchant.eta}</strong>
                  <span>พิกัด</span><strong>${merchant.latitude ?? "-"}, ${merchant.longitude ?? "-"}</strong>
                  <span>ที่อยู่</span><strong>${merchant.address}</strong>
                </div>
                <button class="primary-button" type="button" data-action="open-merchant-edit" data-merchant-id="${merchant.id}">แก้ไขร้านค้า</button>
              </article>
            `).join("")}
          </div>
        </article>
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
              <div class="managed-item" data-action="open-menu-edit" data-item-id="${item.id}">
                ${item.imageUrl1 ? `<img class="managed-thumb" src="${item.imageUrl1}" alt="${item.name}" />` : `<div class="managed-thumb fallback">${item.name.slice(0, 1)}</div>`}
                <div>
                  <strong>${item.name}</strong>
                  <small>${merchant?.name ?? "ไม่พบร้าน"} · ${item.category}</small>
                  <p>${item.description || "ไม่มีคำอธิบาย"}</p>
                </div>
                <div>
                  <strong>${formatCurrency(item.price)}</strong>
                  <span class="status ${item.available ? "paid" : "refunded"}">${item.available ? "พร้อมขาย" : "ปิดขาย"}</span>
                  <div class="menu-row-actions">
                    <button class="ghost-button" type="button" data-action="open-menu-edit" data-item-id="${item.id}">Edit</button>
                    <button class="ghost-button danger-button" type="button" data-action="delete-menu" data-item-id="${item.id}">ลบ</button>
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </article>
    </section>
  `;
}
