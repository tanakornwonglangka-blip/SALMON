export const Roles = Object.freeze({
  ADMIN: "admin",
  MERCHANT: "merchant",
  USER: "user"
});

export const TransactionStatus = Object.freeze({
  PAID: "paid",
  PENDING: "pending",
  REFUNDED: "refunded"
});

export function canViewMerchant(currentUser, merchantId) {
  if (!currentUser) return false;
  if (currentUser.role === Roles.ADMIN) return true;
  if (currentUser.role === Roles.MERCHANT) return currentUser.merchantId === merchantId;
  return false;
}

export function calculateCartTotal(cartItems) {
  return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0
  }).format(value);
}
