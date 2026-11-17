/** [시작초, 끝초] */
export type Seg = [number, number]

export interface SubCard {
  id: string
  kind: 'reply' | 'alt'
  en: string
  ko: string
  t: Seg | null
  restored: boolean
}

export interface Card {
  id: string
  en: string
  ko: string
  note: string
  stress: string[]
  native: Seg | null
  explain: Seg | null
  role: Seg | null
  subs: SubCard[]
}

export interface Video {
  id: string
  youtubeId: string
  title: string
  createdAt: number
  cards: Card[]
  /** 공유 링크 코드. 없으면 공유하지 않는 영상 */
  shareId?: string
}

/** 공유 링크로 받은 영상(내 기록 없음) */
export interface SharedVideo {
  title: string
  youtubeId: string
  cards: Card[]
}

/** 카드 하나(질문 또는 대답)에 대한 내 기록 */
export interface ProgressRecord {
  videoId: string
  dates: string[] // YYYY-MM-DD, 오름차순
  star: boolean
  offset: number // 재생 시작 보정(초)
}

export interface Settings {
  dailyGoal: number
}

/** 화면에서 쓰기 편하게 펼친 항목 */
export interface ExprItem {
  kind: 'expr'
  id: string
  videoId: string
  n: number
  en: string
  ko: string
  note: string
  stress: string[]
  segs: { native: Seg | null; explain: Seg | null; role: Seg | null }
  subs: SubItem[]
}

export interface SubItem {
  kind: 'reply' | 'alt'
  id: string
  videoId: string
  en: string
  ko: string
  restored: boolean
  seg: Seg | null
  parent: ExprItem
}

export type Item = ExprItem | SubItem
export type Filter = 'all' | 'todo' | 'star'
