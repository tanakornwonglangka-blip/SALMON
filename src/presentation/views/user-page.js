import { calculateCartTotal, formatCurrency } from "../../domain/entities.js";
import { appState } from "../state.js";

export function userPage(restaurants) {
  const selectedMerchant = restaurants.find((merchant) => String(merchant.id) === String(appState.selectedMerchantId)) || restaurants[0];
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
          <article class="restaurant-card ${String(merchant.id) === String(selectedMerchant?.id) ? "selected" : ""}" data-action="select-merchant" data-merchant-id="${merchant.id}">
            <span class="restaurant-status">${merchant.status === "open" ? "เปิด" : "คิวแน่น"}</span>
            <strong>${merchant.name}</strong>
            <small>${merchant.category} · ${merchant.location}</small>
            <span>${merchant.rating} ★ · ${merchant.eta}</span>
            <button class="detail-link" type="button" data-action="view-merchant" data-merchant-id="${merchant.id}">รายละเอียด</button>
          </article>
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
            <article class="menu-card" data-action="view-menu" data-item-id="${item.id}">
              ${item.imageUrl1
                ? `<img class="food-thumb image" src="${item.imageUrl1}" alt="${item.name}" />`
                : `<div class="food-thumb">${item.name.slice(0, 1)}</div>`}
              <div class="menu-card-body">
                <strong>${item.name}</strong>
                <span>${formatCurrency(item.price)}</span>
              </div>
              <div class="menu-card-footer">
                <small class="card-hint">กดเพื่อดูรายละเอียด</small>
                <button class="icon-button cart-add-button" title="เพิ่มลงตะกร้า" data-action="add-cart" data-item-id="${item.id}" aria-label="เพิ่ม ${item.name} ลงตะกร้า">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6.4 6.5h14.1l-1.6 8.1a2 2 0 0 1-2 1.6H9.2a2 2 0 0 1-2-1.6L5.6 3.8H3.5" />
                    <path d="M9.6 20.2h.1" />
                    <path d="M17 20.2h.1" />
                  </svg>
                </button>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    </section>
  `;
}

export function cartDrawer() {
  const cartCount = appState.cart.reduce((total, item) => total + item.quantity, 0);
  const paymentOptions = [
    {
      value: "เงินสด",
      label: "เงินสด",
      icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6.5 9h1.2M16.3 15h1.2" /></svg>`
    },
    {
      value: "QR PromptPay",
      label: "QR PromptPay",
      icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5z" /><path d="M14 14h2.5v2.5H14zM18.5 14H20v4h-3.5V20H14v-1.5M18.5 20H20" /></svg>`
    },
    {
      value: "Card",
      label: "Card",
      icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></svg>`
    }
  ];

  return `
    <aside class="cart-panel cart-drawer" aria-label="Cart">
      <div class="section-title inline">
        <div>
          <p class="eyebrow">ตะกร้าสินค้า</p>
          <h2>ตะกร้าสินค้า</h2>
        </div>
        <div class="cart-drawer-actions">
          <span class="pill">${cartCount} รายการ</span>
          <button class="icon-button subtle" type="button" data-action="close-cart" aria-label="ปิดตะกร้าสินค้า">×</button>
        </div>
      </div>
      <div class="cart-lines">
        ${appState.cart.length ? appState.cart.map((item) => `
          <div class="cart-line">
            ${item.imageUrl1
              ? `<img class="cart-item-thumb" src="${item.imageUrl1}" alt="${item.name}" />`
              : `<div class="cart-item-thumb fallback">${item.name.slice(0, 1)}</div>`}
            <div class="cart-item-info">
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
      <fieldset class="payment-options">
        <legend>เลือกประเภทการจ่าย</legend>
        ${paymentOptions.map((option, index) => `
          <label>
            <input type="radio" name="paymentMethod" value="${option.value}" ${index === 0 ? "checked" : ""} />
            <span>${option.label}</span>
            <span class="payment-icon">${option.icon}</span>
          </label>
        `).join("")}
      </fieldset>
      <button class="primary-button full" data-action="checkout">ชำระเงิน</button>
    </aside>
  `;
}
