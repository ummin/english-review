const pad = (n: number) => String(n).padStart(2, '0')

/** 로컬 날짜를 YYYY-MM-DD로 바꾼다. */
export const dateKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/**
 * 연속 공부일 수를 센다. 오늘 아직 안 했으면 어제부터 이어진 날수를 센다.
 */
export function streakDays(dates: Iterable<string>, today: Date = new Date()): number {
  const set = new Set(dates)
  const cur = new Date(today)
  if (!set.has(dateKey(cur))) cur.setDate(cur.getDate() - 1)
  let n = 0
  while (set.has(dateKey(cur))) {
    n++
    cur.setDate(cur.getDate() - 1)
  }
  return n
}
