const STORAGE_KEY = "zaabnua.session";

export function createAuthRepository() {
  return {
    saveSession(session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      return session.user;
    },
    updateUser(user) {
      const session = this.getSession();
      if (!session) return null;
      const nextSession = { ...session, user };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      return user;
    },
    getToken() {
      return this.getSession()?.token ?? "";
    },
    getSession() {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    },
    getUser() {
      return this.getSession()?.user ?? null;
    },
    logout() {
      localStorage.removeItem(STORAGE_KEY);
    }
  };
}
