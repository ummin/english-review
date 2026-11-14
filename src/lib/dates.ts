const pad = (n: number) => String(n).padStart(2, '0')

/** 로컬 날짜를 YYYY-MM-DD로 */
export const dateKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayKey = (): string => dateKey(new Date())
export const addDays = (d: Date, n: number): Date => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
export const shortDate = (k: string): string => k.slice(5).replace('-', '/')
export const longDate = (k: string): string => {
  try {
    return new Date(k + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
  } catch {
    return k
  }
}
export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
