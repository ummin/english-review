import type { Page, Route } from '@playwright/test'

/**
 * 테스트용 가짜 Supabase. 실제 서버로 나가지 않고, 같은 주소로 가는 요청을 가로채서 대신 답한다.
 * 실제 DB의 RLS처럼 "토큰의 사용자 행만" 보이게 흉내 낸다.
 */
export const HOST = 'https://blysqzzhuidlqpwjczzw.supabase.co'

type Row = Record<string, unknown>
export interface Fake {
  tables: Record<string, Row[]>
  restCalls: { method: string; path: string; authed: boolean }[]
  rpcCalls: string[]
  deleted: string[]
  failRest: boolean // true 면 REST 요청이 모두 500
  oauthRequests: { provider: string | null; redirectTo: string | null; scopes: string | null }[]
  oauthResult: 'ok' | 'cancel'
  oauthUser: { email: string; name: string } | null
  nextUserId: string
}

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = (sub: string, email: string) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, email, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`
const userOf = (id: string, email: string) => ({ id, aud: 'authenticated', role: 'authenticated', email, app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' })
const sessionOf = (id: string, email: string) => ({ access_token: jwt(id, email), token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'refresh-' + id, user: userOf(id, email) })
const subOf = (auth: string | undefined) => {
  const t = auth?.replace(/^Bearer /, '') ?? ''
  try { return (JSON.parse(Buffer.from(t.split('.')[1] ?? '', 'base64url').toString()) as { sub?: string }).sub ?? null } catch { return null }
}

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' }
const json = (route: Route, status: number, body: unknown) => route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(body) })

export async function installFakeSupabase(page: Page): Promise<Fake> {
  const fake: Fake = { tables: { videos: [], progress: [], settings: [] }, restCalls: [], rpcCalls: [], deleted: [], failRest: false, oauthRequests: [], oauthResult: 'ok', oauthUser: { email: 'g@example.com', name: '홍길동' }, nextUserId: 'user-1' }
  const emailToId = new Map<string, string>()
  let seq = 0

  await page.route(`${HOST}/**`, async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const method = req.method()
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
    const path = url.pathname
    const body = req.postData() ? JSON.parse(req.postData()!) : null

    // ---- 로그인 ----
    if (path === '/auth/v1/authorize') {
      const to = url.searchParams.get('redirect_to') ?? 'http://localhost:4173/'
      fake.oauthRequests.push({ provider: url.searchParams.get('provider'), redirectTo: to, scopes: url.searchParams.get('scopes') })
      const back = new URL(to)
      if (fake.oauthResult === 'cancel') { back.searchParams.set('error', 'access_denied'); back.searchParams.set('error_description', 'user cancelled') }
      else back.searchParams.set('code', 'oauthcode')
      return route.fulfill({ status: 302, headers: { ...CORS, location: back.toString() } })
    }
    if (path === '/auth/v1/token') {
      const idFor = (email: string) => {
        if (!emailToId.has(email)) emailToId.set(email, seq++ ? `user-${seq}` : fake.nextUserId)
        return emailToId.get(email)!
      }
      if (url.searchParams.get('grant_type') === 'pkce' && fake.oauthUser && fake.oauthRequests.length) {
        const prov = fake.oauthRequests.at(-1)!.provider ?? 'google'
        const s = sessionOf(idFor(fake.oauthUser.email), fake.oauthUser.email)
        s.user.app_metadata = { provider: prov, providers: [prov] }
        s.user.user_metadata = { name: fake.oauthUser.name }
        return json(route, 200, s)
      }
      // 새로고침 토큰으로 같은 사람의 세션을 다시 준다
      const rid = String(body?.refresh_token ?? '').replace(/^refresh-/, '')
      const email = [...emailToId.entries()].find(([, id]) => id === rid)?.[0] ?? [...emailToId.keys()][0] ?? 'a@b.c'
      const s = sessionOf(idFor(email), email)
      s.user.app_metadata = { provider: 'google', providers: ['google'] }
      return json(route, 200, s)
    }
    if (path === '/auth/v1/logout') return route.fulfill({ status: 204, headers: CORS })
    if (path === '/auth/v1/user') return json(route, 200, userOf('user-1', 'a@b.c'))

    // ---- 데이터(PostgREST 흉내) ----
    if (path === '/rest/v1/rpc/get_shared_video') {
      if (!subOf(req.headers()['authorization'])) return json(route, 401, { code: '42501', message: 'permission denied for function get_shared_video' })
      if (fake.failRest) return json(route, 500, { message: 'server down' })
      fake.rpcCalls.push(body.code)
      const hit = fake.tables.videos!.find((r) => r.share_id && r.share_id === body.code)
      return json(route, 200, hit ? [{ title: hit.title, youtube_id: hit.youtube_id, cards: hit.cards }] : [])
    }
    if (path === '/rest/v1/rpc/delete_my_account') {
      const who = subOf(req.headers()['authorization'])
      if (!who) return json(route, 401, { code: '42501', message: 'permission denied for function delete_my_account' })
      if (fake.failRest) return json(route, 500, { message: 'server down' })
      fake.deleted.push(who)
      for (const t of Object.keys(fake.tables)) fake.tables[t] = fake.tables[t]!.filter((r) => r.user_id !== who)
      for (const [k, v] of emailToId) if (v === who) emailToId.delete(k)
      return route.fulfill({ status: 204, headers: CORS })
    }
    const m = path.match(/^\/rest\/v1\/(videos|progress|settings)$/)
    if (!m) return json(route, 404, { message: 'not found: ' + path })
    const table = m[1]!
    const uid = subOf(req.headers()['authorization'])
    const authed = !!uid
    fake.restCalls.push({ method, path, authed })
    if (fake.failRest) return json(route, 500, { message: 'server down' })
    if (!uid) return json(route, 401, { code: '42501', message: 'permission denied for table ' + table }) // anon 은 막힘
    const mine = () => fake.tables[table]!.filter((r) => r.user_id === uid)
    const keyCols = table === 'videos' ? ['user_id', 'id'] : table === 'progress' ? ['user_id', 'card_id'] : ['user_id']
    const filters = [...url.searchParams.entries()].filter(([, v]) => v.startsWith('eq.'))
    const match = (r: Row) => filters.every(([k, v]) => String(r[k]) === v.slice(3))

    if (method === 'GET') {
      let rows = mine().filter(match)
      const order = url.searchParams.getAll('order')
      for (const o of order.reverse()) rows = [...rows].sort((a, b) => (String(a[o]) < String(b[o]) ? -1 : String(a[o]) > String(b[o]) ? 1 : 0))
      const off = Number(url.searchParams.get('offset') ?? 0)
      const lim = Number(url.searchParams.get('limit') ?? 1_000_000)
      return json(route, 200, rows.slice(off, off + lim))
    }
    if (method === 'POST') {
      for (const r of Array.isArray(body) ? body : [body]) {
        if (r.user_id !== uid) return json(route, 403, { code: '42501', message: 'new row violates row-level security policy' })
        const i = fake.tables[table]!.findIndex((x) => keyCols.every((k) => x[k] === r[k]))
        if (i >= 0) fake.tables[table]![i] = { ...fake.tables[table]![i], ...r }
        else fake.tables[table]!.push({ ...r })
      }
      return route.fulfill({ status: 201, headers: CORS })
    }
    if (method === 'PATCH') {
      if (fake.failRest) return json(route, 500, { message: 'server down' })
      for (const r of mine().filter(match)) Object.assign(r, body)
      return route.fulfill({ status: 204, headers: CORS })
    }
    if (method === 'DELETE') {
      const del = new Set(mine().filter(match))
      fake.tables[table] = fake.tables[table]!.filter((r) => !del.has(r))
      return route.fulfill({ status: 204, headers: CORS })
    }
    return json(route, 405, { message: 'method not allowed' })
  })
  return fake
}

/** 로그인 화면에서 Google 로 로그인한다. (가짜 Google 이 돌려보내면 앱이 열린다) */
export async function loginGoogle(page: Page, fake: Fake, email = 'a@example.com') {
  fake.oauthResult = 'ok'
  fake.oauthUser = { email, name: email.split('@')[0]! }
  await page.getByTestId('login-google').click()
  await page.getByRole('tablist').waitFor()
}
