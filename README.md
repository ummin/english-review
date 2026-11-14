# 영어회화 복습장

유튜브 영어회화 영상을 문장 카드로 정리해 따라 말하고 복습하는 웹앱입니다.

- 유튜브 링크 + 스크립트 → AI 채팅으로 카드 정리 → 구간 재생하며 복습
- 카드 파일·공유 링크로 다른 사람도 같은 카드로 공부 가능

## 기술
Vue 3 · TypeScript · Vite · Vue Router(해시) · Pinia · Vitest · Playwright · GitHub Actions(Pages)

## 개발
```bash
npm install          # 처음 한 번
npm run dev          # 개발 서버 (http://localhost:5173/english-review/)
npm test             # 단위 테스트 (Vitest)
npx playwright install chromium   # 화면 테스트용 브라우저, 처음 한 번
npm run test:e2e     # 화면 테스트 (Playwright)
npm run build        # 배포 파일(dist) 만들기
```

## 배포
`main`에 푸시하면 GitHub Actions가 타입 검사 → 단위 테스트 → 화면 테스트를 통과한 경우에만 GitHub Pages에 배포합니다.
저장소 Settings → Pages → Source를 **GitHub Actions**로 설정해야 합니다.

## 문서
- [최종 계획](docs/PLAN.md)
