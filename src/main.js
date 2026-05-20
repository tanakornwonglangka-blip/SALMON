import { createUseCases } from "./application/use-cases.js";
import { createApiClient } from "./infrastructure/api-client.js";
import { createAuthRepository } from "./infrastructure/auth-repository.js";
import { createPaymentGateway } from "./infrastructure/payment-gateway.js";
import { shell, loginModal, registerModal } from "./presentation/components/layout.js";
import { appState, clearCart, loadCartForUser, setCartItem } from "./presentation/state.js";
import { syncRoute } from "./presentation/router.js";
import { cartDrawer, userPage } from "./presentation/views/user-page.js";
import { portalPage } from "./presentation/views/portal-page.js";
import { merchantManagementPage, menuItemForm } from "./presentation/views/merchant-management-page.js";
import { usersPage } from "./presentation/views/users-page.js";

const app = document.querySelector("#app");
const authRepository = createAuthRepository();
const api = createApiClient(authRepository);
const paymentGateway = createPaymentGateway(api);
const useCases = createUseCases({ api, authRepository, paymentGateway });

let menuIndex = new Map();
let merchantIndex = new Map();

async function render() {
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

function showMenuForm() {
  const merchants = Array.from(merchantIndex.values());
  const defaultMerchantId = merchants[0]?.id ?? "";
  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal-backdrop" data-modal="menu-item">
      ${menuItemForm(merchants, defaultMerchantId)}
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
      <form class="detail-card" data-form="user-profile">
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
        </div>
        <label>${addressLabel} <textarea name="deliveryAddress" required>${addressValue}</textarea></label>
        <div class="modal-actions">
          <button class="ghost-button" type="button" data-action="close-detail">ปิด</button>
          <button class="primary-button" type="submit">บันทึกที่อยู่</button>
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

async function handleAction(target) {
  const action = target.dataset.action;
  if (!action) return;

  if (action === "open-login") showLogin();
  if (action === "open-register") showRegister();
  if (action === "open-cart") showCart();
  if (action === "open-menu-form") showMenuForm();
  if (action === "open-user-detail") showUserDetail();
  if (action === "close-login") document.querySelector("[data-modal='login']")?.remove();
  if (action === "close-register") document.querySelector("[data-modal='register']")?.remove();
  if (action === "close-detail") document.querySelector("[data-modal='detail']")?.remove();
  if (action === "close-cart") document.querySelector("[data-modal='cart']")?.remove();
  if (action === "close-menu-form") document.querySelector("[data-modal='menu-item']")?.remove();
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
  if (action === "add-cart" || action === "cart-inc" || action === "cart-dec") {
    if (!appState.user && action === "add-cart") {
      showLogin("กรุณาเข้าสู่ระบบก่อนเพิ่มเมนูลงตะกร้า");
      return;
    }
    const item = menuIndex.get(String(target.dataset.itemId)) || appState.cart.find((cartItem) => String(cartItem.id) === String(target.dataset.itemId));
    if (!item) return;
    setCartItem(item, action === "cart-dec" ? -1 : 1, appState.user);
    document.querySelector("[data-modal='detail']")?.remove();
    await render();
    if (document.querySelector("[data-modal='cart']")) {
      document.querySelector("[data-modal='cart']")?.remove();
      showCart();
    }
  }
  if (action === "checkout") {
    if (!appState.user) {
      showLogin("กรุณาเข้าสู่ระบบก่อนชำระเงิน");
      return;
    }
    const paymentMethod = document.querySelector("input[name='paymentMethod']:checked")?.value ?? "เงินสด";
    try {
      const { transaction } = await useCases.checkout(appState.cart, paymentMethod);
      clearCart(appState.user);
      document.querySelector("[data-modal='cart']")?.remove();
      await render();
      window.alert(`ชำระเงินสำเร็จ: คำสั่งซื้อ #${transaction.id}`);
    } catch (error) {
      window.alert(error.message);
    }
  }
}

document.body.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (target) await handleAction(target);
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
    await useCases.updateUserProfile(Object.fromEntries(formData.entries()));
    document.querySelector("[data-modal='detail']")?.remove();
    await render();
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
      merchantId: formData.get("merchantId"),
      name: formData.get("name"),
      description: formData.get("description"),
      price: Number(formData.get("price")),
      category: formData.get("category"),
      available: true,
      imageUrl1,
      imageUrl2
    });
    form.reset();
    document.querySelector("[data-modal='menu-item']")?.remove();
    await render();
  }

  if (form.dataset.form === "merchant-profile") {
    event.preventDefault();
    const formData = new FormData(form);
    await useCases.updateMerchant(Object.fromEntries(formData.entries()));
    await render();
  }
});

document.body.addEventListener("input", async (event) => {
  if (event.target.dataset.input === "restaurant-search") {
    appState.queryDraft = event.target.value;
  }
});

window.addEventListener("hashchange", render);

render();
