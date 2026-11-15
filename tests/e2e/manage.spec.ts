import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { buildPrompt } from '../../src/lib/prompt'

const FAKE_API = `
window.__yt = { calls: [] };
window.YT = { Player: class {
  constructor(el, opts) { this.opts = opts; const f = document.createElement('iframe'); f.title = 'fake-youtube'; el.replaceWith(f); this.f = f; setTimeout(() => opts.events.onReady({ target: this }), 5); }
  loadVideoById(o) { window.__yt.calls.push(['load', o.videoId, o.startSeconds, o.endSeconds]); setTimeout(() => this.opts.events.onStateChange({ data: 1 }), 5); }
  setPlaybackRate() {} destroy() { this.f.remove(); }
} };
setTimeout(() => window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady(), 0);
`
const errors: string[] = []
test.beforeEach(async ({ page, context }) => {
  errors.length = 0
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route('**/iframe_api', (r) => r.fulfill({ contentType: 'application/javascript', body: FAKE_API }))
  await page.goto('/')
  await expect(page.getByTestId('streak')).toBeVisible()
})
test.afterEach(() => expect(errors).toEqual([]))

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
const YT = 'dQw4w9WgXcQ'
const result = (o: object = {}) => JSON.stringify({
  cards: [
    { en: 'Where is the boarding gate?', ko: '탑승구가 어디예요?', note: 'gate를 또렷하게.', stress: ['boarding', 'gate'], native: [5, 11], explain: ['0:11', '0:50'], role: null,
      subs: [{ kind: 'reply', en: 'It is on your left.', ko: '왼쪽에 있어요.', t: [30, 35], restored: false }, { kind: 'alt', en: 'Which way to gate 12?', ko: '12번 게이트는 어느 쪽이죠?', t: null, restored: true }] },
    { en: 'I would like a window seat.', ko: '창가 자리로 주세요.', note: '', stress: ['window'], native: [60, 66], explain: null, role: null, subs: [] },
  ], ...o,
})
const AI_REPLY = (o?: object) => '네, 카드를 만들었어요!\n```json\n' + result(o) + '\n```'

async function openAdd(page: Page) {
  await page.getByTestId('add-video').click()
  await expect(page.getByRole('heading', { name: '영상 추가' })).toBeVisible()
}
async function fillBasics(page: Page, title = '공항 영어', yt = `https://youtu.be/${YT}?t=3`) {
  await page.getByTestId('title').fill(title)
  await page.getByTestId('yt').fill(yt)
}
async function paste(page: Page, text: string) {
  await page.getByTestId('paste').fill(text)
  await page.getByTestId('check').click()
}
async function register(page: Page, title = '공항 영어') {
  await openAdd(page)
  await fillBasics(page, title)
  await paste(page, AI_REPLY())
  await page.getByTestId('add-cards').click()
  await page.getByTestId('save').click()
  await expect(page.getByText('Where is the boarding gate?').first()).toBeVisible()
}

test('홈에 영상 추가·계정 진입이 있고, 샘플에는 편집이 없고 공유만 있다', async ({ page }) => {
  await expect(page.getByTestId('add-video')).toBeVisible()
  await expect(page.getByRole('button', { name: /샘플.*편집/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /샘플.*공유/ })).toBeVisible()
  await expect(page.getByTestId('go-account')).toContainText('로그인')
  expect(await overflow(page)).toBeLessThanOrEqual(0)
})

test('프롬프트 복사: 클립보드에 규칙·예시·스크립트 자리가 들어간다', async ({ page }) => {
  await openAdd(page)
  await page.getByTestId('copy-prompt').click()
  await expect(page.getByRole('status').filter({ hasText: '프롬프트를 복사했어요' })).toBeVisible()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toBe(buildPrompt())
  await page.getByText('프롬프트 내용 보기').click()
  await expect(page.getByLabel('프롬프트 내용')).toHaveValue(buildPrompt())
})

test('유튜브 주소 검사: 올바르면 ID를 보여주고 틀리면 안내한다', async ({ page }) => {
  await openAdd(page)
  await page.getByTestId('yt').fill('https://www.youtube.com/watch?v=' + YT)
  await expect(page.getByTestId('yt-msg')).toHaveText('영상 ID: ' + YT)
  await page.getByTestId('yt').fill('https://example.com/x')
  await expect(page.getByTestId('yt-msg')).toContainText('확인해 주세요')
  await page.getByTestId('yt').fill('')
  await expect(page.getByTestId('yt-msg')).toHaveCount(0)
})

test('저장 버튼은 조건을 채울 때까지 막혀 있고 이유를 알려 준다', async ({ page }) => {
  await openAdd(page)
  const save = page.getByTestId('save')
  await expect(save).toBeDisabled()
  await expect(page.getByTestId('save-hint')).toHaveText('제목을 입력해 주세요.')
  await page.getByTestId('title').fill('제목')
  await expect(page.getByTestId('save-hint')).toHaveText('유튜브 주소를 입력해 주세요.')
  await page.getByTestId('yt').fill(YT)
  await expect(page.getByTestId('save-hint')).toHaveText('카드를 하나 이상 추가해 주세요.')
  await paste(page, AI_REPLY())
  await page.getByTestId('add-cards').click()
  await expect(save).toBeEnabled()
  await expect(page.getByTestId('save-hint')).toHaveCount(0)
})

test('AI 답변이 틀리면 어디가 문제인지 보여주고 추가할 수 없다', async ({ page }) => {
  await openAdd(page)
  await paste(page, '죄송해요, 만들지 못했어요')
  await expect(page.getByTestId('check-errors')).toContainText('JSON')
  await expect(page.getByTestId('add-cards')).toHaveCount(0)
  await paste(page, JSON.stringify({ cards: [{ en: 'ok', native: [9, 3] }, { ko: '영어 없음' }] }))
  await expect(page.getByTestId('check-errors')).toContainText('카드 1의 native')
  await expect(page.getByTestId('check-errors')).toContainText('카드 2')
  await expect(page.getByTestId('add-cards')).toHaveCount(0)
  // 내용을 고치면 이전 검사 결과는 사라진다
  await page.getByTestId('paste').fill(AI_REPLY())
  await expect(page.getByTestId('check-errors')).toHaveCount(0)
})

test('등록 전체 흐름: 붙여넣기 → 확인 → 저장 → 문장 화면 → 새로고침해도 남음', async ({ page }) => {
  await openAdd(page)
  await fillBasics(page)
  await paste(page, AI_REPLY())
  await expect(page.getByTestId('check-ok')).toContainText('카드 2개(대답·비슷한 표현 2개)')
  await page.getByTestId('add-cards').click()
  await expect(page.getByTestId('card-count')).toHaveText('2개')
  await expect(page.getByTestId('draft-1')).toContainText('원어민 0:05–0:11')
  await expect(page.getByTestId('draft-1')).toContainText('설명 0:11–0:50')
  await page.getByTestId('save').click()
  // 저장하면 문장 화면으로 이동하고 새 영상의 카드가 보인다
  await expect(page).toHaveURL(/#\/sent$/)
  await expect(page.getByText('Where is the boarding gate?').first()).toBeVisible()
  await expect(page.getByText('Which way to gate 12?').first()).toBeVisible()
  await expect(page.getByText('복원한 문장').first()).toBeVisible()
  // 재생은 새 영상의 ID와 구간으로 간다
  await page.getByRole('button', { name: /원어민 .*부터 재생/ }).first().click()
  await expect.poll(() => page.evaluate(() => (window as unknown as { __yt: { calls: unknown[][] } }).__yt.calls.at(-1))).toEqual(['load', YT, 5, 11])
  // 홈 목록과 새로고침
  await page.getByRole('tab', { name: '홈' }).click()
  await expect(page.getByRole('heading', { name: '공항 영어' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: '공항 영어' })).toBeVisible()
  await expect(page.getByText('문장 3개 · 완료 0개').or(page.getByText(/문장 4개/)).first()).toBeVisible()
  expect(await overflow(page)).toBeLessThanOrEqual(0)
})

test('같은 AI 답변을 두 번 추가해도 카드 id가 겹치지 않아 각각 독립적으로 동작한다', async ({ page }) => {
  await register(page)
  await page.getByRole('tab', { name: '홈' }).click()
  await page.getByRole('button', { name: '공항 영어 편집' }).click()
  await paste(page, AI_REPLY())
  await page.getByTestId('add-cards').click()
  await expect(page.getByTestId('card-count')).toHaveText('4개')
  await page.getByTestId('save').click()
  const first = page.locator('.card', { hasText: 'Where is the boarding gate?' })
  await expect(first).toHaveCount(2)
  await first.nth(0).getByRole('button', { name: /완료/ }).first().click()
  // 같은 문장이어도 다른 카드는 영향받지 않는다
  await expect(first.nth(1).locator('[aria-pressed="true"]')).toHaveCount(0)
})

test('편집: 문장 수정·카드 삭제·대답 삭제가 저장되고 새로고침 뒤에도 남는다', async ({ page }) => {
  await register(page)
  await page.getByRole('tab', { name: '홈' }).click()
  await page.getByRole('button', { name: '공항 영어 편집' }).click()
  await expect(page.getByRole('heading', { name: '영상 편집' })).toBeVisible()
  await expect(page.getByTestId('title')).toHaveValue('공항 영어')
  await page.getByTestId('title').fill('공항·기내 영어')
  await page.getByRole('button', { name: '카드 1 수정' }).click()
  await page.getByLabel('영어 문장').first().fill('Where is gate 7?')
  await page.getByLabel('세게 읽는 단어 (쉼표로 구분)').fill('gate, seven')
  await page.getByRole('button', { name: /이 표현 삭제/ }).click()
  await page.getByRole('button', { name: '카드 2 삭제' }).click()
  await expect(page.getByTestId('card-count')).toHaveText('1개')
  await page.getByTestId('save').click()
  await expect(page.getByText('Where is gate 7?').first()).toBeVisible()
  await expect(page.getByText('I would like a window seat.')).toHaveCount(0)
  await expect(page.getByText('Which way to gate 12?')).toHaveCount(0)
  await expect(page.getByText('It is on your left.').first()).toBeVisible()
  await page.reload()
  await page.getByRole('tab', { name: '홈' }).click()
  await expect(page.getByRole('heading', { name: '공항·기내 영어' })).toBeVisible()
})

test('편집 중 영어 문장을 비우면 저장할 수 없다', async ({ page }) => {
  await register(page)
  await page.getByRole('tab', { name: '홈' }).click()
  await page.getByRole('button', { name: '공항 영어 편집' }).click()
  await page.getByRole('button', { name: '카드 1 수정' }).click()
  await page.getByLabel('영어 문장').first().fill('   ')
  await expect(page.getByTestId('save')).toBeDisabled()
  await expect(page.getByTestId('save-hint')).toHaveText('영어 문장이 비어 있는 카드가 있어요.')
})

test('샘플 영상은 주소로 직접 들어가도 편집할 수 없다', async ({ page }) => {
  await page.goto('/#/video/SAMPLE00001')
  await expect(page.getByRole('alert')).toContainText('샘플 영상은 수정할 수 없어요')
  await expect(page.getByTestId('save')).toHaveCount(0)
  await page.goto('/#/video/없는영상')
  await expect(page.getByRole('alert')).toContainText('찾을 수 없는')
})

test('영상 삭제는 두 번 확인하고, 연속 공부일 기록은 유지된다', async ({ page }) => {
  await register(page)
  await expect(page.getByRole('tab', { name: '홈' })).toBeVisible()
  await page.getByRole('tab', { name: '홈' }).click()
  const streakBefore = await page.getByTestId('streak').textContent()
  await page.getByRole('button', { name: '공항 영어 편집' }).click()
  await page.getByTestId('del').click()
  await page.getByRole('button', { name: '취소' }).click()
  await expect(page.getByTestId('del')).toBeVisible()
  await page.getByTestId('del').click()
  await page.getByTestId('del-yes').click()
  await expect(page).toHaveURL(/#\/$/)
  await expect(page.getByRole('heading', { name: '공항 영어' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /샘플/ })).toBeVisible()
  await expect(page.getByTestId('streak')).toHaveText(streakBefore!)
  // 삭제 뒤에도 문장 화면이 깨지지 않는다
  await page.getByRole('tab', { name: '문장' }).click()
  await expect(page.getByText('Is this seat taken?').first()).toBeVisible()
})

test('이상한 글자(HTML)가 들어 있어도 글자 그대로만 보인다', async ({ page }) => {
  await openAdd(page)
  await fillBasics(page, '<b>제목</b>')
  await paste(page, JSON.stringify({ cards: [{ en: '<img src=x onerror="window.__pwned=1">', ko: '<script>window.__pwned=1</script>' }] }))
  await page.getByTestId('add-cards').click()
  await page.getByTestId('save').click()
  await expect(page.getByText('<img src=x onerror="window.__pwned=1">').first()).toBeVisible()
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined()
  await page.getByRole('tab', { name: '홈' }).click()
  await expect(page.getByRole('heading', { name: '<b>제목</b>' })).toBeVisible()
})

test('공유: 카드 파일을 받으면 진행 기록 없이 카드만 들어 있다', async ({ page }) => {
  await register(page)
  // 진행 기록을 하나 만들어 두고 파일에 섞이지 않는지 본다
  await page.getByRole('button', { name: /완료/ }).first().click()
  await page.getByRole('tab', { name: '홈' }).click()
  await page.getByRole('button', { name: '공항 영어 공유' }).click()
  await expect(page.getByTestId('share-title')).toHaveText('공항 영어')
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download').click()])
  expect(dl.suggestedFilename()).toBe('공항_영어.cards.json')
  const text = readFileSync((await dl.path())!, 'utf8')
  const data = JSON.parse(text)
  expect(data).toMatchObject({ app: 'english-review', version: 1, title: '공항 영어', youtubeId: YT })
  expect(data.cards).toHaveLength(2)
  expect(text).not.toMatch(/dates|star|offset|"id"|20\d\d-\d\d-\d\d/)
})

test('공유: 받은 카드 파일을 "파일에서 불러오기"로 열면 같은 카드로 새 영상을 만들 수 있다', async ({ page, browser }) => {
  await register(page)
  await page.getByRole('tab', { name: '홈' }).click()
  await page.getByRole('button', { name: '공항 영어 공유' }).click()
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download').click()])
  const file = (await dl.path())!
  // 다른 사람(새 브라우저 화면)이 받는다
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 } })
  const other = await ctx.newPage()
  await other.route('**/iframe_api', (r) => r.fulfill({ contentType: 'application/javascript', body: FAKE_API }))
  await other.goto('/')
  await other.getByTestId('add-video').click()
  await other.getByTestId('file').setInputFiles(file)
  await expect(other.getByTestId('check-ok')).toContainText('카드 2개')
  await other.getByTestId('add-cards').click()
  // 파일의 제목과 영상 주소가 빈 칸에 자동으로 채워진다
  await expect(other.getByTestId('title')).toHaveValue('공항 영어')
  await expect(other.getByTestId('yt-msg')).toHaveText('영상 ID: ' + YT)
  await other.getByTestId('save').click()
  await expect(other.getByText('Where is the boarding gate?').first()).toBeVisible()
  // 받은 사람의 기록은 비어 있다
  await other.getByRole('tab', { name: '홈' }).click()
  await expect(other.getByText(/문장 4개 · 완료 0개/)).toBeVisible()
  await ctx.close()
})

test('공유: 이상한 파일을 고르면 안내만 하고 앱은 멀쩡하다', async ({ page }) => {
  await openAdd(page)
  await page.getByTestId('file').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('이건 JSON이 아니에요') })
  await expect(page.getByTestId('check-errors')).toContainText('JSON')
  await page.getByTestId('file').setInputFiles({ name: 'big.json', mimeType: 'application/json', buffer: Buffer.alloc(2_000_001, 'a') })
  await expect(page.getByRole('alert').filter({ hasText: '파일이 너무 커요' })).toBeVisible()
})

test('공유 링크는 미리보기로만 보이고, 켜면 주소가 나오고 복사는 막혀 있다', async ({ page }) => {
  await page.getByRole('button', { name: /샘플.*공유/ }).click()
  await expect(page.getByTestId('share-preview-note')).toContainText('미리보기')
  await expect(page.getByTestId('link')).toHaveCount(0)
  await page.getByTestId('link-switch').check()
  await expect(page.getByTestId('link')).toHaveValue(/#\/s\/[a-z0-9]{8}$/)
  await expect(page.getByRole('button', { name: /링크 복사/ })).toBeDisabled()
  expect(await overflow(page)).toBeLessThanOrEqual(0)
})

test('계정: 구글/카카오 미리보기 로그인과 로그아웃', async ({ page }) => {
  await page.getByTestId('go-account').click()
  await expect(page.getByTestId('account-preview-note')).toContainText('미리보기')
  await page.getByTestId('login-google').click()
  await expect(page.getByTestId('who-name')).toHaveText('Google 사용자')
  await page.reload()
  await expect(page.getByTestId('who-name')).toHaveText('Google 사용자') // 새로고침 뒤에도 유지
  await page.getByTestId('signout').click()
  await expect(page.getByTestId('login-kakao')).toBeVisible()
  await page.getByTestId('login-kakao').click()
  await expect(page.getByTestId('who-name')).toHaveText('카카오 사용자')
  await page.getByRole('button', { name: '뒤로' }).click()
  await expect(page.getByTestId('go-account')).toContainText('카카오 사용자')
})

test('계정: 이메일 로그인 흐름과 형식 검사', async ({ page }) => {
  await page.goto('/#/account')
  const send = page.getByTestId('send-link')
  await expect(send).toBeDisabled()
  await page.getByTestId('email').fill('abc')
  await expect(page.getByText('이메일 형식을 확인해 주세요.')).toBeVisible()
  await expect(send).toBeDisabled()
  await page.getByTestId('email').fill('yoon@example.com')
  await expect(send).toBeEnabled()
  await send.click()
  await expect(page.getByTestId('link-sent')).toContainText('yoon@example.com')
  await page.getByTestId('open-link').click()
  await expect(page.getByTestId('who-name')).toHaveText('yoon')
  expect(await overflow(page)).toBeLessThanOrEqual(0)
})

test('새 화면들은 모두 가로로 넘치지 않고 뒤로 가기가 동작한다', async ({ page }) => {
  for (const hash of ['#/video/new', '#/account', '#/share/SAMPLE00001']) {
    await page.goto('/' + hash)
    await expect(page.getByRole('button', { name: '뒤로' })).toBeVisible()
    expect(await overflow(page), hash).toBeLessThanOrEqual(0)
  }
  await page.goto('/')
  await openAdd(page)
  await page.getByRole('button', { name: '뒤로' }).click()
  await expect(page).toHaveURL(/#\/$/)
})

test('긴 제목과 긴 문장이 있어도 레이아웃이 깨지지 않는다', async ({ page }) => {
  const long = 'Supercalifragilisticexpialidocious '.repeat(8).trim()
  await openAdd(page)
  await fillBasics(page, '아주아주긴제목'.repeat(10))
  await paste(page, JSON.stringify({ cards: [{ en: long, ko: '긴 문장'.repeat(30), note: 'n'.repeat(200) }] }))
  await page.getByTestId('add-cards').click()
  expect(await overflow(page)).toBeLessThanOrEqual(0)
  await page.getByTestId('save').click()
  await expect(page.getByText(long).first()).toBeVisible()
  expect(await overflow(page)).toBeLessThanOrEqual(0)
  await page.getByRole('tab', { name: '홈' }).click()
  expect(await overflow(page)).toBeLessThanOrEqual(0)
})
