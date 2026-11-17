/**
 * 메일 링크를 눌러 돌아왔을 때 주소에 붙어 오는 로그인 결과를 앱이 시작되자마자 읽어 둔다.
 * (화면 주소 해석기가 이 값을 지워 버리기 전에 읽어야 해서 가장 먼저 불러온다.)
 */
function read(): string | null {
  try {
    const q = new URLSearchParams(location.search)
    const h = new URLSearchParams(location.hash.replace(/^#\/?/, ''))
    const get = (k: string) => h.get(k) ?? q.get(k)
    const code = get('error_code') ?? get('error')
    if (code) return code
    if (h.get('access_token')) return 'unsupported_link' // 이 앱이 쓰는 방식과 다른 형태의 링크
    return null
  } catch {
    return null
  }
}

export const authCallbackError: string | null = read()

if (authCallbackError) {
  // 오류 값을 주소에서 지우고 계정 화면으로 보낸다.
  try { history.replaceState(null, '', `${location.pathname}#/account`) } catch { /* 무시 */ }
}

export function describeCallbackError(code: string | null): string {
  if (!code) return ''
  if (code === 'otp_expired' || code === 'access_denied')
    return '로그인 링크가 이미 사용됐거나 시간이 지났어요. 메일 앱이 링크를 미리 열어 보면 이렇게 될 수 있어요. 아래에서 메일을 다시 받아서 바로 눌러 보세요.'
  return '로그인 링크를 처리하지 못했어요. 메일을 다시 받아 주세요.'
}
