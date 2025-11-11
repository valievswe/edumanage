import type { App } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import { routes } from "./routes";
import { useAuthStore } from "@/utils/authStore";
import { store } from "../pinia";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore(store);

  if (authStore.token && !authStore.admin) {
    await authStore.fetchProfile();
  }

  if (to.meta.unauthenticatedOnly && authStore.isAuthenticated) {
    return { path: "/dashboard" };
  }

  if (!to.meta.public && !authStore.isAuthenticated) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }

  return true;
});

export default function (app: App) {
  app.use(router);
}

export { router };
