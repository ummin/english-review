import { expect, test } from '@playwright/test'

test('첫 화면이 열리고 가로로 넘치지 않는다', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '영어회화 복습장' })).toBeVisible()
  await expect(page.getByTestId('status')).toContainText('준비 중')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  expect(errors).toEqual([])
})

test('해시 주소로 새로고침해도 열린다', async ({ page }) => {
  await page.goto('/#/')
  await page.reload()
  await expect(page.getByTestId('status')).toBeVisible()
})
