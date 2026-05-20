export function createApiClient(authRepository) {
  async function request(path, options = {}) {
    const token = authRepository.getToken();
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    }
    return payload;
  }

  return {
    login: (username, password) => request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    }),
    register: (profile) => request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(profile)
    }),
    logout: () => request("/api/auth/logout", { method: "POST", body: "{}" }),
    getMe: () => request("/api/me"),
    getPortalData: () => request("/api/portal"),
    getMerchantManagementData: () => request("/api/merchant-management"),
    getUsers: () => request("/api/users"),
    searchRestaurants: (query) => request(`/api/restaurants?search=${encodeURIComponent(query || "")}`),
    saveMenuItem: (item) => request("/api/menu-items", {
      method: "POST",
      body: JSON.stringify(item)
    }),
    updateMerchant: (merchant) => request("/api/merchant-profile", {
      method: "POST",
      body: JSON.stringify(merchant)
    }),
    updateUserProfile: (profile) => request("/api/user-profile", {
      method: "POST",
      body: JSON.stringify(profile)
    }),
    checkout: (items, paymentMethod) => request("/api/checkout", {
      method: "POST",
      body: JSON.stringify({ items, paymentMethod })
    })
  };
}
