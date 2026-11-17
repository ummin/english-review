/**
 * 로그인해야만 앱을 쓸 수 있게 하는 설정. 배포본은 항상 켜져 있다.
 * 자동 테스트에서 "이 기기 저장" 흐름을 따로 시험할 때만 빌드할 때 VITE_REQUIRE_LOGIN=false 로 끈다.
 */
export const REQUIRE_LOGIN = import.meta.env.VITE_REQUIRE_LOGIN !== 'false'
