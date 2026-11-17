import type { Page, Route } from '@playwright/test'

/**
 * 테스트용 가짜 Supabase. 실제 서버로 나가지 않고, 같은 주소로 가는 요청을 가로채서 대신 답한다.
 * 실제 DB의 RLS처럼 "토큰의 사용자 행만" 보이게 흉내 낸다.
 */
export const HOST = 'https://blysqzzhuidlqpwjczzw.supabase.co'
export const GOOD_CODE = '123456'

type Row = Record<string, unknown>
export interface Fake {
  tables: Record<string, Row[]>
  otpRequests: string[]
  verifyRequests: { email: string; token: string }[]
  restCalls: { method: string; path: string; authed: boolean }[]
  failRest: boolean // true 면 REST 요청이 모두 500
  otpError: null | { status: number; code: string; msg: string }
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
  const fake: Fake = { tables: { videos: [], progress: [], settings: [] }, otpRequests: [], verifyRequests: [], restCalls: [], failRest: false, otpError: null, nextUserId: 'user-1' }
  const emailToId = new Map<string, string>()

  await page.route(`${HOST}/**`, async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const method = req.method()
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
    const path = url.pathname
    const body = req.postData() ? JSON.parse(req.postData()!) : null

    // ---- 로그인 ----
    if (path === '/auth/v1/otp') {
      if (fake.otpError) return json(route, fake.otpError.status, { code: fake.otpError.code, msg: fake.otpError.msg, error_code: fake.otpError.code })
      fake.otpRequests.push(body.email)
      return json(route, 200, {})
    }
    if (path === '/auth/v1/verify') {
      fake.verifyRequests.push({ email: body.email, token: body.token })
      if (body.token !== GOOD_CODE) return json(route, 403, { code: 'otp_expired', error_code: 'otp_expired', msg: 'Token has expired or is invalid' })
      if (!emailToId.has(body.email)) emailToId.set(body.email, emailToId.size ? `user-${emailToId.size + 1}` : fake.nextUserId)
      return json(route, 200, sessionOf(emailToId.get(body.email)!, body.email))
    }
    if (path === '/auth/v1/token') {
      const id = [...emailToId.values()][0] ?? fake.nextUserId
      const email = [...emailToId.keys()][0] ?? 'a@b.c'
      return json(route, 200, sessionOf(id, email))
    }
    if (path === '/auth/v1/logout') return route.fulfill({ status: 204, headers: CORS })
    if (path === '/auth/v1/user') return json(route, 200, userOf('user-1', 'a@b.c'))

    // ---- 데이터(PostgREST 흉내) ----
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
    if (method === 'DELETE') {
      const del = new Set(mine().filter(match))
      fake.tables[table] = fake.tables[table]!.filter((r) => !del.has(r))
      return route.fulfill({ status: 204, headers: CORS })
    }
    return json(route, 405, { message: 'method not allowed' })
  })
  return fake
}
