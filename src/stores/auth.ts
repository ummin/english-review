import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type Provider = 'google' | 'kakao' | 'email'
export interface FakeUser { provider: Provider; name: string; email: string }

const K = 'er-sample:user'
const load = (): FakeUser | null => {
  try {
    const v = JSON.parse(localStorage.getItem(K) ?? 'null')
    return v && typeof v.name === 'string' && ['google', 'kakao', 'email'].includes(v.provider) ? v : null
  } catch { return null }
}

/**
 * 로그인 "미리보기"용 가짜 구현이다. 실제 계정과 연결되지 않고 이 기기에만 표시를 남긴다.
 * 5~6단계에서 Supabase 로그인으로 바꾼다.
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<FakeUser | null>(load())
  const loggedIn = computed(() => !!user.value)
  function signIn(provider: Provider, email = '') {
    const names = { google: 'Google 사용자', kakao: '카카오 사용자', email: email.split('@')[0] || '이메일 사용자' }
    user.value = { provider, name: names[provider], email }
    try { localStorage.setItem(K, JSON.stringify(user.value)) } catch { /* 무시 */ }
  }
  function signOut() {
    user.value = null
    try { localStorage.removeItem(K) } catch { /* 무시 */ }
  }
  return { user, loggedIn, signIn, signOut }
})
