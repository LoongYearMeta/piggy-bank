import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: Array<RouteRecordRaw> = [
	// 旧版页面
	// {
	// 	path: '/',
	// 	name: 'home',
	// 	component: () => import('../views/home.vue'),
	// },
	// {
	// 	path: '/query',
	// 	name: 'query',
	// 	component: () => import('../views/query.vue'),
	// },
	// 新版页面
	{
		path: '/',
		name: 'home',
		component: () => import('../views/bank/home-new.vue'),
	},
	{
		path: '/:pathMatch(.*)*',
		redirect: '/',
	},
];

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes,
});

export default router;
