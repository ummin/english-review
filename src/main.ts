import './lib/authCallback' // 가장 먼저: 주소에 붙은 로그인 결과를 라우터보다 먼저 읽는다
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import './styles/app.css'

createApp(App).use(createPinia()).use(router).mount('#app')
