/** 공유 링크(#/s/코드)로 들어와 구글 로그인을 하면 주소가 사라지므로, 로그인 전에 적어 두었다가 돌아와서 이어 연다. */
const K = 'er-return'
const RE = /^#\/s\/[a-z0-9]{6,32}$/

export function rememberReturn(hash = location.hash) {
  try { if (RE.test(hash)) sessionStorage.setItem(K, hash) } catch { /* 무시 */ }
}
export function takeReturn(): string | null {
  try {
    const v = sessionStorage.getItem(K)
    sessionStorage.removeItem(K)
    return v && RE.test(v) ? v.slice(1) : null
  } catch { return null }
}
