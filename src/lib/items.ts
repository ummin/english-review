import type { ExprItem, Item, SubItem, Video } from '../types'

export interface Index {
  items: Item[]
  exprs: ExprItem[]
  map: Map<string, Item>
}

/** 영상 목록을 화면에서 쓰기 쉬운 평평한 목록으로 바꾼다. */
export function buildIndex(videos: Video[]): Index {
  const items: Item[] = []
  const exprs: ExprItem[] = []
  const map = new Map<string, Item>()
  const sorted = [...videos].sort((a, b) => a.createdAt - b.createdAt)
  for (const v of sorted) {
    v.cards.forEach((c, i) => {
      const e: ExprItem = {
        kind: 'expr', id: c.id, videoId: v.id, n: i + 1, en: c.en, ko: c.ko, note: c.note,
        stress: c.stress, segs: { native: c.native, explain: c.explain, role: c.role }, subs: [],
      }
      items.push(e); exprs.push(e); map.set(e.id, e)
      for (const s of c.subs) {
        const it: SubItem = { kind: s.kind, id: s.id, videoId: v.id, en: s.en, ko: s.ko, restored: s.restored, seg: s.t, parent: e }
        e.subs.push(it); items.push(it); map.set(it.id, it)
      }
    })
  }
  return { items, exprs, map }
}
