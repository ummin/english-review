import { expect, test } from '@playwright/test'
import { installFakeSupabase, loginGoogle, type Fake } from './fakeSupabase'

/** 배포본과 같은 빌드: 로그인하지 않으면 앱이 아예 보이지 않아야 한다. */
const errors: string[] = []
let fake: Fake
test.beforeEach(async ({ page }) => {
  errors.length = 0
  page.on('pageerror', (e) => errors.push(e.message))
  fake = await installFakeSupabase(page)
})
test.afterEach(() => expect(errors).toEqual([]))

const gate = (page: import('@playwright/test').Page) => page.getByTestId('login-gate')
const appVisible = (page: import('@playwright/test').Page) => page.getByRole('tablist').count()

test('로그인하지 않으면 로그인 화면만 보이고 앱 화면·탭·샘플은 없다', async ({ page }) => {
  await page.goto('/')
  await expect(gate(page)).toBeVisible()
  await expect(page.getByText('로그인이 필요해요')).toBeVisible()
  await expect(page.getByTestId('login-google')).toBeEnabled()
  await expect(page.getByTestId('login-kakao')).toHaveCount(0) // 로그인은 Google 하나로 통일
  await expect(page.getByTestId('email')).toHaveCount(0)
  await expect(page.getByTestId('send-code')).toHaveCount(0)
  // 로그인 전에도 앱 소개와 약관 링크가 보인다 (Google 앱 게시 심사 요건)
  await expect(page.getByText('유튜브 영어회화 영상에서 뽑은 표현')).toBeVisible()
  await expect(page.getByRole('link', { name: '개인정보처리방침' })).toHaveAttribute('href', /privacy\.html$/)
  await expect(page.getByRole('link', { name: '이용약관' })).toHaveAttribute('href', /terms\.html$/)
  await expect(page.getByTestId('login-google')).toBeVisible()
  expect(await appVisible(page)).toBe(0) // 하단 탭이 없다
  await expect(page.getByTestId('streak')).toHaveCount(0)
  await expect(page.getByText('샘플 · 여행 영어 기본 표현')).toHaveCount(0)
  await expect(page.getByTestId('add-video')).toHaveCount(0)
  expect(fake.restCalls).toEqual([]) // 서버에 데이터를 요청하지도 않는다
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
})

test('주소를 직접 입력해 들어가도 로그인 화면이 나온다', async ({ page }) => {
  for (const hash of ['#/video/new', '#/sent', '#/review', '#/share/SAMPLE00001', '#/account', '#/video/SAMPLE00001']) {
    await page.goto('about:blank')
    await page.goto('/' + hash)
    await expect(gate(page), hash).toBeVisible()
    await expect(page.getByTestId('save'), hash).toHaveCount(0)
    await expect(page.getByTestId('title'), hash).toHaveCount(0)
  }
  expect(fake.restCalls).toEqual([])
})

test('이 기기에 남아 있던 예전 기록이 있어도 로그인 전에는 보이지 않는다', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('er-sample:videos', JSON.stringify([{ id: 'old', youtubeId: 'dQw4w9WgXcQ', title: '예전에 만든 영상', createdAt: 5, cards: [] }]))
  })
  await page.goto('/')
  await expect(gate(page)).toBeVisible()
  await expect(page.getByText('예전에 만든 영상')).toHaveCount(0)
})

test('Google로 로그인하면 앱이 열리고, 새로고침해도 유지된다', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('login-google').click()
  await expect(page.getByTestId('streak')).toBeVisible()
  await expect(gate(page)).toHaveCount(0)
  await expect(page.getByRole('tab')).toHaveCount(4)
  await expect(page.getByTestId('go-account')).toContainText('g@example.com')
  await expect(page.getByTestId('streak')).toHaveText('0') // 내 계정의 기록(처음이라 0)
  await page.reload()
  await expect(page.getByTestId('streak')).toBeVisible()
  await expect(gate(page)).toHaveCount(0)
})

test('개인정보처리방침과 이용약관 페이지는 로그인 없이 열리고 문의 메일이 있다', async ({ page }) => {
  for (const f of ['privacy', 'terms']) {
    await page.goto(`/${f}.html`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: 'yhoo13579@gmail.com' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
  }
  await page.goto('/privacy.html')
  await expect(page.getByText('계정 삭제')).toBeVisible()
  expect(fake.restCalls).toEqual([])
})

test('로그인 뒤에 만든 데이터는 계정에 저장되고, 로그아웃하면 다시 로그인 화면이 된다', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('login-google').click()
  await expect(page.getByTestId('streak')).toBeVisible()
  await page.getByTestId('add-video').click()
  await page.getByTestId('title').fill('공항 영어')
  await page.getByTestId('yt').fill('dQw4w9WgXcQ')
  await page.getByTestId('paste').fill(JSON.stringify({ cards: [{ en: 'Where is the gate?', ko: '게이트가 어디예요?' }] }))
  await page.getByTestId('check').click()
  await page.getByTestId('add-cards').click()
  await expect(page.getByTestId('local-notice')).toHaveCount(0) // 로그인 상태라 "이 기기에만 저장" 안내가 없다
  await page.getByTestId('save').click()
  await expect(page.getByText('Where is the gate?').first()).toBeVisible()
  expect(fake.tables.videos).toHaveLength(1)
  await page.getByRole('tab', { name: '홈' }).click()
  await page.getByTestId('go-account').click()
  await page.getByTestId('signout').click()
  await expect(gate(page)).toBeVisible()
  await expect(page.getByText('공항 영어')).toHaveCount(0)
  await expect(page.getByRole('tab')).toHaveCount(0)
  const n = fake.restCalls.length
  await page.waitForTimeout(300)
  expect(fake.restCalls.length).toBe(n)
  await page.reload()
  await expect(gate(page)).toBeVisible() // 새로고침해도 로그인 화면
})

test('다른 사람으로 로그인하면 이전 사람의 영상이 보이지 않는다', async ({ page }) => {
  await page.goto('/')
  await loginGoogle(page, fake, 'a@example.com')
  await page.getByTestId('add-video').click()
  await page.getByTestId('title').fill('A의 영상')
  await page.getByTestId('yt').fill('dQw4w9WgXcQ')
  await page.getByTestId('paste').fill(JSON.stringify({ cards: [{ en: 'Hello', ko: '안녕' }] }))
  await page.getByTestId('check').click()
  await page.getByTestId('add-cards').click()
  await page.getByTestId('save').click()
  await page.getByRole('tab', { name: '홈' }).click()
  await page.getByTestId('go-account').click()
  await page.getByTestId('signout').click()
  await loginGoogle(page, fake, 'b@example.com')
  await page.getByRole('tab', { name: '홈' }).click()
  await expect(page.getByTestId('streak')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'A의 영상' })).toHaveCount(0)
})

test('로그인이 실패하거나 취소되면 로그인 화면에 안내가 나온다', async ({ page }) => {
  fake.oauthResult = 'cancel'
  await page.goto('/')
  await page.getByTestId('login-google').click()
  await expect(page.getByTestId('callback-error')).toContainText('취소됐거나')
  await expect(gate(page)).toBeVisible()
  await page.goto('about:blank')
  await page.goto('/#error=access_denied&error_code=otp_expired&error_description=x')
  await expect(page.getByTestId('callback-error')).toContainText('이미 사용됐거나')
  await expect(gate(page)).toBeVisible()
})

test('로그인 화면을 다시 불러오기 전 잠깐은 앱 내용이 아니라 불러오는 중만 보인다', async ({ page }) => {
  // 로그인 확인이 늦어져도 앱 내용이 먼저 비치지 않는다
  await page.route('**/auth/v1/**', async (r) => { await new Promise((res) => setTimeout(res, 800)); await r.fallback() })
  await page.goto('/')
  await expect(page.getByTestId('streak')).toHaveCount(0)
  await expect(page.getByRole('tablist')).toHaveCount(0)
  await expect(gate(page)).toBeVisible()
})
