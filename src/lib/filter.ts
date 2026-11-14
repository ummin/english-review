import type { ExprItem, Filter } from '../types'

export interface Snapshot {
  /** 질문 카드를 통째로 보여줄 id */
  full: Set<string>
  /** 질문은 요약만 보이고 대답만 남은 id */
  keep: Set<string>
  /** 보여줄 대답 id */
  subs: Set<string>
}

/**
 * 필터를 누른 순간의 목록을 고정한다. 이후 체크해도 목록에서 빠지지 않고,
 * 필터를 다시 누를 때 새로 계산한다. ("한 번이라도 체크한 문장"은 끝난 것으로 본다.)
 */
export function takeSnapshot(
  exprs: ExprItem[],
  filter: Filter,
  ever: (id: string) => boolean,
  star: (id: string) => boolean,
): Snapshot {
  const full = new Set<string>(), keep = new Set<string>(), subs = new Set<string>()
  const hit = (id: string) => (filter === 'todo' ? !ever(id) : star(id))
  for (const e of exprs) {
    if (filter === 'all') {
      full.add(e.id)
      e.subs.forEach((s) => subs.add(s.id))
      continue
    }
    const pending = e.subs.filter((s) => hit(s.id))
    if (hit(e.id)) {
      full.add(e.id)
      pending.forEach((s) => subs.add(s.id))
    } else if (pending.length) {
      keep.add(e.id)
      pending.forEach((s) => subs.add(s.id))
    }
  }
  return { full, keep, subs }
}

/** 필터가 켜진 상태에서 이미 조건을 벗어난(흐리게 보일) 항목인지 */
export function isDimmed(filter: Filter, id: string, ever: (id: string) => boolean, star: (id: string) => boolean): boolean {
  if (filter === 'todo') return ever(id)
  if (filter === 'star') return !star(id)
  return false
}
