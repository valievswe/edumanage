import { defineStore } from "pinia";
import api from "@/utils/api";
import type { Admin } from "@/utils/types";

const TOKEN_KEY = "klsbot_token";

interface Credentials {
  email: string;
  password: string;
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    admin: null as Admin | null,
    token: localStorage.getItem(TOKEN_KEY) || "",
    loadingProfile: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
  },
  actions: {
    async login(credentials: Credentials) {
      const { data } = await api.post("/api/admin/login", credentials);
      this.token = data.token;
      this.admin = data.admin;
      localStorage.setItem(TOKEN_KEY, data.token);
    },
    async fetchProfile() {
      if (!this.token || this.loadingProfile || this.admin) return;
      this.loadingProfile = true;
      try {
        const { data } = await api.get<Admin>("/api/admin/profile");
        this.admin = data;
      } catch {
        this.logout();
      } finally {
        this.loadingProfile = false;
      }
    },
    logout() {
      this.token = "";
      this.admin = null;
      localStorage.removeItem(TOKEN_KEY);
    },
  },
});
