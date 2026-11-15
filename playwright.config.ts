import { defineConfig } from '@playwright/test'

// 한글 파일 이름이 내려받기에서 깨지지 않도록 UTF-8 환경으로 실행한다.
process.env.LC_ALL ??= 'C.UTF-8'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173/',
    viewport: { width: 400, height: 860 },
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  webServer: {
    command: 'VITE_BASE=/ npm run build && VITE_BASE=/ npm run preview',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
