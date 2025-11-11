export const routes = [
  { path: "/", redirect: "/dashboard" },
  {
    path: "/",
    component: () => import("@/layouts/default.vue"),
    meta: { requiresAuth: true },
    children: [
      {
        path: "dashboard",
        component: () => import("@/pages/dashboard.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "students",
        component: () => import("@/pages/students.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "subjects",
        component: () => import("@/pages/subjects.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "grades",
        component: () => import("@/pages/grades.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "years",
        component: () => import("@/pages/years.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "marks",
        component: () => import("@/pages/marks.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "monitoring",
        component: () => import("@/pages/monitoring.vue"),
        meta: { requiresAuth: true },
      },
    ],
  },
  {
    path: "/",
    component: () => import("@/layouts/blank.vue"),
    children: [
      {
        path: "login",
        component: () => import("@/pages/login.vue"),
        meta: { unauthenticatedOnly: true, public: true },
      },
      {
        path: "/:pathMatch(.*)*",
        component: () => import("@/pages/not-found.vue"),
        meta: { public: true },
      },
    ],
  },
];
