import { expect, test, type Page } from '@playwright/test'

/** 실제 유튜브 대신 쓰는 가짜 IFrame API. 호출 기록은 window.__yt 에 남고, 이벤트는 __emit 으로 보낸다. */
const FAKE_API = `
window.__yt = { calls: [], created: 0 };
window.YT = { Player: class {
  constructor(el, opts) {
    window.__yt.created++;
    this.opts = opts;
    window.__emit = (state) => opts.events.onStateChange({ data: state });
    window.__err = (code) => opts.events.onError({ data: code });
    const f = document.createElement('iframe'); f.title = 'fake-youtube'; el.replaceWith(f); this.f = f;
    setTimeout(() => opts.events.onReady({ target: this }), 5);
  }
  loadVideoById(o) { window.__yt.calls.push(['load', o.videoId, o.startSeconds, o.endSeconds]); if (!window.__noStart) setTimeout(() => this.opts.events.onStateChange({ data: 1 }), 5); }
  setPlaybackRate(r) { window.__yt.calls.push(['rate', r]); }
  destroy() { window.__yt.calls.push(['destroy']); this.f.remove(); }
} };
setTimeout(() => window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady(), 0);
`

const errors: string[] = []
test.beforeEach(async ({ page }) => {
  errors.length = 0
  page.on('pageerror', (e) => errors.push(e.message))
  await page.route('**/iframe_api', (r) => r.fulfill({ contentType: 'application/javascript', body: FAKE_API }))
  await page.goto('/')
  await page.getByRole('button', { name: '문장 보기' }).click()
  await expect(page.getByText('Is this seat taken?').first()).toBeVisible()
})
test.afterEach(() => expect(errors).toEqual([]))

const calls = (page: Page) => page.evaluate(() => (window as unknown as { __yt?: { calls: unknown[][] } }).__yt?.calls ?? [])
const play = async (page: Page, n = 0) => {
  await page.getByRole('button', { name: /원어민 .*부터 재생/ }).nth(n).click()
  // 플레이어가 만들어지고 첫 재생 요청이 들어갈 때까지 기다린다.
  await expect.poll(() => page.evaluate(() => (window as unknown as { __yt?: { calls: unknown[][] } }).__yt?.calls.some((c) => c[0] === 'load') ?? false)).toBe(true)
}

test('▶를 누르면 앱 안 플레이어가 열리고 그 구간만 재생한다', async ({ page }) => {
  await expect(page.getByRole('region', { name: '재생 플레이어' })).toHaveCount(0)
  await play(page)
  await expect(page.getByRole('region', { name: '재생 플레이어' })).toBeVisible()
  await expect(page.getByTestId('player-now')).toHaveText('원어민0:10–0:16')
  expect(await calls(page)).toContainEqual(['load', 'aqz-KE-bpKQ', 10, 16])
  // 유튜브 앱으로 이 구간을 열 수 있다 (프리미엄 계정은 앱에서 광고 없이 재생)
  await expect(page.getByTestId('open-yt')).toHaveAttribute('href', 'https://youtu.be/aqz-KE-bpKQ?t=10')
  // 새 탭이나 유튜브 앱으로 나가지 않는다
  expect(page.url()).toContain('localhost')
})

test('다른 구간을 누르면 플레이어는 그대로 두고 그 구간으로 이동한다', async ({ page }) => {
  await play(page, 0)
  await page.getByRole('button', { name: /설명 .*부터 재생/ }).first().click()
  await expect(page.getByTestId('player-now')).toHaveText('설명0:16–1:00')
  const c = await calls(page)
  expect(c.filter((x) => x[0] === 'load')).toEqual([['load', 'aqz-KE-bpKQ', 10, 16], ['load', 'aqz-KE-bpKQ', 16, 60]])
  expect(await page.evaluate(() => (window as unknown as { __yt: { created: number } }).__yt.created)).toBe(1)
})

test('시간 맞추기(+1초)가 재생 시작에 반영된다', async ({ page }) => {
  await page.getByText('재생 시작이 어긋나면 시간 맞추기').first().click()
  await page.getByRole('button', { name: '+1초' }).first().click()
  await play(page)
  expect(await calls(page)).toContainEqual(['load', 'aqz-KE-bpKQ', 11, 17])
})

test('플레이어 크기는 200×200 이상이고, 스크롤해도 위쪽에 고정된다', async ({ page }) => {
  await play(page)
  const box = page.locator('.player-box')
  await expect(box).toBeVisible()
  const size = await box.boundingBox()
  expect(size!.width).toBeGreaterThanOrEqual(200)
  expect(size!.height).toBeGreaterThanOrEqual(200)
  await page.evaluate(() => window.scrollTo(0, 800))
  const top = await page.locator('.player').evaluate((e) => e.getBoundingClientRect().top)
  expect(top).toBeGreaterThanOrEqual(0)
  expect(top).toBeLessThan(120)
  expect(await box.boundingBox().then((b) => b!.height)).toBeGreaterThanOrEqual(200)
})

test('반복을 켜면 구간이 끝날 때 다시 재생한다', async ({ page }) => {
  await play(page)
  await page.getByRole('button', { name: '반복' }).click()
  await page.evaluate(() => (window as unknown as { __emit: (s: number) => void }).__emit(0))
  await expect.poll(async () => (await calls(page)).filter((x) => x[0] === 'load').length).toBe(2)
  await page.getByRole('button', { name: '반복' }).click()
  await page.evaluate(() => (window as unknown as { __emit: (s: number) => void }).__emit(0))
  await page.waitForTimeout(100)
  expect((await calls(page)).filter((x) => x[0] === 'load').length).toBe(2)
})

test('0.75배속과 다시 재생', async ({ page }) => {
  await play(page)
  await page.getByRole('button', { name: '0.75배' }).click()
  expect(await calls(page)).toContainEqual(['rate', 0.75])
  await page.getByRole('button', { name: '구간 다시 재생' }).click()
  await expect.poll(async () => (await calls(page)).filter((x) => x[0] === 'load').length).toBe(2)
})

test('퍼가기가 막힌 영상은 안내와 유튜브 링크를 보여준다', async ({ page }) => {
  await play(page)
  await page.evaluate(() => (window as unknown as { __err: (c: number) => void }).__err(150))
  await expect(page.getByRole('alert')).toContainText('막혀')
  const link = page.getByRole('link', { name: '유튜브에서 열기' })
  await expect(link).toHaveAttribute('href', 'https://youtu.be/aqz-KE-bpKQ?t=10')
})

test('재생이 시작되지 않으면 눌러 달라는 안내를 띄운다', async ({ page }) => {
  await page.evaluate(() => { (window as unknown as { __noStart: boolean }).__noStart = true })
  await play(page)
  await expect(page.getByText('소리가 안 나면 영상의 ▶ 버튼을 한 번 눌러 주세요.')).toBeVisible({ timeout: 5000 })
})

test('닫으면 플레이어가 사라지고 다시 누르면 새로 열린다', async ({ page }) => {
  await play(page)
  await page.getByRole('button', { name: '플레이어 닫기' }).click()
  await expect(page.getByRole('region', { name: '재생 플레이어' })).toHaveCount(0)
  expect(await calls(page)).toContainEqual(['destroy'])
  await play(page)
  await expect(page.getByRole('region', { name: '재생 플레이어' })).toBeVisible()
})

test('유튜브 API를 불러오지 못하면 막힘 안내', async ({ page }) => {
  await page.unroute('**/iframe_api')
  await page.route('**/iframe_api', (r) => r.abort())
  await page.getByRole('button', { name: /원어민 .*부터 재생/ }).first().click()
  await expect(page.getByRole('alert')).toContainText('플레이어를 불러오지 못했어요')
})

test('플레이어가 열려 있어도 가로로 넘치지 않는다', async ({ page }) => {
  await play(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
  await page.getByRole('tab', { name: /복습/ }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
  await expect(page.getByRole('region', { name: '재생 플레이어' })).toBeVisible()
})

test.describe('카드 복습 안에서 재생', () => {
  const startReview = async (page: Page) => {
    await page.getByRole('tab', { name: /복습/ }).click()
    await page.getByRole('button', { name: /카드로 복습/ }).click()
    await expect(page.getByRole('dialog', { name: '카드 복습' })).toBeVisible()
  }
  const loads = async (page: Page) => (await calls(page)).filter((x) => x[0] === 'load')

  test('듣기를 누르면 플레이어가 카드 화면 안에 열린다(뒤에 가려지지 않는다)', async ({ page }) => {
    await startReview(page)
    await page.getByRole('button', { name: '정답 보기' }).click()
    await page.getByRole('dialog', { name: '카드 복습' }).getByRole('button', { name: /듣기 .*부터 재생/ }).click()
    const dialog = page.getByRole('dialog', { name: '카드 복습' })
    const region = dialog.getByRole('region', { name: '재생 플레이어' })
    await expect(region).toBeVisible()
    await expect(page.getByRole('region', { name: '재생 플레이어' })).toHaveCount(1) // 위쪽 고정 플레이어는 따로 없다
    const box = await region.locator('.player-box').boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(200)
    // 화면 안에 보이고, 아래 버튼과 겹치지 않는다
    const foot = await dialog.locator('.rfoot').boundingBox()
    expect(box!.y + box!.height).toBeLessThanOrEqual(foot!.y + 1)
    expect(box!.y).toBeGreaterThanOrEqual(0)
    await expect.poll(async () => (await loads(page)).length).toBe(1)
  })

  test('다시 볼래요를 누르면 같은 카드에서 구간이 다시 재생되고 정답은 가려진다', async ({ page }) => {
    await startReview(page)
    const q = await page.getByTestId('rv-q').textContent()
    await page.getByRole('button', { name: '정답 보기' }).click()
    await page.getByRole('button', { name: '다시 볼래요' }).click()
    await expect(page.getByTestId('rv-q')).toHaveText(q!)
    await expect(page.getByTestId('rv-a')).toHaveCount(0)
    await expect(page.getByRole('dialog').getByRole('region', { name: '재생 플레이어' })).toBeVisible()
    await expect.poll(async () => (await loads(page)).length).toBe(1)
    await page.getByRole('button', { name: '정답 보기' }).click()
    await page.getByRole('button', { name: '다시 볼래요' }).click()
    await expect.poll(async () => (await loads(page)).length).toBe(2)
  })

  test('알아요로 다음 카드로 가면 소리가 멈추고 플레이어가 닫힌다', async ({ page }) => {
    await startReview(page)
    await page.getByRole('button', { name: '정답 보기' }).click()
    await page.getByRole('button', { name: '다시 볼래요' }).click()
    await expect(page.getByRole('region', { name: '재생 플레이어' })).toBeVisible()
    await page.getByRole('button', { name: '정답 보기' }).click()
    await page.getByRole('button', { name: '알아요' }).click()
    await expect(page.getByRole('region', { name: '재생 플레이어' })).toHaveCount(0)
    expect(await calls(page)).toContainEqual(['destroy'])
  })

  test('복습을 닫으면 플레이어도 닫히고, 문장 화면에서는 다시 위쪽에 열린다', async ({ page }) => {
    await startReview(page)
    await page.getByRole('button', { name: '정답 보기' }).click()
    await page.getByRole('dialog', { name: '카드 복습' }).getByRole('button', { name: /듣기 .*부터 재생/ }).click()
    await expect(page.getByRole('region', { name: '재생 플레이어' })).toBeVisible()
    await page.getByRole('button', { name: '복습 닫기' }).click()
    await expect(page.getByRole('region', { name: '재생 플레이어' })).toHaveCount(0)
    await page.getByRole('tab', { name: /문장/ }).click()
    await play(page)
    await expect(page.locator('.sticky-head').getByRole('region', { name: '재생 플레이어' })).toBeVisible()
  })

  test('복습 카드에서도 가로로 넘치지 않는다', async ({ page }) => {
    await startReview(page)
    await page.getByRole('button', { name: '정답 보기' }).click()
    await page.getByRole('button', { name: '다시 볼래요' }).click()
    await expect(page.getByRole('region', { name: '재생 플레이어' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
  })
})
