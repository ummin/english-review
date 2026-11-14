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

## 현재 상태 (2단계)
- 홈 · 문장 · 복습 · 어려움 화면과 카드 복습, 연속일·목표 링, 완료/취소, 필터, 가리기 동작
- 데이터는 **지어낸 샘플**(`src/data/sample.ts`)이고, 체크 기록은 이 브라우저(localStorage)에만 저장됩니다.
- 처음 열면 연속일·복습 화면이 보이도록 어제·그저께 기록이 샘플로 들어 있습니다. (5단계에서 제거)
- ▶ 재생 버튼은 아직 안내만 띄웁니다. (3단계에서 플레이어 연결)

## 3단계: 앱 안 플레이어
- ▶ 버튼을 누르면 화면 위쪽에 고정된 플레이어가 열리고, 그 구간만 재생한 뒤 자동으로 멈춥니다. (YouTube IFrame API, 무료·키 없음)
- 반복, 0.75배속, 구간 다시 재생, 닫기. 퍼가기가 막힌 영상은 안내와 "유튜브에서 열기" 링크로 바뀝니다.
- 재생 확인용으로 샘플은 공개 영상(Blender 'Big Buck Bunny')에 연결돼 있습니다. 주소 뒤에 `?v=영상ID`를 붙여 열면(예: `…/english-review/?v=0EvDDlx2dYs`) 같은 샘플 카드로 그 영상이 퍼가기 가능한지 확인할 수 있습니다.
