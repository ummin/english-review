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

## 현재 진행 상태 (1~9단계 완료)

| # | 작업 | 상태 |
|---|---|---|
| 1 | 프로젝트 뼈대 · 테스트 · 자동 배포 | ✅ 완료 |
| 2 | 홈·문장·복습·어려움 화면 | ✅ 완료 |
| 3 | 앱 안 플레이어 | ✅ 완료 |
| 4 | 영상 등록·편집 · 공유 · 계정 화면 | ✅ 완료 |
| 5 | Supabase 연결 (테이블 · RLS · 저장) | ✅ 완료 |
| 6 | Google 로그인 | ✅ 완료 · 카카오는 코드만 있고 **미연결**(숨김) |
| 7 | 이전 복습장 데이터 이관 | ⏭ 건너뜀 (필요 없음) |
| 8 | 공유 링크 · 카드 파일 · 백업/복원 | ✅ 완료 |
| 9 | 로그인 필수 · 계정 삭제 · 약관/방침 · 홈 화면 아이콘 · 마무리 | ✅ 완료 |

- **로그인 필수**: 로그아웃 상태에서는 로그인 화면만 보입니다. 로그인은 **Google 하나**(이메일 로그인은 제거).
- 데이터는 Supabase에 계정별로 저장되고(RLS), 샘플 영상은 모두에게 첫 번째로 보입니다.
- 남은 것: 카카오 로그인 연결(Kakao Developers 설정 필요), 쓰면서 나오는 개선 사항.
- 아래 3~9단계 설명은 단계별 구현 기록입니다.

## 3단계: 앱 안 플레이어
- ▶ 버튼을 누르면 화면 위쪽에 고정된 플레이어가 열리고, 그 구간만 재생한 뒤 자동으로 멈춥니다. (YouTube IFrame API, 무료·키 없음)
- 반복, 0.75배속, 구간 다시 재생, 닫기. 퍼가기가 막힌 영상은 안내와 "유튜브에서 열기" 링크로 바뀝니다.
- 재생 확인용으로 샘플은 공개 영상(Blender 'Big Buck Bunny')에 연결돼 있습니다. 주소 뒤에 `?v=영상ID`를 붙여 열면(예: `…/english-review/?v=0EvDDlx2dYs`) 같은 샘플 카드로 그 영상이 퍼가기 가능한지 확인할 수 있습니다.

## 4단계: 영상 등록·편집, 공유, 로그인 화면 (미리보기)

- `#/video/new`: 유튜브 주소 + AI 프롬프트 복사 → AI 답변 붙여넣기 → 검사 → 카드 추가 → 저장
- `#/video/:id`: 제목·카드 문장 수정, 카드·대답 삭제, 카드 더 붙이기, 영상 삭제 (샘플은 수정 불가)
- `#/share/:id`: 카드 파일(.cards.json) 내려받기(진행 기록 제외). 공유 링크는 8단계에서 실제 동작으로 교체됨
- `#/account`: 로그인·내 정보 화면 (4단계에서는 가짜 미리보기였고 5~6단계에서 Supabase로 교체됨)
- 저장은 아직 브라우저(localStorage)이며, `AppStorage` 구현만 바꾸면 5단계에서 DB로 옮겨진다.
- 카드 파일 형식과 프롬프트: `src/lib/cardfile.ts`, `src/lib/prompt.ts` (프롬프트 예시가 실제 파서로 검증된다)

## 5단계: Supabase 연결

- 표·보안 규칙: `supabase/schema.sql` (SQL Editor에서 한 번 실행. 여러 번 실행해도 안전)
- 로그인 전: 이 기기(localStorage) 저장 / 로그인 후: Supabase 저장 (`src/storage/index.ts`에서 전환)
- 이메일 로그인은 링크 대신 **인증 코드**를 입력하는 방식 (메일 앱이 다른 브라우저로 열어도 동작)
- 키: `src/lib/supabase.ts` (공개용 publishable 키만. secret/service_role 키는 절대 넣지 않는다)
- 테스트: `tests/e2e/fakeSupabase.ts` 가 실제 서버 대신 답하는 가짜 서버 (RLS 흉내 포함)

## 6단계: Google·카카오 로그인

- 코드: `auth.signInWith('google'|'kakao')` (Supabase OAuth, PKCE). 로그인 뒤 홈으로 돌아온다.
- Supabase 대시보드 → Authentication → Providers 에서 Google/Kakao 를 켜고 Client ID/Secret 을 넣는다. (비밀 값은 대시보드에만 입력)
- 각 서비스 콘솔에 등록할 Redirect URI: `https://blysqzzhuidlqpwjczzw.supabase.co/auth/v1/callback`
- 카카오는 이메일 권한이 없어도 되도록 닉네임만 요청하고, Supabase 에서 "Allow users without an email" 을 켠다.

## 로그인 필수 (게이트)
로그아웃 상태에서는 로그인 화면만 보이고 앱·데이터 요청이 일절 없습니다 (`VITE_REQUIRE_LOGIN=false`로 빌드하면 해제, e2e `local` 프로젝트가 사용). 테스트는 `local`(4173)·`gate`(4174) 두 빌드로 나뉩니다.

## 8단계: 공유 링크 · 카드 파일 · 백업
- **공유 링크**: 영상 공유 화면에서 켜면 `#/s/코드`(12자)가 생기고 `videos.share_id`에 저장됩니다. 받는 사람은 **로그인 후** 미리보기를 보고 "내 복습장에 담기"로 새 id의 내 영상을 만듭니다(공부 기록은 공유되지 않음). 끄면 즉시 닫힙니다. 코드는 DB 함수 `get_shared_video(code)`로만 조회되며(목록 조회 불가, anon 실행 불가) 남의 데이터는 카드 파일과 같은 검사를 거쳐 저장합니다.
- **새 SQL**: `supabase/schema.sql` 맨 아래 "8단계" 블록을 SQL Editor에서 한 번 실행해야 링크가 동작합니다.
- **구글 로그인 후에도** 공유 링크 주소가 유지됩니다(`lib/returnTo.ts`).
- **백업/복원**: 내 계정 화면에서 영상·기록·목표를 JSON 하나로 저장/불러오기(같은 영상은 덮어쓰고 공부한 날짜는 합침). 계정 정보는 들어 있지 않습니다.
- 테스트: `tests/e2e/share.spec.ts`(gate 빌드), `tests/unit/backup.test.ts`.

## 9단계: Google 로그인 통일 · 계정 삭제 · 약관
- **로그인은 Google 하나**: 이메일 코드 로그인은 제거했고 카카오 버튼은 숨겼습니다(코드는 `auth.signInWith('kakao')`에 남아 있어 나중에 켜면 됩니다).
- **계정 삭제**: 내 계정 → 계정 삭제(“삭제” 입력 필요). DB 함수 `delete_my_account()`가 본인 `auth.users` 행만 지우고 영상·기록·설정·공유 링크는 cascade 로 함께 삭제됩니다. 먼저 `supabase/schema.sql` 맨 아래 "9단계" 블록을 SQL Editor에서 실행하세요.
- **공개 페이지**: `public/privacy.html`, `public/terms.html`(로그인 없이 열림, Google 앱 게시 요건). 로그인 화면에 앱 소개와 두 링크가 있습니다. 문의 메일: yhoo13579@gmail.com
- **Google 앱 게시 입력값**: 앱 이름 `영어회화 복습장`, 홈페이지 `https://ummin.github.io/english-review/`, 개인정보처리방침 `…/privacy.html`, 약관 `…/terms.html`, 승인된 도메인 `ummin.github.io`, 로고는 비움(브랜드 인증 회피).
- **홈 화면 추가**: `public/manifest.webmanifest` + 아이콘(주황 말풍선 EN). 사파리 → 공유 → "홈 화면에 추가".

## 운영 체크리스트
1. Supabase SQL: `supabase/schema.sql` 전체(5·8·9단계 블록)를 실행해 둔다.
2. Supabase → Authentication → URL Configuration: Site URL/Redirect URLs = `https://ummin.github.io/english-review/`
3. Google Auth Platform: 앱 게시(Publish app) 상태, 리디렉션 URI = `https://<프로젝트>.supabase.co/auth/v1/callback`
4. 배포: `main` 푸시 → GitHub Actions(타입검사 → 단위 → e2e → 빌드 → Pages)
5. 비밀 값(Google 클라이언트 시크릿, DB 비밀번호, service_role 키)은 저장소·채팅에 넣지 않는다. 앱에는 공개용 publishable 키만 들어 있다.
6. 정기적으로 내 계정 → 백업 파일 저장.
