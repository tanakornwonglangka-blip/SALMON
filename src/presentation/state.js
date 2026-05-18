export const appState = {
  user: null,
  route: "user",
  cart: [],
  query: "",
  queryDraft: "",
  selectedMerchantId: null
};

export function setCartItem(menuItem, quantityDelta) {
  const existing = appState.cart.find((item) => item.id === menuItem.id);
  if (!existing && quantityDelta > 0) {
    appState.cart.push({ ...menuItem, quantity: 1 });
    return;
  }
  if (!existing) return;
  existing.quantity += quantityDelta;
  appState.cart = appState.cart.filter((item) => item.quantity > 0);
}

export function clearCart() {
  appState.cart = [];
}
