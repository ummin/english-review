import { expect, test, type Page } from '@playwright/test'

const errors: string[] = []
test.beforeEach(async ({ page }) => {
  errors.length = 0
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await expect(page.getByTestId('streak')).toBeVisible()
})
test.afterEach(() => expect(errors).toEqual([]))

const card = (page: Page, text: string) => page.locator('.card', { hasText: text }).first()
const goSent = async (page: Page) => {
  await page.getByRole('button', { name: '문장 보기' }).click()
  await expect(page.getByText('Is this seat taken?').first()).toBeVisible()
}
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)

test('홈: 연속일·목표·복습 배너·영상 목록', async ({ page }) => {
  await expect(page.getByTestId('streak')).toHaveText('2')
  await expect(page.getByText('오늘 한 문장만 하면 3일째!')).toBeVisible()
  await expect(page.getByText('0 / 10 문장')).toBeVisible()
  await expect(page.getByText('어제 공부한 문장')).toBeVisible()
  await expect(page.getByText('샘플 · 여행 영어 기본 표현').first()).toBeVisible()
  expect(await overflow(page)).toBeLessThanOrEqual(0)
})

test('하단 탭은 4개이고 같은 간격으로 가운데까지 펼쳐진다', async ({ page }) => {
  const tabs = page.getByRole('tab')
  await expect(tabs).toHaveCount(4)
  const boxes = await tabs.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()))
  const widths = boxes.map((b) => Math.round(b.width))
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1)
  const left = boxes[0]!.left
  const right = 400 - boxes[3]!.right
  expect(Math.abs(left - right)).toBeLessThanOrEqual(2)
})

test('완료 버튼 3가지 상태와 취소', async ({ page }) => {
  await goSent(page)
  const e1 = card(page, 'Is this seat taken?')
  await expect(e1.getByText(/지난번 .* · 총 2일/)).toBeVisible()
  await e1.getByRole('button', { name: '오늘도 따라 말하기 완료' }).first().click()
  await expect(e1.getByText('오늘 완료 · 총 3일')).toBeVisible()
  await e1.getByRole('button', { name: '오늘 완료 취소' }).first().click()
  await expect(e1.getByRole('button', { name: '오늘도 따라 말하기 완료' }).first()).toBeVisible()
  const e4 = card(page, "I'd like to check in")
  await expect(e4.getByRole('button', { name: '따라 말하기 완료', exact: true }).first()).toBeVisible()
})

test('남은 문장 필터: 체크해도 흐리게 남고, 다시 누르면 사라진다', async ({ page }) => {
  await goSent(page)
  await page.getByRole('button', { name: /^남은 문장/ }).click()
  const e4 = card(page, "I'd like to check in")
  await e4.getByRole('button', { name: '따라 말하기 완료', exact: true }).first().click()
  await expect(e4).toBeVisible()
  await expect(e4).toHaveClass(/dim/)
  await page.getByRole('button', { name: /^남은 문장/ }).click()
  await expect(page.locator('.card', { hasText: "I'd like to check in" }).filter({ has: page.locator('.dim') })).toHaveCount(0)
  await expect(page.locator('[data-id$="-e4"].card:not(.compact)')).toHaveCount(0)
})

test('질문만 끝난 카드는 남은 대답만 요약해서 보여준다', async ({ page }) => {
  await goSent(page)
  // e2는 질문은 끝났고 대답은 남아 있다
  await page.getByRole('button', { name: /^남은 문장/ }).click()
  const keep = page.locator('.card.compact', { hasText: 'Could you recommend a good local restaurant?' })
  await expect(keep).toBeVisible()
  await expect(keep.getByText('There is a great place around the corner.')).toBeVisible()
})

test('복습 탭: 오늘 완료한 문장이 바로 쌓이고 전체는 질문·대답 묶음', async ({ page }) => {
  await goSent(page)
  await card(page, "I'd like to check in").getByRole('button', { name: '따라 말하기 완료', exact: true }).first().click()
  await page.getByRole('tab', { name: /복습/ }).click()
  await expect(page.getByRole('button', { name: '오늘', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: /복습 · 오늘/ })).toBeVisible()
  await expect(page.getByText("I'd like to check in, please.").first()).toBeVisible()
  await page.getByRole('button', { name: '전체', exact: true }).click()
  await expect(page.getByRole('heading', { name: '복습 · 전체' })).toBeVisible()
  const grouped = page.locator('.card', { hasText: 'Is this seat taken?' }).first()
  await expect(grouped.getByText('No, go ahead.')).toBeVisible()
})

test('카드 복습: 다시 볼래요는 같은 카드, 알아요는 다음 카드', async ({ page }) => {
  await page.getByRole('tab', { name: /복습/ }).click()
  await page.getByRole('button', { name: /카드로 복습/ }).click()
  const q = page.getByTestId('rv-q')
  const first = await q.textContent()
  await page.getByRole('button', { name: '정답 보기' }).click()
  await expect(page.getByTestId('rv-a')).toBeVisible()
  await page.getByRole('button', { name: '다시 볼래요' }).click()
  await expect(q).toHaveText(first!)
  await expect(page.getByTestId('rv-a')).toHaveCount(0)
  await page.getByRole('button', { name: '정답 보기' }).click()
  await page.getByRole('button', { name: '알아요' }).click()
  await expect(q).not.toHaveText(first!)
})

test('목표를 채우면 축하 화면이 한 번 나온다', async ({ page }) => {
  for (let i = 0; i < 9; i++) await page.getByRole('button', { name: '목표 줄이기' }).click()
  await expect(page.getByText('0 / 1 문장')).toBeVisible()
  await goSent(page)
  await card(page, "I'd like to check in").getByRole('button', { name: '따라 말하기 완료', exact: true }).first().click()
  await expect(page.getByRole('dialog', { name: '목표 달성' })).toBeVisible()
  await page.getByRole('button', { name: '계속하기' }).click()
  await card(page, 'Is breakfast included?').getByRole('button', { name: '따라 말하기 완료', exact: true }).first().click()
  await expect(page.getByRole('dialog', { name: '목표 달성' })).toHaveCount(0)
})

test('별 표시는 어려움 탭에 모이고, 새로고침해도 기록이 남는다', async ({ page }) => {
  await goSent(page)
  await card(page, 'Is breakfast included?').getByRole('button', { name: '어려운 문장 표시' }).first().click()
  await page.getByRole('tab', { name: /어려움/ }).click()
  await expect(page.getByText('Is breakfast included?').first()).toBeVisible()
  await page.reload()
  await page.getByRole('tab', { name: /어려움/ }).click()
  await expect(page.getByText('Is breakfast included?').first()).toBeVisible()
})

test('영어 가리기: 가려지고, 누르면 보인다', async ({ page }) => {
  await goSent(page)
  await page.getByRole('button', { name: '영어 가리기' }).click()
  const en = page.locator('.en').first()
  await expect(en).not.toHaveClass(/rev/)
  await en.click()
  await expect(en).toHaveClass(/rev/)
})

test('▶ 버튼은 재생 요청 안내를 띄운다 (플레이어는 3단계)', async ({ page }) => {
  await goSent(page)
  await page.getByRole('button', { name: /원어민 .*부터 재생/ }).first().click()
  await expect(page.getByRole('status')).toContainText('플레이어는 3단계')
})

test('모든 화면에서 가로로 넘치지 않는다', async ({ page }) => {
  for (const name of ['문장', '복습', '어려움', '홈']) {
    await page.getByRole('tab', { name: new RegExp(name) }).click()
    expect(await overflow(page), name).toBeLessThanOrEqual(0)
  }
})
