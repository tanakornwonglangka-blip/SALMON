import { Roles } from "../../domain/entities.js";
import { appState } from "../state.js";

export function shell(content) {
  const user = appState.user;
  const navItems = [
    { route: "user", label: "สั่งอาหาร", roles: [Roles.ADMIN, Roles.MERCHANT, Roles.USER, null] },
    { route: "portal", label: "ภาพรวม", roles: [Roles.ADMIN, Roles.MERCHANT] },
    { route: "merchant", label: "จัดการร้าน", roles: [Roles.ADMIN, Roles.MERCHANT] },
    { route: "users", label: "ผู้ใช้", roles: [Roles.ADMIN, Roles.MERCHANT, Roles.USER] }
  ].filter((item) => item.roles.includes(user?.role ?? null));

  return `
    <header class="topbar">
      <a class="brand" href="#/user" aria-label="กลับหน้าหลัก ZaabNua">
        <span class="brand-mark">Z</span>
        <span>
          <strong>ZaabNua</strong>
          <small>สั่งง่าย จัดการร้านคล่อง</small>
        </span>
      </a>
      <nav class="nav-tabs" aria-label="เมนูหลัก">
        ${navItems.map((item) => `
          <a class="${appState.route === item.route ? "active" : ""}" href="#/${item.route}">${item.label}</a>
        `).join("")}
      </nav>
      <div class="account-chip">
        ${user ? `
          <span>${user.name}</span>
          <button class="ghost-button" data-action="logout">ออกจากระบบ</button>
        ` : `
          <button class="ghost-button compact" data-action="open-register">สมัครสมาชิก</button>
          <button class="primary-button compact" data-action="open-login">เข้าสู่ระบบ</button>
        `}
      </div>
    </header>
    <main>${content}</main>
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
        <div class="form-row">
          <label>อีเมล <input name="email" type="email" autocomplete="email" required /></label>
          <label>ชื่อผู้ใช้ <input name="username" autocomplete="username" required /></label>
        </div>
        <label>รหัสผ่าน <input name="password" type="password" autocomplete="new-password" required /></label>
        <div class="form-row">
          <label>ชื่อ <input name="firstName" required /></label>
          <label>นามสกุล <input name="lastName" required /></label>
        </div>
        <label>ที่อยู่สำหรับจัดส่งหรือที่อยู่ร้าน <textarea name="deliveryAddress" required></textarea></label>
        <div class="merchant-fields">
          <label>ชื่อร้าน <input name="shopName" /></label>
          <label>ที่อยู่ร้าน <textarea name="shopAddress"></textarea></label>
          <div class="form-row">
            <label>ประเภทร้าน <input name="category" value="ร้านอาหาร" /></label>
            <label>ย่าน <input name="location" value="กรุงเทพฯ" /></label>
          </div>
        </div>
        <button class="primary-button" type="submit">สมัครสมาชิก</button>
        <button class="ghost-button" type="button" data-action="close-register">ปิด</button>
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
