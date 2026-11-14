import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'

// 해시 주소(#/...)를 써서 GitHub Pages에서 새로고침해도 404가 나지 않게 한다.
export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [{ path: '/', name: 'home', component: HomeView }],
})
