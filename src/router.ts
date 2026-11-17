import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import SentView from './views/SentView.vue'
import ReviewView from './views/ReviewView.vue'
import StarView from './views/StarView.vue'
import VideoEditView from './views/VideoEditView.vue'
import ShareView from './views/ShareView.vue'
import AccountView from './views/AccountView.vue'

// 해시 주소(#/...)를 써서 GitHub Pages에서 새로고침해도 404가 나지 않게 한다.
export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/sent', name: 'sent', component: SentView },
    { path: '/review', name: 'review', component: ReviewView },
    { path: '/star', name: 'star', component: StarView },
    { path: '/video/new', name: 'video-new', component: VideoEditView },
    { path: '/video/:id', name: 'video-edit', component: VideoEditView },
    { path: '/share/:id', name: 'share', component: ShareView },
    { path: '/account', name: 'account', component: AccountView },
    { path: '/:pathMatch(.*)*', redirect: '/' }, // 알 수 없는 주소는 홈으로 (빈 화면 방지)
  ],
  scrollBehavior: () => ({ top: 0 }),
})
