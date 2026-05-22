import { Roles } from "../../domain/entities.js";
import { appState } from "../state.js";

export function shell(content) {
  const user = appState.user;
  const cartCount = appState.cart.reduce((total, item) => total + item.quantity, 0);
  const showCartButton = user?.role === Roles.USER;
  const roleLabel = user?.role === Roles.ADMIN ? "ผู้ดูแลระบบ" : user?.role === Roles.MERCHANT ? "ผู้ดูแลร้าน" : "ผู้สั่งอาหาร";
  const navItems = [
    { route: "user", label: "สั่งอาหาร", roles: [Roles.USER, null] },
    { route: "history", label: "ประวัติ", roles: [Roles.USER] },
    { route: "portal", label: "ภาพรวม", roles: [Roles.ADMIN, Roles.MERCHANT] },
    { route: "merchant", label: "จัดการร้าน", roles: [Roles.ADMIN, Roles.MERCHANT] }
  ].filter((item) => item.roles.includes(user?.role ?? null));
  const homeRoute = [Roles.ADMIN, Roles.MERCHANT].includes(user?.role) ? "portal" : "user";

  return `
    <header class="topbar">
      <a class="brand" href="#/${homeRoute}" aria-label="กลับหน้าหลัก ZaabNua">
        <img class="brand-logo" src="./assets/zaabnua-logo.svg" alt="ZaabNua" />
      </a>
      <nav class="nav-tabs" aria-label="เมนูหลัก">
        ${navItems.map((item) => `
          <a class="${appState.route === item.route ? "active" : ""}" href="#/${item.route}">${item.label}</a>
        `).join("")}
      </nav>
      <div class="account-chip">
        ${showCartButton ? `
          <button class="cart-icon-button" type="button" data-action="open-cart" aria-label="เปิดตะกร้าสินค้า">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6.4 6.5h14.1l-1.6 8.1a2 2 0 0 1-2 1.6H9.2a2 2 0 0 1-2-1.6L5.6 3.8H3.5" />
              <path d="M9.6 20.2h.1" />
              <path d="M17 20.2h.1" />
            </svg>
            <span>${cartCount}</span>
          </button>
        ` : ""}
        ${user ? `
          <div class="profile-menu">
            <button class="profile-trigger" type="button" data-action="toggle-profile-menu" aria-expanded="false">
              <span class="profile-avatar" aria-hidden="true"></span>
              <span class="profile-copy">
                <strong>${user.name}</strong>
                <small>${roleLabel}</small>
              </span>
              <span class="profile-chevron" aria-hidden="true">▾</span>
            </button>
            <div class="profile-dropdown" data-profile-menu hidden>
              <button type="button" data-action="open-user-detail">โปรไฟล์ผู้ใช้งาน</button>
              <button type="button" data-action="logout">ออกจากระบบ</button>
            </div>
          </div>
        ` : `
          <button class="ghost-button compact" data-action="open-register">สมัครสมาชิก</button>
          <button class="primary-button compact" data-action="open-login">เข้าสู่ระบบ</button>
        `}
      </div>
    </header>
    <main>${content}</main>
  `;
}

export function mapPicker({ latitude = "", longitude = "", label = "ปักหมุดบนแผนที่", prefix = "" } = {}) {
  const lat = latitude ?? "";
  const lng = longitude ?? "";
  return `
    <button class="map-open-button" type="button" data-action="open-map-picker" data-lat-input="${prefix}latitude" data-lng-input="${prefix}longitude" data-map-label="${label}">
      <strong>${label}</strong>
      <small>${lat && lng ? `${lat}, ${lng}` : "กดเพื่อเลือกตำแหน่งจากแผนที่"}</small>
    </button>
    <div class="form-row compact">
      <label>Latitude <input name="${prefix}latitude" value="${lat}" inputmode="decimal" /></label>
      <label>Longitude <input name="${prefix}longitude" value="${lng}" inputmode="decimal" /></label>
    </div>
  `;
}

export function loginModal(error = "") {
  return `
    <div class="modal-backdrop" data-modal="login">
      <form class="login-card" data-form="login">
        <div>
          <p class="eyebrow">เข้าสู่ระบบ</p>
          <h2>เข้าสู่ระบบ ZaabNua</h2>
          <p class="muted">ใช้ชื่อผู้ใช้และรหัสผ่านสำหรับผู้ดูแล ร้านค้า หรือผู้สั่งอาหาร</p>
        </div>
        ${error ? `<div class="form-error">${error}</div>` : ""}
        <label>ชื่อผู้ใช้ <input name="username" autocomplete="username" value="user" /></label>
        <label>รหัสผ่าน <input name="password" type="password" autocomplete="current-password" value="password" /></label>
        <button class="primary-button" type="submit">เข้าสู่ระบบ</button>
        <button class="ghost-button" type="button" data-action="close-login">ปิด</button>
      </form>
    </div>
  `;
}

export function registerModal(error = "") {
  return `
    <div class="modal-backdrop" data-modal="register">
      <form class="login-card wide" data-form="register">
        <div>
          <p class="eyebrow">สมัครสมาชิก</p>
          <h2>สร้างบัญชีใหม่</h2>
          <p class="muted">เลือกสมัครเป็นร้านค้าเพื่อขายอาหาร หรือเป็นผู้สั่งอาหารเพื่อใช้บริการจัดส่ง</p>
        </div>
        ${error ? `<div class="form-error">${error}</div>` : ""}
        <div class="segmented-control">
          <label><input type="radio" name="role" value="user" checked /> ผู้สั่งอาหาร</label>
          <label><input type="radio" name="role" value="merchant" /> ร้านค้า</label>
        </div>
        <label>อีเมล <input name="email" type="email" autocomplete="email" required /></label>
        <div class="form-row">
          <label>ชื่อผู้ใช้ <input name="username" autocomplete="username" required /></label>
          <label>รหัสผ่าน <input name="password" type="password" autocomplete="new-password" required /></label>
        </div>
        <div class="form-row">
          <label>ชื่อ <input name="firstName" required /></label>
          <label>นามสกุล <input name="lastName" required /></label>
        </div>
        <label>ที่อยู่สำหรับจัดส่งหรือที่อยู่ร้าน <textarea name="deliveryAddress" required></textarea></label>
        <div class="merchant-fields">
          <label>ชื่อร้าน <input name="shopName" /></label>
          <div class="form-row">
            <label>ประเภทร้าน <input name="category" value="ร้านอาหาร" /></label>
            <label>ย่าน <input name="location" value="กรุงเทพฯ" /></label>
          </div>
        </div>
        <div class="modal-actions">
          <button class="ghost-button" type="button" data-action="close-register">ปิด</button>
          <button class="primary-button" type="submit">สมัครสมาชิก</button>
        </div>
      </form>
    </div>
  `;
}

export function metricCard(label, value, detail) {
  return `
    <article class="metric-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${detail}</small>
    </article>
  `;
}
