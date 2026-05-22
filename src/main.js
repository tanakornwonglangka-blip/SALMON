import { createUseCases } from "./application/use-cases.js";
import { createApiClient } from "./infrastructure/api-client.js";
import { createAuthRepository } from "./infrastructure/auth-repository.js";
import { createPaymentGateway } from "./infrastructure/payment-gateway.js";
import { shell, loginModal, registerModal, mapPicker } from "./presentation/components/layout.js";
import { appState, clearCart, loadCartForUser, setCartItem } from "./presentation/state.js";
import { syncRoute } from "./presentation/router.js";
import { cartDrawer, userPage } from "./presentation/views/user-page.js";
import { portalPage } from "./presentation/views/portal-page.js";
import { merchantManagementPage, merchantProfileForm, menuItemForm, subMerchantForm } from "./presentation/views/merchant-management-page.js";
import { usersPage } from "./presentation/views/users-page.js";
import { historyPage } from "./presentation/views/history-page.js";
import { paymentResultPage } from "./presentation/views/payment-result-page.js";
import { formatCurrency } from "./domain/entities.js";

const app = document.querySelector("#app");
const authRepository = createAuthRepository();
const api = createApiClient(authRepository);
const paymentGateway = createPaymentGateway(api);
const useCases = createUseCases({ api, authRepository, paymentGateway });

let menuIndex = new Map();
let merchantIndex = new Map();
let confirmId = 0;
const confirmHandlers = new Map();
let activeMapTarget = null;
let paymentStatusTimer = null;
const PAYMENT_TRANSACTION_KEY = "zaabnua.pendingPaymentTransactionId";

function paymentTransactionIdFromRoute() {
  const paramsText = window.location.hash.split("?")[1] || "";
  const routeTransactionId = new URLSearchParams(paramsText).get("transactionId");
  return routeTransactionId || localStorage.getItem(PAYMENT_TRANSACTION_KEY);
}

async function render() {
  if (paymentStatusTimer) {
    window.clearTimeout(paymentStatusTimer);
    paymentStatusTimer = null;
  }
  appState.user = useCases.getUser();
  if (appState.cartOwnerId !== (appState.user?.id ?? null)) {
    loadCartForUser(appState.user);
  }
  syncRoute();

  let content = "";
  if (appState.route === "portal" && appState.user) {
    const data = await useCases.getPortalData();
    merchantIndex = new Map(data.merchants.map((merchant) => [String(merchant.id), merchant]));
    content = portalPage(data, appState.user);
  } else if (appState.route === "merchant" && appState.user) {
    const data = await useCases.getMerchantManagementData();
    menuIndex = new Map(data.menuItems.map((item) => [String(item.id), item]));
    merchantIndex = new Map(data.merchants.map((merchant) => [String(merchant.id), merchant]));
    content = merchantManagementPage(data, appState.user);
  } else if (appState.route === "users" && appState.user) {
    content = usersPage(await useCases.getUsers(), appState.user);
  } else if (appState.route === "history" && appState.user) {
    content = historyPage(await useCases.getHistory());
  } else if (appState.route === "payment-result" && appState.user) {
    const transactionId = paymentTransactionIdFromRoute();
    if (!transactionId) {
      content = paymentResultPage({ result: "failed", error: "ไม่พบรายการชำระเงินสำหรับตรวจสอบ" });
    } else {
      try {
        const status = await useCases.getPaymentStatus(transactionId);
        if (["success", "failed"].includes(status.result)) localStorage.removeItem(PAYMENT_TRANSACTION_KEY);
        if (status.result === "pending") {
          paymentStatusTimer = window.setTimeout(() => {
            if (appState.route === "payment-result") render();
          }, 5000);
        }
        content = paymentResultPage(status);
      } catch (error) {
        content = paymentResultPage({ result: "failed", error: error.message });
      }
    }
  } else {
    const restaurants = await useCases.searchRestaurants(appState.query);
    merchantIndex = new Map(restaurants.map((merchant) => [String(merchant.id), merchant]));
    menuIndex = new Map(restaurants.flatMap((merchant) => merchant.menuItems.map((item) => [String(item.id), item])));
    content = userPage(restaurants);
  }

  app.innerHTML = shell(content);
}

function showLogin(error = "") {
  document.body.insertAdjacentHTML("beforeend", loginModal(error));
}

function showRegister(error = "") {
  document.body.insertAdjacentHTML("beforeend", registerModal(error));
}

function showCart() {
  document.querySelector("[data-modal='cart']")?.remove();
  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal-backdrop cart-modal" data-modal="cart">
      ${cartDrawer()}
    </div>
  `);
}

function showToast(message) {
  document.querySelector("[data-toast]")?.remove();
  document.body.insertAdjacentHTML("beforeend", `<div class="toast" data-toast>${message}</div>`);
  window.setTimeout(() => document.querySelector("[data-toast]")?.remove(), 2400);
}

function menuConfirmPreview(item) {
  const image = item.imageUrl1 || item.imageUrl2;
  return `
    <div class="confirm-preview">
      ${image ? `<img src="${image}" alt="${item.name}" />` : `<div class="confirm-preview-fallback">${item.name.slice(0, 1)}</div>`}
      <div>
        <strong>${item.name}</strong>
        <small>${item.category || "เมนูอาหาร"}</small>
      </div>
      <b>${formatCurrency(item.price)}</b>
    </div>
  `;
}

function showConfirm({ title, message, confirmText = "ยืนยัน", cancelText = "ยกเลิก", preview = "", onConfirm }) {
  const id = String(++confirmId);
  confirmHandlers.set(id, onConfirm);
  document.querySelector("[data-modal='confirm']")?.remove();
  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal-backdrop" data-modal="confirm">
      <section class="confirm-card">
        <div>
          <p class="eyebrow">ยืนยัน</p>
          <h2>${title}</h2>
          <p class="muted">${message}</p>
        </div>
        ${preview}
        <div class="modal-actions">
          <button class="ghost-button" type="button" data-action="cancel-confirm" data-confirm-id="${id}">${cancelText}</button>
          <button class="primary-button" type="button" data-action="accept-confirm" data-confirm-id="${id}">${confirmText}</button>
        </div>
      </section>
    </div>
  `);
}

function showNotice(title, message = "", linkUrl = "") {
  document.querySelector("[data-modal='notice']")?.remove();
  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal-backdrop" data-modal="notice">
      <section class="notice-card">
        <div>
          <p class="eyebrow">แจ้งเตือน</p>
          <h2>${title}</h2>
          ${message ? `<p class="muted">${message}</p>` : ""}
        </div>
        ${linkUrl ? `
          <a class="payment-redirect-link" href="${linkUrl}" data-action="open-payment-link" data-payment-url="${linkUrl}">
            <span>ไปหน้าชำระเงิน</span>
            <small>${linkUrl}</small>
          </a>
          <p class="payment-status" data-payment-status></p>
        ` : `<button class="primary-button" type="button" data-action="close-notice">ตกลง</button>`}
      </section>
    </div>
  `);
}

function closeProfileMenus(except = null) {
  document.querySelectorAll("[data-profile-menu]").forEach((menu) => {
    if (menu === except) return;
    menu.hidden = true;
    menu.closest(".profile-menu")?.querySelector("[data-action='toggle-profile-menu']")?.setAttribute("aria-expanded", "false");
  });
}

async function applyCartChange(item, quantityDelta) {
  setCartItem(item, quantityDelta, appState.user);
  document.querySelector("[data-modal='detail']")?.remove();
  await render();
  if (document.querySelector("[data-modal='cart']")) {
    document.querySelector("[data-modal='cart']")?.remove();
    showCart();
  }
}

function mapPosition(latitude, longitude, centerLatitude, centerLongitude) {
  const scale = 0.02;
  return {
    left: Math.min(96, Math.max(4, 50 + ((longitude - centerLongitude) / scale) * 50)),
    top: Math.min(96, Math.max(4, 50 - ((latitude - centerLatitude) / scale) * 50))
  };
}

function updateMapModal(latitude, longitude, centerLatitude = latitude, centerLongitude = longitude) {
  activeMapTarget = { ...activeMapTarget, latitude, longitude, centerLatitude, centerLongitude };
  const modal = document.querySelector("[data-modal='map']");
  if (!modal) return;
  const latText = modal.querySelector("[data-map-lat]");
  const lngText = modal.querySelector("[data-map-lng]");
  if (latText) latText.textContent = latitude.toFixed(6);
  if (lngText) lngText.textContent = longitude.toFixed(6);
  const pin = modal.querySelector(".map-pin");
  if (pin) {
    const position = mapPosition(latitude, longitude, centerLatitude, centerLongitude);
    pin.style.left = `${position.left}%`;
    pin.style.top = `${position.top}%`;
  }
}

function openMapPicker(target) {
  const form = target.closest("form");
  const latInput = form?.elements[target.dataset.latInput];
  const lngInput = form?.elements[target.dataset.lngInput];
  if (!form || !latInput || !lngInput) return;
  const latitude = Number(latInput.value) || 13.7563;
  const longitude = Number(lngInput.value) || 100.5018;
  activeMapTarget = {
    form,
    latInput,
    lngInput,
    latitude,
    longitude,
    centerLatitude: latitude,
    centerLongitude: longitude
  };
  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal-backdrop" data-modal="map">
      <section class="map-modal-card">
        <div class="section-title inline">
          <div>
            <p class="eyebrow">เลือกตำแหน่ง</p>
            <h2>${target.dataset.mapLabel || "ปักหมุดบนแผนที่"}</h2>
          </div>
          <button class="icon-button subtle" type="button" data-action="close-map" aria-label="ปิด">×</button>
        </div>
        <div class="map-picker large" data-action="select-map-point">
          <span class="map-pin"></span>
          <div class="map-label">
            <strong>ตำแหน่งที่เลือก</strong>
            <small><span data-map-lat>${latitude.toFixed(6)}</span>, <span data-map-lng>${longitude.toFixed(6)}</span></small>
          </div>
        </div>
        <p class="muted">ระบบจะเริ่มจากตำแหน่งปัจจุบันเมื่อ browser อนุญาต จากนั้นคลิกบนแผนที่เพื่อย้ายหมุด</p>
        <div class="modal-actions">
          <button class="ghost-button" type="button" data-action="close-map">ยกเลิก</button>
          <button class="primary-button" type="button" data-action="confirm-map-point">ใช้ตำแหน่งนี้</button>
        </div>
      </section>
    </div>
  `);
  updateMapModal(latitude, longitude, latitude, longitude);
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLat = position.coords.latitude;
        const nextLng = position.coords.longitude;
        updateMapModal(nextLat, nextLng, nextLat, nextLng);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 60000 }
    );
  }
}

function showMenuForm() {
  const merchants = Array.from(merchantIndex.values());
  const defaultMerchantId = merchants[0]?.id ?? "";
  document.querySelector("[data-modal='menu-item']")?.remove();
  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal-backdrop" data-modal="menu-item">
      ${menuItemForm(merchants, defaultMerchantId)}
    </div>
  `);
}

function showMenuEdit(item) {
  const merchants = Array.from(merchantIndex.values());
  document.querySelector("[data-modal='menu-item']")?.remove();
  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal-backdrop" data-modal="menu-item">
      ${menuItemForm(merchants, item?.merchantId ?? merchants[0]?.id ?? "", item)}
    </div>
  `);
}

function showMerchantEdit(merchant) {
  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal-backdrop" data-modal="detail">
      ${merchantProfileForm(merchant)}
    </div>
  `);
}

function showSubMerchantForm() {
  const merchants = Array.from(merchantIndex.values());
  const defaultParentId = merchants.find((merchant) => !merchant.parentMerchantId)?.id ?? merchants[0]?.id ?? "";
  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal-backdrop" data-modal="detail">
      ${subMerchantForm(merchants, defaultParentId)}
    </div>
  `);
}

function fileToDataUrl(file) {
  if (!file || file.size === 0) return Promise.resolve("");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showUserDetail() {
  const user = appState.user;
  if (!user) return;
  const addressLabel = user.role === "merchant" ? "ที่อยู่ร้านอาหาร" : "ที่อยู่";
  const merchantAddress = user.role === "merchant" ? merchantIndex.get(String(user.merchantId))?.address : "";
  const addressValue = merchantAddress || user.deliveryAddress || "";
  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal-backdrop" data-modal="detail">
      <section class="detail-card">
        <div class="section-title inline">
          <div>
            <p class="eyebrow">ข้อมูลผู้ใช้</p>
            <h2>${user.name}</h2>
          </div>
          <span class="role-badge">${user.role === "admin" ? "ผู้ดูแลระบบ" : user.role === "merchant" ? "ร้านค้า" : "ผู้สั่งอาหาร"}</span>
        </div>
        <div class="detail-grid">
          <span>ชื่อผู้ใช้</span><strong>${user.username}</strong>
          <span>อีเมล</span><strong>${user.email}</strong>
          <span>บทบาท</span><strong>${user.role === "admin" ? "ผู้ดูแลระบบ" : user.role === "merchant" ? "ร้านค้า" : "ผู้สั่งอาหาร"}</strong>
          <span>${addressLabel}</span><strong>${addressValue || "ยังไม่ได้ระบุ"}</strong>
          <span>พิกัด</span><strong>${user.latitude ?? "-"}, ${user.longitude ?? "-"}</strong>
        </div>
        <div class="modal-actions">
          <button class="ghost-button" type="button" data-action="close-detail">ปิด</button>
          <button class="primary-button" type="button" data-action="open-profile-edit">Edit profile</button>
        </div>
      </section>
    </div>
  `);
}

function showProfileEdit() {
  const user = appState.user;
  if (!user) return;
  const addressLabel = user.role === "merchant" ? "ที่อยู่ร้านอาหาร" : "ที่อยู่จัดส่ง";
  document.querySelector("[data-modal='detail']")?.remove();
  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal-backdrop" data-modal="detail">
      <form class="detail-card" data-form="user-profile">
        <div class="section-title">
          <p class="eyebrow">Edit profile</p>
          <h2>${user.name}</h2>
        </div>
        <div class="form-row">
          <label>ชื่อ <input name="firstName" value="${user.firstName}" required /></label>
          <label>นามสกุล <input name="lastName" value="${user.lastName}" required /></label>
        </div>
        <label>อีเมล <input name="email" type="email" value="${user.email}" required /></label>
        <label>${addressLabel} <textarea name="deliveryAddress" required>${user.deliveryAddress ?? ""}</textarea></label>
        ${mapPicker({ latitude: user.latitude ?? "", longitude: user.longitude ?? "", label: "ปักหมุดที่อยู่ของฉัน" })}
        <div class="modal-actions">
          <button class="ghost-button" type="button" data-action="close-detail">ปิด</button>
          <button class="primary-button" type="submit">ยืนยันการแก้ไข</button>
        </div>
      </form>
    </div>
  `);
}

function showMerchantDetail(merchant) {
  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal-backdrop" data-modal="detail">
      <section class="detail-card">
        <p class="eyebrow">รายละเอียดร้าน</p>
        <h2>${merchant.name}</h2>
        <p class="muted">${merchant.category} · ${merchant.location}</p>
        <div class="detail-grid">
          <span>สถานะ</span><strong>${merchant.status === "open" ? "เปิด" : "คิวแน่น"}</strong>
          <span>คะแนน</span><strong>${merchant.rating} ★</strong>
          <span>เวลาจัดส่ง</span><strong>${merchant.eta}</strong>
          <span>ที่อยู่ร้าน</span><strong>${merchant.address}</strong>
        </div>
        <button class="ghost-button" data-action="close-detail">ปิด</button>
      </section>
    </div>
  `);
}

function showMenuDetail(item) {
  const images = [item.imageUrl1, item.imageUrl2].filter(Boolean);
  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal-backdrop" data-modal="detail">
      <section class="detail-card">
        <p class="eyebrow">รายละเอียดเมนู</p>
        <h2>${item.name}</h2>
        <p class="muted">${item.category}</p>
        ${images.length ? `
          <div class="detail-images">
            ${images.map((src) => `<img src="${src}" alt="${item.name}" />`).join("")}
          </div>
        ` : `<div class="detail-placeholder">${item.name.slice(0, 1)}</div>`}
        <p>${item.description || "ไม่มีคำอธิบาย"}</p>
        <strong>${new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(item.price)}</strong>
        <div class="modal-actions">
          <button class="ghost-button" data-action="close-detail">ปิด</button>
          <button class="primary-button" data-action="add-cart" data-item-id="${item.id}">เพิ่มลงตะกร้า</button>
        </div>
      </section>
    </div>
  `);
}

async function handleAction(target, event) {
  const action = target.dataset.action;
  if (!action) return;

  if (action === "open-login") showLogin();
  if (action === "open-register") showRegister();
  if (action === "open-cart") showCart();
  if (action === "open-menu-form") showMenuForm();
  if (action === "open-sub-merchant-form") showSubMerchantForm();
  if (action === "toggle-profile-menu") {
    const menu = target.closest(".profile-menu")?.querySelector("[data-profile-menu]");
    const shouldOpen = Boolean(menu?.hidden);
    closeProfileMenus(menu);
    if (menu) {
      menu.hidden = !shouldOpen;
      target.setAttribute("aria-expanded", String(shouldOpen));
    }
  }
  if (action === "open-user-detail") {
    closeProfileMenus();
    showUserDetail();
  }
  if (action === "open-profile-edit") showProfileEdit();
  if (action === "open-map-picker") openMapPicker(target);
  if (action === "close-login") document.querySelector("[data-modal='login']")?.remove();
  if (action === "close-register") document.querySelector("[data-modal='register']")?.remove();
  if (action === "close-detail") document.querySelector("[data-modal='detail']")?.remove();
  if (action === "close-cart") document.querySelector("[data-modal='cart']")?.remove();
  if (action === "close-menu-form") document.querySelector("[data-modal='menu-item']")?.remove();
  if (action === "close-map") document.querySelector("[data-modal='map']")?.remove();
  if (action === "close-notice") document.querySelector("[data-modal='notice']")?.remove();
  if (action === "open-payment-link") {
    event.preventDefault();
    const url = target.dataset.paymentUrl;
    if (!url) return;
    const status = document.querySelector("[data-payment-status]");
    target.classList.add("loading");
    target.setAttribute("aria-busy", "true");
    if (status) status.textContent = "กำลังเปิดหน้าชำระเงิน...";
    const paymentWindow = window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => {
      target.classList.remove("loading");
      target.removeAttribute("aria-busy");
      if (status) status.textContent = paymentWindow ? "เปิดหน้าชำระเงินแล้ว รอผลการทำรายการ" : "Browser บล็อกการเปิดแท็บใหม่ กรุณากดลิงก์อีกครั้ง";
    }, 500);
  }
  if (action === "cancel-confirm") {
    confirmHandlers.delete(target.dataset.confirmId);
    document.querySelector("[data-modal='confirm']")?.remove();
  }
  if (action === "accept-confirm") {
    const handler = confirmHandlers.get(target.dataset.confirmId);
    confirmHandlers.delete(target.dataset.confirmId);
    document.querySelector("[data-modal='confirm']")?.remove();
    if (handler) await handler();
  }
  if (action === "logout") {
    clearCart(appState.user);
    await useCases.logout();
    window.location.hash = "#/user";
    await render();
  }
  if (action === "select-merchant") {
    appState.selectedMerchantId = target.dataset.merchantId;
    await render();
  }
  if (action === "view-merchant") {
    appState.selectedMerchantId = target.dataset.merchantId;
    const merchant = merchantIndex.get(String(target.dataset.merchantId));
    if (merchant) showMerchantDetail(merchant);
    await render();
  }
  if (action === "view-menu") {
    const item = menuIndex.get(String(target.dataset.itemId));
    if (item) showMenuDetail(item);
  }
  if (action === "open-menu-edit") {
    const item = menuIndex.get(String(target.dataset.itemId));
    if (item) showMenuEdit(item);
  }
  if (action === "delete-menu") {
    const item = menuIndex.get(String(target.dataset.itemId));
    if (!item) return;
    showConfirm({
      title: "ลบเมนูอาหารนี้?",
      message: `ต้องการลบ ${item.name} ออกจากคลังเมนู`,
      preview: menuConfirmPreview(item),
      confirmText: "ลบเมนู",
      onConfirm: async () => {
        await useCases.deleteMenuItem(item.id);
        await render();
        showToast(`ลบ ${item.name} แล้ว`);
      }
    });
  }
  if (action === "open-merchant-edit") {
    const merchant = merchantIndex.get(String(target.dataset.merchantId));
    if (merchant) showMerchantEdit(merchant);
  }
  if (action === "select-map-point") {
    const rect = target.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    if (!activeMapTarget) return;
    const scale = 0.02;
    const latitude = activeMapTarget.centerLatitude + (0.5 - y) * scale;
    const longitude = activeMapTarget.centerLongitude + (x - 0.5) * scale;
    updateMapModal(latitude, longitude, activeMapTarget.centerLatitude, activeMapTarget.centerLongitude);
  }
  if (action === "confirm-map-point") {
    if (activeMapTarget) {
      activeMapTarget.latInput.value = activeMapTarget.latitude.toFixed(6);
      activeMapTarget.lngInput.value = activeMapTarget.longitude.toFixed(6);
      const button = activeMapTarget.form.querySelector("[data-action='open-map-picker']");
      const small = button?.querySelector("small");
      if (small) small.textContent = `${activeMapTarget.latitude.toFixed(6)}, ${activeMapTarget.longitude.toFixed(6)}`;
    }
    activeMapTarget = null;
    document.querySelector("[data-modal='map']")?.remove();
  }
  if (action === "add-cart" || action === "cart-inc" || action === "cart-dec") {
    if (!appState.user && action === "add-cart") {
      showLogin("กรุณาเข้าสู่ระบบก่อนเพิ่มเมนูลงตะกร้า");
      return;
    }
    const item = menuIndex.get(String(target.dataset.itemId)) || appState.cart.find((cartItem) => String(cartItem.id) === String(target.dataset.itemId));
    if (!item) return;
    if (action === "add-cart") {
      showConfirm({
        title: "เพิ่มเมนูนี้ลงตะกร้า?",
        message: `ยืนยันว่าจะสั่ง ${item.name}`,
        preview: menuConfirmPreview(item),
        confirmText: "เพิ่มลงตะกร้า",
        onConfirm: async () => {
          await applyCartChange(item, 1);
          showToast(`เพิ่ม ${item.name} ลงตะกร้าแล้ว`);
        }
      });
      return;
    }
    await applyCartChange(item, action === "cart-dec" ? -1 : 1);
  }
  if (action === "checkout") {
    if (!appState.user) {
      showLogin("กรุณาเข้าสู่ระบบก่อนชำระเงิน");
      return;
    }
    const paymentMethod = document.querySelector("input[name='paymentMethod']:checked")?.value ?? "เงินสด";
    try {
      const { transaction, payment } = await useCases.checkout(appState.cart, paymentMethod);
      clearCart(appState.user);
      document.querySelector("[data-modal='cart']")?.remove();
      await render();
      if (payment?.redirectUrl) {
        localStorage.setItem(PAYMENT_TRANSACTION_KEY, String(transaction.id));
        showNotice("สร้างลิงก์ชำระเงินแล้ว", "", payment.redirectUrl);
      } else {
        showNotice("ชำระเงินสำเร็จ", `คำสั่งซื้อ #${transaction.id} ถูกบันทึกแล้ว`);
      }
    } catch (error) {
      showNotice("ไม่สามารถชำระเงินได้", error.message);
    }
  }
}

document.body.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (target) await handleAction(target, event);
  if (!event.target.closest(".profile-menu")) closeProfileMenus();
});

document.body.addEventListener("submit", async (event) => {
  const form = event.target;
  if (form.dataset.form === "login") {
    event.preventDefault();
    const formData = new FormData(form);
    try {
      await useCases.login(formData.get("username"), formData.get("password"));
      document.querySelector("[data-modal='login']")?.remove();
      const user = useCases.getUser();
      if (["admin", "merchant"].includes(user?.role)) {
        window.location.hash = "#/portal";
      }
      await render();
    } catch (error) {
      document.querySelector("[data-modal='login']")?.remove();
      showLogin(error.message);
    }
  }

  if (form.dataset.form === "register") {
    event.preventDefault();
    const formData = new FormData(form);
    try {
      await useCases.register(Object.fromEntries(formData.entries()));
      document.querySelector("[data-modal='register']")?.remove();
      showLogin("สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ");
    } catch (error) {
      document.querySelector("[data-modal='register']")?.remove();
      showRegister(error.message);
    }
  }

  if (form.dataset.form === "user-profile") {
    event.preventDefault();
    const formData = new FormData(form);
    const profile = Object.fromEntries(formData.entries());
    showConfirm({
      title: "ยืนยันการเปลี่ยนแปลงข้อมูลโปรไฟล์?",
      message: "ข้อมูลชื่อ อีเมล ที่อยู่ และพิกัดจะถูกบันทึกในบัญชีนี้",
      confirmText: "บันทึกข้อมูล",
      onConfirm: async () => {
        await useCases.updateUserProfile(profile);
        document.querySelector("[data-modal='detail']")?.remove();
        await render();
        showToast("บันทึกข้อมูลโปรไฟล์แล้ว");
      }
    });
  }

  if (form.dataset.form === "search") {
    event.preventDefault();
    const formData = new FormData(form);
    appState.query = String(formData.get("search") || "");
    appState.queryDraft = appState.query;
    appState.selectedMerchantId = null;
    await render();
  }

  if (form.dataset.form === "menu-item") {
    event.preventDefault();
    const formData = new FormData(form);
    const imageUrl1 = await fileToDataUrl(formData.get("image1"));
    const imageUrl2 = await fileToDataUrl(formData.get("image2"));
    await useCases.saveMenuItem({
      id: formData.get("id") || undefined,
      merchantId: formData.get("merchantId"),
      name: formData.get("name"),
      description: formData.get("description"),
      price: Number(formData.get("price")),
      category: formData.get("category"),
      available: formData.get("available") === "on",
      imageUrl1: imageUrl1 || formData.get("imageUrl1"),
      imageUrl2: imageUrl2 || formData.get("imageUrl2")
    });
    form.reset();
    document.querySelector("[data-modal='menu-item']")?.remove();
    await render();
  }

  if (form.dataset.form === "merchant-profile") {
    event.preventDefault();
    const formData = new FormData(form);
    await useCases.updateMerchant(Object.fromEntries(formData.entries()));
    document.querySelector("[data-modal='detail']")?.remove();
    await render();
  }

  if (form.dataset.form === "sub-merchant") {
    event.preventDefault();
    const formData = new FormData(form);
    await useCases.saveSubMerchant(Object.fromEntries(formData.entries()));
    document.querySelector("[data-modal='detail']")?.remove();
    await render();
  }
});

document.body.addEventListener("input", async (event) => {
  if (event.target.dataset.input === "restaurant-search") {
    appState.queryDraft = event.target.value;
  }
  if (event.target.name === "latitude" || event.target.name === "longitude") {
    const form = event.target.closest("form");
    const button = form?.querySelector("[data-action='open-map-picker']");
    const lat = Number(form?.elements.latitude?.value);
    const lng = Number(form?.elements.longitude?.value);
    const small = button?.querySelector("small");
    if (small && Number.isFinite(lat) && Number.isFinite(lng)) {
      small.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  }
});

window.addEventListener("hashchange", render);

render();
