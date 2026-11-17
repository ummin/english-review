import { expect, test, type Page } from '@playwright/test'
import { GOOD_CODE, installFakeSupabase, type Fake } from './fakeSupabase'
import { todayKey } from '../../src/lib/dates'

const errors: string[] = []
let fake: Fake
test.beforeEach(async ({ page }) => {
  errors.length = 0
  page.on('pageerror', (e) => errors.push(e.message))
  fake = await installFakeSupabase(page)
  await page.goto('/')
  await expect(page.getByTestId('streak')).toBeVisible()
})
test.afterEach(() => expect(errors).toEqual([]))

const EMAIL = 'yoon@example.com'
async function login(page: Page, email = EMAIL) {
  await page.goto('/#/account')
  await page.getByTestId('email').fill(email)
  await page.getByTestId('send-code').click()
  await page.getByTestId('code').fill(GOOD_CODE)
  await page.getByTestId('verify').click()
  await expect(page.getByTestId('who-name')).toHaveText(email)
}
const home = (page: Page) => page.getByRole('tab', { name: '홈' }).click()
const AI = JSON.stringify({ cards: [{ en: 'Where is the boarding gate?', ko: '탑승구가 어디예요?', native: [5, 11], subs: [{ kind: 'reply', en: 'On your left.', ko: '왼쪽이에요.' }] }] })
async function addVideo(page: Page, title = '공항 영어') {
  await page.getByTestId('add-video').click()
  await page.getByTestId('title').fill(title)
  await page.getByTestId('yt').fill('dQw4w9WgXcQ')
  await page.getByTestId('paste').fill(AI)
  await page.getByTestId('check').click()
  await page.getByTestId('add-cards').click()
  await page.getByTestId('save').click()
  await expect(page.getByText('Where is the boarding gate?').first()).toBeVisible()
}

test('로그인 전에는 서버로 데이터 요청을 보내지 않는다', async ({ page }) => {
  await page.getByTestId('go-account').click()
  await expect(page.getByTestId('login-google')).toBeEnabled()
  await home(page)
  await page.getByRole('button', { name: '문장 보기' }).click()
  await page.getByRole('button', { name: /완료/ }).first().click()
  expect(fake.restCalls).toEqual([])
})

test('이메일 코드 로그인: 형식 검사 → 코드 전송 → 틀린 코드 → 맞는 코드', async ({ page }) => {
  await page.getByTestId('go-account').click()
  const send = page.getByTestId('send-code')
  await expect(send).toBeDisabled()
  await page.getByTestId('email').fill('abc')
  await expect(page.getByText('이메일 형식을 확인해 주세요.')).toBeVisible()
  await page.getByTestId('email').fill(EMAIL)
  await send.click()
  await expect(page.getByTestId('code-sent')).toContainText(EMAIL)
  expect(fake.otpRequests).toEqual([EMAIL])
  await expect(page.getByTestId('resend')).toBeDisabled() // 연속 전송 방지
  const verify = page.getByTestId('verify')
  await expect(verify).toBeDisabled()
  await page.getByTestId('code').fill('12ab')
  await expect(verify).toBeDisabled() // 숫자 6자리 이상만
  await page.getByTestId('code').fill('999999')
  await verify.click()
  await expect(page.getByTestId('auth-error')).toContainText('코드가 맞지 않거나')
  await expect(page.getByTestId('who-name')).toHaveCount(0)
  await page.getByTestId('code').fill(GOOD_CODE)
  await verify.click()
  await expect(page.getByTestId('who-name')).toHaveText(EMAIL)
  expect(fake.verifyRequests.map((v) => v.token)).toEqual(['999999', GOOD_CODE])
})

test('메일을 너무 자주 보냈을 때와 허용되지 않은 이메일일 때 알기 쉬운 안내가 나온다', async ({ page }) => {
  await page.getByTestId('go-account').click()
  await page.getByTestId('email').fill(EMAIL)
  fake.otpError = { status: 429, code: 'over_email_send_rate_limit', msg: 'email rate limit exceeded' }
  await page.getByTestId('send-code').click()
  await expect(page.getByTestId('auth-error')).toContainText('너무 자주')
  fake.otpError = { status: 400, code: 'validation_failed', msg: 'Email address not authorized' }
  await page.getByTestId('send-code').click()
  await expect(page.getByTestId('auth-error')).toContainText('이 이메일로는 아직')
  await expect(page.getByTestId('code-sent')).toHaveCount(0)
})

test('로그인하면 내 계정 데이터로 바뀐다(가짜 시드 기록 없음), 새로고침해도 로그인이 유지된다', async ({ page }) => {
  await expect(page.getByTestId('streak')).toHaveText('2') // 로그인 전: 이 기기의 샘플 기록
  await login(page)
  await home(page)
  await expect(page.getByTestId('streak')).toHaveText('0') // 계정은 처음이라 기록 없음
  await expect(page.getByText('어제 공부한 문장')).toHaveCount(0)
  await expect(page.getByTestId('go-account')).toContainText(EMAIL)
  await page.reload()
  await expect(page.getByTestId('go-account')).toContainText(EMAIL)
  await expect(page.getByTestId('streak')).toHaveText('0')
})

test('로그인 중 공부 기록은 DB에 내 id로 저장되고 새로고침해도 남는다', async ({ page }) => {
  await login(page)
  await home(page)
  await page.getByRole('button', { name: '문장 보기' }).click()
  await page.getByRole('button', { name: /완료/ }).first().click()
  await expect.poll(() => fake.tables.progress!.length).toBe(1)
  const row = fake.tables.progress![0]!
  expect(row).toMatchObject({ user_id: 'user-1', video_id: 'SAMPLE00001', star: false })
  expect(row.dates).toEqual([todayKey()])
  await page.reload()
  await home(page)
  await expect(page.getByTestId('streak')).toHaveText('1')
  await expect(page.getByText('1 / 10 문장')).toBeVisible()
})

test('목표 변경이 DB 설정에 저장되고 다시 불러온다', async ({ page }) => {
  await login(page)
  await home(page)
  await page.getByRole('button', { name: '목표 늘리기' }).click()
  await expect.poll(() => fake.tables.settings![0]?.daily_goal).toBe(11)
  await page.reload()
  await expect(page.getByText('0 / 11 문장')).toBeVisible()
})

test('영상 등록·수정·삭제가 DB에 반영된다', async ({ page }) => {
  await login(page)
  await home(page)
  await expect(page.getByTestId('local-notice')).toHaveCount(0)
  await addVideo(page)
  expect(fake.tables.videos).toHaveLength(1)
  expect(fake.tables.videos![0]).toMatchObject({ user_id: 'user-1', youtube_id: 'dQw4w9WgXcQ', title: '공항 영어' })
  expect((fake.tables.videos![0]!.cards as unknown[]).length).toBe(1)
  await page.reload()
  await home(page)
  await expect(page.getByRole('heading', { name: '공항 영어' })).toBeVisible()
  await page.getByRole('button', { name: '공항 영어 편집' }).click()
  await page.getByTestId('title').fill('공항·기내 영어')
  await page.getByTestId('save').click()
  await expect.poll(() => fake.tables.videos![0]!.title).toBe('공항·기내 영어')
  expect(fake.tables.videos).toHaveLength(1) // 같은 id 로 덮어쓴다
  await home(page)
  await page.getByRole('button', { name: '공항·기내 영어 편집' }).click()
  await page.getByTestId('del').click()
  await page.getByTestId('del-yes').click()
  await expect.poll(() => fake.tables.videos!.length).toBe(0)
})

test('사람마다 자기 데이터만 보인다(계정 분리)', async ({ page }) => {
  await login(page, 'a@example.com')
  await home(page)
  await addVideo(page, 'A의 영상')
  await page.getByRole('tab', { name: '홈' }).click()
  await page.getByTestId('go-account').click()
  await page.getByTestId('signout').click()
  await login(page, 'b@example.com')
  await home(page)
  await expect(page.getByRole('heading', { name: 'A의 영상' })).toHaveCount(0)
  await addVideo(page, 'B의 영상')
  expect(fake.tables.videos!.map((v) => [v.user_id, v.title])).toEqual([['user-1', 'A의 영상'], ['user-2', 'B의 영상']])
  await page.getByRole('tab', { name: '홈' }).click()
  await page.getByTestId('go-account').click()
  await page.getByTestId('signout').click()
  await login(page, 'a@example.com')
  await home(page)
  await expect(page.getByRole('heading', { name: 'A의 영상' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'B의 영상' })).toHaveCount(0)
})

test('로그아웃하면 이 기기 저장소로 돌아가고 서버 요청이 멈춘다', async ({ page }) => {
  await login(page)
  await page.getByTestId('signout').click()
  await expect(page.getByTestId('email')).toBeVisible()
  await home(page)
  await expect(page.getByTestId('streak')).toHaveText('2')
  const n = fake.restCalls.length
  await page.getByRole('button', { name: '문장 보기' }).click()
  await page.getByRole('button', { name: /완료/ }).first().click()
  expect(fake.restCalls.length).toBe(n)
  await page.reload()
  await home(page)
  await expect(page.getByTestId('go-account')).toContainText('로그인') // 로그아웃이 유지된다
})

test('로그인 전에 이 기기에 만든 영상은 안내가 뜨고, 계정으로 옮길 수 있다', async ({ page }) => {
  await page.getByTestId('add-video').click()
  await expect(page.getByTestId('local-notice')).toContainText('이 기기에만 저장')
  await page.getByRole('button', { name: '뒤로' }).click()
  await addVideo(page, '내 기기 영상')
  await login(page)
  await home(page)
  await expect(page.getByRole('heading', { name: '내 기기 영상' })).toHaveCount(0) // 계정에는 아직 없음
  await page.getByTestId('go-account').click()
  await expect(page.getByTestId('move-local')).toContainText('1개')
  await page.getByTestId('move-local-btn').click()
  await expect(page.getByTestId('move-local')).toHaveCount(0)
  expect(fake.tables.videos!.map((v) => v.title)).toEqual(['내 기기 영상'])
  await home(page)
  await expect(page.getByRole('heading', { name: '내 기기 영상' })).toBeVisible()
})

test('서버가 응답하지 않으면 불러오기 실패 화면과 다시 시도 버튼이 나온다', async ({ page }) => {
  await login(page)
  fake.failRest = true
  await page.reload()
  await expect(page.getByRole('alert').filter({ hasText: '불러오지 못했어요' })).toBeVisible()
  fake.failRest = false
  await page.getByTestId('retry').click()
  await expect(page.getByRole('tab', { name: '홈' })).toBeVisible()
  await home(page)
  await expect(page.getByTestId('streak')).toBeVisible()
})

test('저장이 실패하면 알려 주고, 영상은 목록에 잘못 남지 않는다', async ({ page }) => {
  await login(page)
  await home(page)
  fake.failRest = true
  await page.getByRole('button', { name: '목표 늘리기' }).click()
  await expect(page.getByRole('status').filter({ hasText: '목표를 저장하지 못했어요' })).toBeVisible()
  await page.getByTestId('add-video').click()
  await page.getByTestId('title').fill('실패할 영상')
  await page.getByTestId('yt').fill('dQw4w9WgXcQ')
  await page.getByTestId('paste').fill(AI)
  await page.getByTestId('check').click()
  await page.getByTestId('add-cards').click()
  await page.getByTestId('save').click()
  await expect(page.getByRole('alert').filter({ hasText: '저장하지 못했어요' })).toBeVisible()
  await expect(page).toHaveURL(/#\/video\/new$/) // 입력은 그대로
  await expect(page.getByTestId('title')).toHaveValue('실패할 영상')
  fake.failRest = false
  await page.getByTestId('save').click()
  await expect(page).toHaveURL(/#\/sent$/)
  expect(fake.tables.videos).toHaveLength(1)
})

test('로그인 화면이 가로로 넘치지 않는다', async ({ page }) => {
  await page.goto('/#/account')
  await page.getByTestId('email').fill('아주아주아주긴이메일아주아주아주긴이메일@example-domain-that-is-very-long.com')
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
})

test('메일 링크(?code=)로 돌아오면 로그인되고 주소가 깨끗해진다', async ({ page }) => {
  // 로그인 메일을 요청했던 브라우저라면 이 값이 이미 저장돼 있다(PKCE)
  await page.addInitScript(() => localStorage.setItem('er-auth-code-verifier', JSON.stringify('v'.repeat(60))))
  await page.goto('/?code=fakecode123')
  await page.getByTestId('go-account').click()
  await expect(page.getByTestId('who-name')).toHaveText('a@b.c')
  expect(page.url()).not.toContain('code=')
})

test('다른 브라우저에서 링크를 열어 확인 값이 없으면 로그인되지 않지만 앱은 멀쩡하다', async ({ page }) => {
  await page.goto('/?code=fakecode123')
  await expect(page.getByTestId('go-account')).toContainText('로그인')
  await expect(page.getByTestId('streak')).toBeVisible()
})

test('만료된 로그인 링크로 돌아오면 이유를 알려 주고 빈 화면이 되지 않는다', async ({ page }) => {
  await page.goto('about:blank') // 메일 링크는 새로 열리는 것과 같다
  await page.goto('/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired')
  await expect(page.getByTestId('callback-error')).toContainText('이미 사용됐거나 시간이 지났어요')
  await expect(page.getByTestId('callback-error')).toContainText('otp_expired')
  expect(page.url()).toContain('#/account')
  expect(page.url()).not.toContain('error')
  await expect(page.getByTestId('email')).toBeVisible() // 바로 메일을 다시 받을 수 있다
  await page.getByRole('tab', { name: '홈' }).click()
  await expect(page.getByTestId('streak')).toBeVisible()
})

test('오류가 주소 검색부분(?error=)으로 와도 같게 처리한다', async ({ page }) => {
  await page.goto('about:blank') // 메일 링크는 새로 열리는 것과 같다
  await page.goto('/?error=access_denied&error_code=otp_expired#/')
  await expect(page.getByTestId('callback-error')).toBeVisible()
  expect(page.url()).not.toContain('error')
})

test('알 수 없는 주소나 이상한 해시는 홈으로 보낸다', async ({ page }) => {
  await page.goto('about:blank') // 메일 링크는 새로 열리는 것과 같다
  await page.goto('/#/zzz/unknown')
  await expect(page.getByTestId('streak')).toBeVisible()
  await page.goto('about:blank') // 메일 링크는 새로 열리는 것과 같다
  await page.goto('/#access_token=abc&token_type=bearer')
  await expect(page.getByTestId('callback-error')).toContainText('처리하지 못했어요')
})

test('Google 로그인: 서비스 화면에 갔다가 돌아오면 로그인되고, 내 데이터는 계정에 저장된다', async ({ page }) => {
  await page.goto('/#/account')
  await page.getByTestId('login-google').click()
  await expect(page.getByTestId('go-account')).toContainText('g@example.com') // 로그인 뒤 홈으로 돌아온다
  await page.getByTestId('go-account').click()
  await expect(page.getByTestId('who-name')).toHaveText('g@example.com')
  await expect(page.getByText('Google 로그인')).toBeVisible()
  expect(fake.oauthRequests[0]).toMatchObject({ provider: 'google' })
  expect(fake.oauthRequests[0]!.redirectTo).toMatch(/^http:\/\/localhost:4173\/$/)
  expect(page.url()).not.toContain('code=')
  await home(page)
  await expect(page.getByTestId('go-account')).toContainText('g@example.com')
  await page.getByRole('button', { name: '목표 늘리기' }).click()
  await expect.poll(() => fake.tables.settings![0]?.user_id).toBe('user-g')
  await page.reload()
  await expect(page.getByTestId('go-account')).toContainText('g@example.com') // 새로고침 뒤에도 로그인 유지
})

test('카카오 로그인: 이메일이 없으면 닉네임으로 표시하고 닉네임 권한만 요청한다', async ({ page }) => {
  fake.oauthUser = { email: '', name: '카카오닉네임' }
  await page.goto('/#/account')
  await page.getByTestId('login-kakao').click()
  await expect(page.getByTestId('go-account')).toContainText('카카오닉네임')
  await page.getByTestId('go-account').click()
  await expect(page.getByTestId('who-name')).toHaveText('카카오닉네임')
  await expect(page.getByText('카카오 로그인')).toBeVisible()
  expect(fake.oauthRequests[0]).toMatchObject({ provider: 'kakao', scopes: 'profile_nickname' })
})

test('로그인 화면에서 취소하고 돌아오면 안내가 나오고 로그인되지 않는다', async ({ page }) => {
  fake.oauthResult = 'cancel'
  await page.goto('/#/account')
  await page.getByTestId('login-google').click()
  await expect(page.getByTestId('callback-error')).toContainText('취소됐거나')
  await expect(page.getByTestId('login-google')).toBeVisible()
  expect(page.url()).not.toContain('error')
})
