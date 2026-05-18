import { calculateCartTotal } from "../domain/entities.js";

export function createUseCases({ api, authRepository, paymentGateway }) {
  return {
    async login(username, password) {
      const session = await api.login(username, password);
      return authRepository.saveSession(session);
    },
    register: (profile) => api.register(profile),
    async logout() {
      try {
        if (authRepository.getToken()) await api.logout();
      } finally {
        authRepository.logout();
      }
    },
    getSession: () => authRepository.getSession(),
    getUser: () => authRepository.getUser(),
    getPortalData: () => api.getPortalData(),
    getMerchantManagementData: () => api.getMerchantManagementData(),
    getUsers: () => api.getUsers(),
    saveMenuItem: (item) => api.saveMenuItem(item),
    async searchRestaurants(query = "") {
      const payload = await api.searchRestaurants(query);
      return payload.restaurants;
    },
    checkout: (cartItems, paymentMethod) => {
      if (!cartItems.length) throw new Error("ตะกร้าสินค้าว่างอยู่");
      calculateCartTotal(cartItems);
      return paymentGateway.pay(cartItems, paymentMethod);
    }
  };
}
