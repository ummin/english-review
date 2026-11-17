import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { GOOD_CODE, installFakeSupabase, type Fake } from './fakeSupabase'

const errors: string[] = []
let fake: Fake
test.beforeEach(async ({ page }) => {
  errors.length = 0
  page.on('pageerror', (e) => errors.push(e.message))
  fake = await installFakeSupabase(page)
})
test.afterEach(() => expect(errors).toEqual([]))

const AI = JSON.stringify({ cards: [{ en: 'Where is the boarding gate?', ko: '탑승구가 어디예요?', native: [5, 11], subs: [{ kind: 'reply', en: 'On your left.', ko: '왼쪽이에요.' }] }] })
async function login(page: Page, email: string) {
  await page.getByTestId('email').fill(email)
  await page.getByTestId('send-code').click()
  await page.getByTestId('code').fill(GOOD_CODE)
  await page.getByTestId('verify').click()
  await expect(page.getByRole('tablist')).toBeVisible()
}
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
const tab = (page: Page, name: string) => page.getByRole('tab', { name }).click()
async function signOut(page: Page) {
  await tab(page, '홈')
  await page.getByTestId('go-account').click()
  await page.getByTestId('signout').click()
  await expect(page.getByTestId('login-gate')).toBeVisible()
}
/** A 로 영상을 만들고 공유 링크를 켠 뒤 코드를 돌려준다. */
async function aShares(page: Page): Promise<string> {
  await page.goto('/')
  await login(page, 'a@example.com')
  await addVideo(page)
  await tab(page, '홈')
  await page.getByRole('button', { name: '공항 영어 공유' }).click()
  await page.getByTestId('link-switch').check()
  const link = await page.getByTestId('link').inputValue()
  expect(link).toMatch(/#\/s\/[a-z0-9]{12}$/)
  return link.split('#/s/')[1]!
}

test('공유 링크를 켜면 주소가 나오고 DB에 코드가 저장된다, 끄면 지워진다', async ({ page }) => {
  const code = await aShares(page)
  expect(fake.tables.videos![0]!.share_id).toBe(code)
  await page.reload()
  await expect(page.getByTestId('gate')).toHaveCount(0)
  await page.goto('/#/sent')
  await tab(page, '홈')
  await page.getByRole('button', { name: '공항 영어 공유' }).click()
  await expect(page.getByTestId('link')).toHaveValue(new RegExp(code + '$')) // 새로고침해도 같은 링크
  await page.getByTestId('link-switch').uncheck()
  await expect(page.getByTestId('link')).toHaveCount(0)
  expect(fake.tables.videos![0]!.share_id).toBeNull()
  await page.getByTestId('link-switch').check()
  expect(fake.tables.videos![0]!.share_id).toMatch(/^[a-z0-9]{12}$/)
})

test('영상을 수정해 저장해도 공유 링크는 그대로다', async ({ page }) => {
  const code = await aShares(page)
  await page.goBack()
  await tab(page, '홈')
  await page.getByRole('button', { name: '공항 영어 편집' }).click()
  await page.getByTestId('title').fill('공항 영어 2')
  await page.getByTestId('save').click()
  await expect.poll(() => fake.tables.videos![0]!.title).toBe('공항 영어 2')
  expect(fake.tables.videos![0]!.share_id).toBe(code)
})

test('다른 사람이 링크를 열면 로그인 뒤 미리보기가 나오고, 담으면 내 영상이 된다', async ({ page }) => {
  const code = await aShares(page)
  await signOut(page)
  await page.goto('about:blank')
  await page.goto('/#/s/' + code)
  await expect(page.getByTestId('login-gate')).toBeVisible() // 로그인 전에는 내용이 보이지 않는다
  await expect(page.getByTestId('shared-title')).toHaveCount(0)
  expect(fake.rpcCalls).toEqual([])
  await login(page, 'b@example.com')
  await expect(page.getByTestId('shared-title')).toHaveText('공항 영어') // 링크 주소가 유지된다
  await expect(page.getByTestId('shared-cards')).toContainText('Where is the boarding gate?')
  await page.getByTestId('shared-add').click()
  await expect(page.getByText('Where is the boarding gate?').first()).toBeVisible()
  const b = fake.tables.videos!.filter((r) => r.user_id !== 'user-1')
  expect(b).toHaveLength(1)
  expect(b[0]!.share_id ?? null).toBeNull() // 받은 영상은 다시 공유 상태가 아니다
  const a = fake.tables.videos!.find((r) => r.user_id === 'user-1')!
  expect(b[0]!.id).not.toBe(a.id)
  expect(JSON.stringify(b[0]!.cards)).not.toContain(String(a.id)) // 카드 id 도 새로 만든다
  expect(fake.tables.progress!.filter((r) => r.user_id !== 'user-1')).toHaveLength(0)
})

test('구글 로그인으로 돌아와도 공유 링크 화면으로 이어진다', async ({ page }) => {
  fake.tables.videos!.push({ user_id: 'user-x', id: 'vx', youtube_id: 'dQw4w9WgXcQ', title: '남의 영상', created_ms: 1, share_id: 'abcdef123456', cards: [{ id: 'vx-e1', en: 'Hi there', ko: '안녕', note: '', stress: [], native: null, explain: null, role: null, subs: [] }] })
  await page.goto('/#/s/abcdef123456')
  await page.getByTestId('login-google').click()
  await expect(page.getByTestId('shared-title')).toHaveText('남의 영상')
  expect(page.url()).toMatch(/#\/s\/abcdef123456$/)
})

test('공유를 끄거나 없는 코드·이상한 코드는 "찾을 수 없는 링크"이다', async ({ page }) => {
  const code = await aShares(page)
  await page.getByTestId('link-switch').uncheck()
  await expect(page.getByTestId('link')).toHaveCount(0)
  await page.goto('about:blank')
  await page.goto('/#/s/' + code)
  await expect(page.getByTestId('shared-none')).toBeVisible()
  await page.goto('about:blank')
  await page.goto('/#/s/zzzzzzzzzzzz')
  await expect(page.getByTestId('shared-none')).toBeVisible()
  const n = fake.rpcCalls.length
  await page.goto('about:blank')
  await page.goto('/#/s/BAD!')
  await expect(page.getByTestId('login-gate').or(page.getByTestId('shared-none')).or(page.getByTestId('streak'))).toBeVisible() // 주소가 안 맞으면 홈으로 간다
  expect(fake.rpcCalls.length).toBe(n)
})

test('내가 공유한 링크를 내가 열면 "내가 공유한 영상" 안내가 나온다', async ({ page }) => {
  const code = await aShares(page)
  await page.goto('about:blank')
  await page.goto('/#/s/' + code)
  await expect(page.getByTestId('shared-mine')).toBeVisible()
  await expect(page.getByTestId('shared-add')).toHaveCount(0)
})

test('서버 오류면 안내와 다시 시도가 나온다', async ({ page }) => {
  fake.tables.videos!.push({ user_id: 'user-x', id: 'vx', youtube_id: 'dQw4w9WgXcQ', title: '남의 영상', created_ms: 1, share_id: 'abcdef123456', cards: [] })
  await page.goto('/')
  await login(page, 'a@example.com')
  fake.failRest = true
  await page.goto('about:blank')
  await page.goto('/#/s/abcdef123456')
  // 데이터 불러오기부터 실패할 수 있으므로 어느 쪽이든 앱이 멈추지 않고 재시도를 안내한다
  await expect(page.getByTestId('shared-error').or(page.getByTestId('retry'))).toBeVisible()
  fake.failRest = false
  await page.getByTestId('shared-error').or(page.getByTestId('retry')).click()
  await expect(page.getByTestId('shared-title')).toHaveText('남의 영상')
})

test('샘플 영상은 링크 공유를 막는다', async ({ page }) => {
  await page.goto('/')
  await login(page, 'a@example.com')
  await page.getByRole('button', { name: /샘플.*공유/ }).click()
  await expect(page.getByTestId('share-link-off')).toContainText('샘플')
  await expect(page.getByTestId('link-switch')).toHaveCount(0)
})

test('백업: 파일로 저장하고, 지운 뒤 불러오면 영상과 기록이 돌아온다', async ({ page }) => {
  await page.goto('/')
  await login(page, 'a@example.com')
  await addVideo(page)
  await page.getByRole('button', { name: /완료/ }).first().click()
  await tab(page, '홈')
  await page.getByTestId('go-account').click()
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('backup-save').click()])
  expect(dl.suggestedFilename()).toMatch(/^영어회화복습장-백업-\d{4}-\d{2}-\d{2}\.json$/)
  const file = (await dl.path())!
  const data = JSON.parse(readFileSync(file, 'utf8'))
  expect(data).toMatchObject({ app: 'english-review-backup', version: 1 })
  expect(data.videos).toHaveLength(1)
  expect(Object.keys(data.progress).length).toBeGreaterThan(0)
  expect(JSON.stringify(data)).not.toMatch(/user-1|a@example/) // 계정 정보는 들어 있지 않다
  // 지우기
  await page.goto('/#/sent')
  await tab(page, '홈')
  await page.getByRole('button', { name: '공항 영어 편집' }).click()
  await page.getByTestId('del').click()
  await page.getByTestId('del-yes').click()
  await expect(page.getByRole('heading', { name: '공항 영어' })).toHaveCount(0)
  // 불러오기
  await page.getByTestId('go-account').click()
  await page.getByTestId('backup-file').setInputFiles(file)
  await expect(page.getByText(/영상 1개와 기록 \d+개를 불러왔어요/)).toBeVisible()
  await tab(page, '홈')
  await expect(page.getByRole('heading', { name: '공항 영어' })).toBeVisible()
  expect(fake.tables.progress!.length).toBe(Object.keys(data.progress).length)
})

test('백업: 이상한 파일은 안내만 하고 아무것도 바꾸지 않는다', async ({ page }) => {
  await page.goto('/')
  await login(page, 'a@example.com')
  await page.getByTestId('go-account').click()
  const before = JSON.stringify(fake.tables)
  const put = (name: string, body: string) => page.getByTestId('backup-file').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(body) })
  await put('x.json', '이건 JSON이 아니에요')
  await expect(page.getByTestId('restore-error')).toContainText('JSON')
  await put('y.json', JSON.stringify({ app: 'other' }))
  await expect(page.getByTestId('restore-error')).toContainText('백업 파일이 아니에요')
  await put('z.json', JSON.stringify({ app: 'english-review-backup', version: 1, videos: [{ id: 'v1', title: 't', youtubeId: 'bad', cards: [] }] }))
  await expect(page.getByTestId('restore-error')).toContainText('읽을 수 없어요')
  expect(JSON.stringify(fake.tables)).toBe(before)
})
