export const appState = {
  user: null,
  route: "user",
  cart: [],
  cartOwnerId: null,
  query: "",
  queryDraft: "",
  selectedMerchantId: null
};

const CART_STORAGE_PREFIX = "zaabnua.cart";

function cartStorageKey(user) {
  return user?.id ? `${CART_STORAGE_PREFIX}.${user.id}` : "";
}

function saveCartForUser(user) {
  const key = cartStorageKey(user);
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(appState.cart));
}

export function loadCartForUser(user) {
  appState.cartOwnerId = user?.id ?? null;
  if (!user) {
    appState.cart = [];
    return;
  }
  const raw = localStorage.getItem(cartStorageKey(user));
  try {
    appState.cart = raw ? JSON.parse(raw) : [];
  } catch {
    appState.cart = [];
  }
}

export function setCartItem(menuItem, quantityDelta, user = appState.user) {
  const existing = appState.cart.find((item) => item.id === menuItem.id);
  if (!existing && quantityDelta > 0) {
    appState.cart.push({ ...menuItem, quantity: 1 });
    saveCartForUser(user);
    return;
  }
  if (!existing) return;
  existing.quantity += quantityDelta;
  appState.cart = appState.cart.filter((item) => item.quantity > 0);
  saveCartForUser(user);
}

export function clearCart(user = appState.user) {
  appState.cart = [];
  const key = cartStorageKey(user);
  if (key) localStorage.removeItem(key);
}
