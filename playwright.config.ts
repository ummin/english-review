import { defineConfig } from '@playwright/test'

// 한글 파일 이름이 내려받기에서 깨지지 않도록 UTF-8 환경으로 실행한다.
process.env.LC_ALL ??= 'C.UTF-8'

const build = (outDir: string, extraEnv: string) =>
  `VITE_BASE=/ ${extraEnv} npx vite build --outDir ${outDir} --emptyOutDir`

/**
 * 두 가지로 빌드해서 시험한다.
 *  - local: 로그인 요구를 끈 빌드 (이 기기 저장·화면 동작을 시험)
 *  - gate : 배포본과 같은 빌드 (로그인해야만 앱이 보이는지 시험)
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: {
    viewport: { width: 400, height: 860 },
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: 'local', testIgnore: /(gate|share)\.spec/, use: { baseURL: 'http://localhost:4173/' } },
    { name: 'gate', testMatch: /(gate|share)\.spec/, use: { baseURL: 'http://localhost:4174/' } },
  ],
  webServer: [
    {
      command: `${build('dist-local', 'VITE_REQUIRE_LOGIN=false')} && VITE_BASE=/ npx vite preview --outDir dist-local --port 4173`,
      url: 'http://localhost:4173/',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `${build('dist-gate', '')} && VITE_BASE=/ npx vite preview --outDir dist-gate --port 4174`,
      url: 'http://localhost:4174/',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
