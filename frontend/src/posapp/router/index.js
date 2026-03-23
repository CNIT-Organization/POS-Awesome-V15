import { createRouter, createWebHistory } from "vue-router";
import { start, stop } from "../composables/useLoading.js";
import Home from "../Home.vue";

const routes = [
	{ path: "/", name: "home", component: Home },
	{
		path: "/invoice/:name",
		name: "invoice-details",
		component: () => import("../components/pos/SalesInvoiceDetailsPage.vue"),
	},
];

const router = createRouter({
	history: createWebHistory(),
	routes,
});

router.beforeEach((to, from, next) => {
	start("route");
	next();
});

router.afterEach(() => {
	stop("route");
});

router.onError(() => {
	stop("route");
});

export default router;
