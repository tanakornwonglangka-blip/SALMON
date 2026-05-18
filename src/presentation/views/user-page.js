import { calculateCartTotal, formatCurrency } from "../../domain/entities.js";
import { appState } from "../state.js";

export function userPage(restaurants) {
  const selectedMerchant = restaurants.find((merchant) => merchant.id === appState.selectedMerchantId) || restaurants[0];
  if (selectedMerchant && appState.selectedMerchantId !== selectedMerchant.id) appState.selectedMerchantId = selectedMerchant.id;

  return `
    <section class="hero-section">
      <div class="hero-copy">
        <p class="eyebrow">บริการสั่งอาหาร ZaabNua</p>
        <h1>สั่งอาหารแซ่บจากร้านโปรดในไม่กี่คลิก</h1>
        <p>ค้นหาร้าน เลือกเมนู ใส่ตะกร้า และพร้อมต่อระบบชำระเงินจริงได้ทันที</p>
        <form class="hero-actions" data-form="search">
          <label class="search-box">
            <span>ค้นหาร้านอาหาร</span>
            <input name="search" data-input="restaurant-search" value="${appState.queryDraft}" placeholder="ค้นหาร้าน อาหาร เมนู หรือย่าน" />
          </label>
          <button class="primary-button" type="submit">ค้นหา</button>
        </form>
        ${appState.user ? "" : `
          <div class="hero-secondary-actions">
            <button class="ghost-button" data-action="open-login">เข้าสู่ระบบ</button>
            <button class="primary-button compact" data-action="open-register">สมัครสมาชิก</button>
          </div>
        `}
      </div>
      <img class="hero-image" src="./assets/food-hero.jpg" alt="ชุดอาหารไทย" />
    </section>

    <section class="ordering-grid">
      <aside class="restaurant-list" aria-label="Restaurants">
        <div class="section-title">
          <p class="eyebrow">ร้านอาหาร</p>
          <h2>ร้านอาหาร</h2>
        </div>
        ${restaurants.map((merchant) => `
          <button class="restaurant-card ${merchant.id === selectedMerchant?.id ? "selected" : ""}" data-action="select-merchant" data-merchant-id="${merchant.id}">
            <span class="restaurant-status">${merchant.status === "open" ? "เปิด" : "คิวแน่น"}</span>
            <strong>${merchant.name}</strong>
            <small>${merchant.category} · ${merchant.location}</small>
            <span>${merchant.rating} ★ · ${merchant.eta}</span>
          </button>
        `).join("")}
      </aside>

      <section class="menu-panel">
        <div class="section-title inline">
          <div>
            <p class="eyebrow">รายการอาหาร</p>
            <h2>${selectedMerchant?.name ?? "ไม่พบร้าน"}</h2>
          </div>
          <span class="pill">${selectedMerchant?.category ?? ""}</span>
        </div>
        <div class="menu-grid">
          ${(selectedMerchant?.menuItems ?? []).map((item) => `
            <article class="menu-card">
              <div class="food-thumb">${item.name.slice(0, 1)}</div>
              <div>
                <strong>${item.name}</strong>
                <p>${item.description}</p>
                <span>${formatCurrency(item.price)}</span>
              </div>
              <button class="icon-button" title="เพิ่มลงตะกร้า" data-action="add-cart" data-item-id="${item.id}">+</button>
            </article>
          `).join("")}
        </div>
      </section>

      <aside class="cart-panel" aria-label="Cart">
        <div class="section-title inline">
          <div>
            <p class="eyebrow">ตะกร้าสินค้า</p>
            <h2>ตะกร้าสินค้า</h2>
          </div>
          <span class="pill">${appState.cart.length} รายการ</span>
        </div>
        <div class="cart-lines">
          ${appState.cart.length ? appState.cart.map((item) => `
            <div class="cart-line">
              <div>
                <strong>${item.name}</strong>
                <small>${formatCurrency(item.price)} × ${item.quantity}</small>
              </div>
              <div class="stepper">
                <button data-action="cart-dec" data-item-id="${item.id}">−</button>
                <span>${item.quantity}</span>
                <button data-action="cart-inc" data-item-id="${item.id}">+</button>
              </div>
            </div>
          `).join("") : `<p class="empty-state">เลือกเมนูเพื่อเริ่มสั่งอาหาร</p>`}
        </div>
        <div class="cart-total">
          <span>รวม</span>
          <strong>${formatCurrency(calculateCartTotal(appState.cart))}</strong>
        </div>
        <select data-input="payment-method" aria-label="ประเภทการจ่ายเงิน">
          <option>เงินสด</option>
          <option>QR PromptPay</option>
          <option>Card</option>
        </select>
        <button class="primary-button full" data-action="checkout">ชำระเงิน</button>
      </aside>
    </section>
  `;
}
