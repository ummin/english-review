import { rememberReturn } from '../lib/returnTo'
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Session } from '@supabase/supabase-js'
import { getSupabase } from '../lib/supabase'
import { authCallbackError } from '../lib/authCallback'
import { setStorage } from '../storage'
import { createSampleStorage } from '../storage/sample'
import { createSupabaseStorage } from '../storage/supabase'

export interface User { id: string; email: string; label: string; provider: string }
export type OAuthProvider = 'google' | 'kakao'

function toUser(u: NonNullable<Session['user']>): User {
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>
  const name = [meta.name, meta.full_name, meta.nickname, meta.preferred_username].find((v): v is string => typeof v === 'string' && !!v.trim())
  const provider = (u.app_metadata?.provider as string | undefined) ?? 'email'
  return { id: u.id, email: u.email ?? '', provider, label: u.email || name || (provider === 'kakao' ? '카카오 사용자' : '사용자') }
}

/** Supabase 오류를 사람이 읽을 말로 바꾼다. */
export function friendlyAuthError(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e ?? '')
  const code = (e as { code?: string; status?: number } | null)?.code ?? ''
  const status = (e as { status?: number } | null)?.status
  if (code === 'over_email_send_rate_limit' || status === 429 || /rate limit/i.test(m)) return '메일을 너무 자주 보냈어요. 잠시(몇 분) 뒤에 다시 시도해 주세요.'
  if (/provider is not enabled|unsupported provider/i.test(m)) return '이 로그인 방식은 아직 켜져 있지 않아요.'
  if (/email address not authorized/i.test(m)) return '이 이메일로는 아직 코드를 보낼 수 없어요. 계정 주인 이메일로 시도해 주세요.'
  if (code === 'otp_expired' || /expired|invalid/i.test(m)) return '코드가 맞지 않거나 시간이 지났어요. 메일을 다시 받아 주세요.'
  if (/fetch|network|failed to/i.test(m)) return '인터넷 연결을 확인하고 다시 시도해 주세요.'
  return '문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.'
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  /** 메일 링크로 돌아왔을 때 실패했다면 그 이유(오류 코드) */
  const callbackError = ref<string | null>(authCallbackError)
  const loggedIn = computed(() => !!user.value)
  let started = false

  /** 세션에 맞는 저장소로 바꾼 뒤 사용자 상태를 갱신한다. */
  function apply(session: Session | null) {
    const u = session?.user
    if (u) {
      setStorage(createSupabaseStorage(getSupabase(), u.id))
      if (user.value?.id !== u.id) user.value = toUser(u)
    } else {
      setStorage(createSampleStorage())
      user.value = null
    }
  }

  /** 앱이 시작될 때 한 번: 저장된 로그인 확인 + 이후 변화 구독 */
  async function init() {
    if (started) return
    started = true
    const sb = getSupabase()
    try {
      const { data } = await sb.auth.getSession()
      apply(data.session)
    } catch {
      apply(null)
    }
    // 콜백 안에서 다른 Supabase 호출을 기다리면 멈출 수 있어, 상태만 바꾼다.
    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') apply(null)
      else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') apply(session)
    })
  }

  /** 이메일로 인증 코드를 보낸다. */
  async function requestCode(email: string) {
    const { error } = await getSupabase().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: `${location.origin}${import.meta.env.BASE_URL}` },
    })
    if (error) throw error
  }
  /** 받은 코드로 로그인한다. */
  async function verifyCode(email: string, token: string) {
    const { data, error } = await getSupabase().auth.verifyOtp({ email, token, type: 'email' })
    if (error) throw error
    apply(data.session)
  }
  /** Google·카카오 로그인. 해당 서비스의 로그인 화면으로 이동했다가 이 앱으로 돌아온다. */
  async function signInWith(provider: OAuthProvider) {
    rememberReturn()
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${location.origin}${import.meta.env.BASE_URL}`,
        ...(provider === 'google' ? { queryParams: { prompt: 'select_account' } } : {}),
        ...(provider === 'kakao' ? { scopes: 'profile_nickname' } : {}),
      },
    })
    if (error) throw error
  }
  async function signOut() {
    try { await getSupabase().auth.signOut({ scope: 'local' }) } catch { /* 네트워크가 없어도 이 기기에서는 로그아웃 */ }
    apply(null)
  }

  return { user, callbackError, loggedIn, init, requestCode, verifyCode, signInWith, signOut }
})
