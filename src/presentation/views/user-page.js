import { calculateCartTotal, formatCurrency } from "../../domain/entities.js";
import { appState } from "../state.js";

export function userPage(restaurants) {
  const selectedMerchant = restaurants.find((merchant) => String(merchant.id) === String(appState.selectedMerchantId)) || restaurants[0];
  if (selectedMerchant && appState.selectedMerchantId !== selectedMerchant.id) appState.selectedMerchantId = selectedMerchant.id;
  const menuItems = selectedMerchant?.menuItems ?? [];
  const totalMenus = restaurants.reduce((sum, merchant) => sum + merchant.menuItems.length, 0);

  return `
    <section class="hero-section ordering-hero">
      <div class="hero-copy">
        <p class="eyebrow">ZaabNua delivery</p>
        <h1>เลือกเมนูแซ่บจากร้านใกล้ตัวได้เร็วขึ้น</h1>
        <p>ค้นหาจากชื่อร้าน เมนู หรือย่าน แล้วเพิ่มอาหารลงตะกร้าได้จากการ์ดเมนูทันที</p>
        <form class="hero-actions search-dock" data-form="search">
          <label class="search-box">
            <span>ค้นหาร้านหรือเมนู</span>
            <input name="search" data-input="restaurant-search" value="${appState.queryDraft}" placeholder="เช่น ลาบ, ส้มตำ, ทองหล่อ" />
          </label>
          <button class="primary-button" type="submit">ค้นหา</button>
        </form>
        <div class="quick-stats">
          <span><strong>${restaurants.length}</strong> ร้าน</span>
          <span><strong>${totalMenus}</strong> เมนูพร้อมสั่ง</span>
          <span><strong>${selectedMerchant?.eta ?? "-"}</strong> จัดส่ง</span>
        </div>
      </div>
    </section>

    <section class="ordering-grid">
      <aside class="restaurant-list" aria-label="Restaurants">
        <div class="section-title inline">
          <div>
            <p class="eyebrow">เลือกร้าน</p>
            <h2>ร้านอาหาร</h2>
          </div>
          <span class="pill">${restaurants.length}</span>
        </div>
        <div class="restaurant-list-scroll">
          ${restaurants.map((merchant) => `
            <article class="restaurant-card ${String(merchant.id) === String(selectedMerchant?.id) ? "selected" : ""}" data-action="select-merchant" data-merchant-id="${merchant.id}">
              <div class="restaurant-card-top">
                <span class="restaurant-status">${merchant.status === "open" ? "เปิด" : merchant.status === "busy" ? "คิวแน่น" : "ปิดร้าน"}</span>
                <span>${merchant.rating} ★</span>
              </div>
              <strong>${merchant.name}</strong>
              <small>${merchant.category} · ${merchant.location}</small>
              <span>${merchant.eta} · ${merchant.menuItems.length} เมนู</span>
              <button class="detail-link" type="button" data-action="view-merchant" data-merchant-id="${merchant.id}">รายละเอียดร้าน</button>
            </article>
          `).join("")}
        </div>
      </aside>

      <section class="menu-panel">
        <div class="merchant-feature">
          <div>
            <p class="eyebrow">กำลังเลือก</p>
            <h2>${selectedMerchant?.name ?? "ไม่พบร้าน"}</h2>
            <p>${selectedMerchant?.category ?? ""} · ${selectedMerchant?.location ?? ""} · ${selectedMerchant?.address ?? ""}</p>
          </div>
          <button class="ghost-button" type="button" data-action="view-merchant" data-merchant-id="${selectedMerchant?.id ?? ""}">ดูรายละเอียด</button>
        </div>
        <div class="section-title inline">
          <div>
            <p class="eyebrow">เมนูพร้อมสั่ง</p>
            <h2>รายการอาหาร</h2>
          </div>
          <span class="pill">${menuItems.length} เมนู</span>
        </div>
        <div class="menu-grid">
          ${menuItems.length ? menuItems.map((item) => `
            <article class="menu-card" data-action="view-menu" data-item-id="${item.id}">
              ${item.imageUrl1
                ? `<img class="food-thumb image" src="${item.imageUrl1}" alt="${item.name}" />`
                : `<div class="food-thumb">${item.name.slice(0, 1)}</div>`}
              <div class="menu-card-body">
                <strong>${item.name}</strong>
                <p>${item.description || "เมนูแนะนำจากร้าน"}</p>
                <span>${formatCurrency(item.price)}</span>
              </div>
              <div class="menu-card-footer">
                <button class="ghost-button" type="button" data-action="view-menu" data-item-id="${item.id}">รายละเอียด</button>
                <button class="primary-button add-cart-inline" type="button" data-action="add-cart" data-item-id="${item.id}" aria-label="เพิ่ม ${item.name} ลงตะกร้า">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6.4 6.5h14.1l-1.6 8.1a2 2 0 0 1-2 1.6H9.2a2 2 0 0 1-2-1.6L5.6 3.8H3.5" />
                    <path d="M9.6 20.2h.1" />
                    <path d="M17 20.2h.1" />
                  </svg>
                  เพิ่ม
                </button>
              </div>
            </article>
          `).join("") : `<p class="empty-state">ไม่พบเมนูในร้านนี้</p>`}
        </div>
      </section>
    </section>
  `;
}

export function cartDrawer() {
  const cartCount = appState.cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = calculateCartTotal(appState.cart);
  const deliveryFee = appState.cart.length ? 20 : 0;
  const totalAmount = subtotal + deliveryFee;
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
        <div>
          <span>ค่าอาหาร</span>
          <strong>${formatCurrency(subtotal)}</strong>
        </div>
        <div>
          <span>ค่าจัดส่ง</span>
          <strong>${formatCurrency(deliveryFee)}</strong>
        </div>
        <div class="cart-grand-total">
          <span>รวมทั้งหมด</span>
          <strong>${formatCurrency(totalAmount)}</strong>
        </div>
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
