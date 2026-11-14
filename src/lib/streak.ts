import { dateKey, addDays } from './dates'

/** 연속 공부일 수. 오늘 아직 안 했으면 어제부터 이어진 날수를 센다. */
export function streakDays(dates: Iterable<string>, today: Date = new Date()): number {
  const set = new Set(dates)
  let cur = set.has(dateKey(today)) ? today : addDays(today, -1)
  let n = 0
  while (set.has(dateKey(cur))) {
    n++
    cur = addDays(cur, -1)
  }
  return n
}
