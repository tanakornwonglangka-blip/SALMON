export function createPaymentGateway(api) {
  return {
    pay: (cartItems, paymentMethod) => api.checkout(cartItems, paymentMethod)
  };
}
