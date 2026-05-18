import { createUseCases } from "./application/use-cases.js";
import { createApiClient } from "./infrastructure/api-client.js";
import { createAuthRepository } from "./infrastructure/auth-repository.js";
import { createPaymentGateway } from "./infrastructure/payment-gateway.js";
import { shell, loginModal, registerModal } from "./presentation/components/layout.js";
import { appState, clearCart, setCartItem } from "./presentation/state.js";
import { syncRoute } from "./presentation/router.js";
import { userPage } from "./presentation/views/user-page.js";
import { portalPage } from "./presentation/views/portal-page.js";
import { merchantManagementPage } from "./presentation/views/merchant-management-page.js";
import { usersPage } from "./presentation/views/users-page.js";

const app = document.querySelector("#app");
const authRepository = createAuthRepository();
const api = createApiClient(authRepository);
const paymentGateway = createPaymentGateway(api);
const useCases = createUseCases({ api, authRepository, paymentGateway });

let menuIndex = new Map();

async function render() {
  appState.user = useCases.getUser();
  syncRoute();

  let content = "";
  if (appState.route === "portal" && appState.user) {
    content = portalPage(await useCases.getPortalData(), appState.user);
  } else if (appState.route === "merchant" && appState.user) {
    const data = await useCases.getMerchantManagementData();
    menuIndex = new Map(data.menuItems.map((item) => [item.id, item]));
    content = merchantManagementPage(data);
  } else if (appState.route === "users" && appState.user) {
    content = usersPage(await useCases.getUsers(), appState.user);
  } else {
    const restaurants = await useCases.searchRestaurants(appState.query);
    menuIndex = new Map(restaurants.flatMap((merchant) => merchant.menuItems.map((item) => [item.id, item])));
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

async function handleAction(target) {
  const action = target.dataset.action;
  if (!action) return;

  if (action === "open-login") showLogin();
  if (action === "open-register") showRegister();
  if (action === "close-login") document.querySelector("[data-modal='login']")?.remove();
  if (action === "close-register") document.querySelector("[data-modal='register']")?.remove();
  if (action === "logout") {
    await useCases.logout();
    window.location.hash = "#/user";
    await render();
  }
  if (action === "select-merchant") {
    appState.selectedMerchantId = target.dataset.merchantId;
    await render();
  }
  if (action === "add-cart" || action === "cart-inc" || action === "cart-dec") {
    const item = menuIndex.get(target.dataset.itemId) || appState.cart.find((cartItem) => cartItem.id === target.dataset.itemId);
    if (!item) return;
    setCartItem(item, action === "cart-dec" ? -1 : 1);
    await render();
  }
  if (action === "checkout") {
    if (!appState.user) {
      showLogin("กรุณาเข้าสู่ระบบก่อนชำระเงิน");
      return;
    }
    const paymentMethod = document.querySelector("[data-input='payment-method']")?.value ?? "เงินสด";
    try {
      const { transaction } = await useCases.checkout(appState.cart, paymentMethod);
      clearCart();
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
    await useCases.saveMenuItem({
      merchantId: formData.get("merchantId"),
      name: formData.get("name"),
      description: formData.get("description"),
      price: Number(formData.get("price")),
      category: formData.get("category"),
      available: true
    });
    form.reset();
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
