/** 겹치지 않는 짧은 글자열. 카드·영상 id 에 쓴다. */
export function uid(len = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = new Uint8Array(len)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes)
  else for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256)
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}
