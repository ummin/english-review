import { uid } from './id'
import type { Card, Seg, SubCard, Video } from '../types'

/** AI 가 만든 결과(또는 공유받은 카드 파일)를 읽어 카드로 바꾼다. id 는 나중에 붙인다. */
export type ParsedSub = Omit<SubCard, 'id'>
export type ParsedCard = Omit<Card, 'id' | 'subs'> & { subs: ParsedSub[] }
export interface ParsedFile {
  title: string
  youtubeId: string
  cards: ParsedCard[]
}
export type ParseResult = { ok: true; data: ParsedFile; warnings: string[] } | { ok: false; errors: string[] }

export const MAX_CARDS = 200
const MAX_EN = 500
const MAX_NOTE = 1000

/** 17, "1:05", "1:02:03", "65.5" → 초. 읽을 수 없으면 null */
export function parseTime(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 ? v : null
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (!/^\d+(\.\d+)?(:\d{1,2}(\.\d+)?){0,2}$/.test(s)) return null
  const parts = s.split(':').map(Number)
  return parts.reduce((acc, n) => acc * 60 + n, 0)
}

/** 유튜브 주소나 영상 ID 에서 11자리 ID 를 뽑는다. */
export function parseYoutubeId(input: string): string | null {
  const s = input.trim()
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s
  let u: URL
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`)
  } catch {
    return null
  }
  const host = u.hostname.replace(/^(www|m|music)\./, '')
  let id: string | null = null
  if (host === 'youtu.be') id = u.pathname.split('/')[1] ?? null
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/)
    id = m ? m[1]! : u.searchParams.get('v')
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null
}

/** 설명글이나 ```json 울타리가 섞여 있어도 JSON 부분만 꺼낸다. */
function extractJson(text: string): unknown {
  let t = text.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1]!.trim()
  const open = t.search(/[{[]/)
  if (open < 0) throw new Error('JSON 을 찾지 못했어요')
  const close = t.lastIndexOf(t[open] === '{' ? '}' : ']')
  if (close <= open) throw new Error('JSON 이 끝까지 오지 않았어요')
  const body = t.slice(open, close + 1)
  try {
    return JSON.parse(body)
  } catch {
    // 채팅 앱이 따옴표를 둥근 따옴표로 바꾸는 경우를 한 번 고쳐 본다.
    return JSON.parse(body.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"))
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function seg(v: unknown, where: string, errors: string[]): Seg | null {
  if (v == null) return null
  if (!Array.isArray(v) || v.length !== 2) {
    errors.push(`${where}: 시간은 [시작, 끝] 두 개여야 해요`)
    return null
  }
  const a = parseTime(v[0])
  const b = parseTime(v[1])
  if (a == null || b == null) {
    errors.push(`${where}: 시간을 읽을 수 없어요 (예: 75 또는 "1:15")`)
    return null
  }
  if (b <= a) {
    errors.push(`${where}: 끝 시간이 시작 시간보다 커야 해요`)
    return null
  }
  return [a, b]
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

export function parseCardFile(text: string): ParseResult {
  if (!text.trim()) return { ok: false, errors: ['붙여 넣은 내용이 비어 있어요'] }
  let raw: unknown
  try {
    raw = extractJson(text)
  } catch (e) {
    return { ok: false, errors: [`JSON 형식이 아니에요. AI 답변 전체를 복사했는지 확인해 주세요. (${e instanceof Error ? e.message : '읽기 실패'})`] }
  }
  const root = Array.isArray(raw) ? { cards: raw } : isObj(raw) ? raw : null
  if (!root || !Array.isArray(root.cards)) return { ok: false, errors: ['"cards" 목록을 찾지 못했어요'] }
  if (root.cards.length === 0) return { ok: false, errors: ['카드가 하나도 없어요'] }
  if (root.cards.length > MAX_CARDS) return { ok: false, errors: [`한 번에 ${MAX_CARDS}장까지만 넣을 수 있어요`] }

  const errors: string[] = []
  const warnings: string[] = []
  const cards: ParsedCard[] = []
  root.cards.forEach((c: unknown, i: number) => {
    const w = `카드 ${i + 1}`
    if (!isObj(c)) { errors.push(`${w}: 형식이 올바르지 않아요`); return }
    const en = str(c.en)
    if (!en) { errors.push(`${w}: 영어 문장(en)이 비어 있어요`); return }
    if (en.length > MAX_EN) { errors.push(`${w}: 영어 문장이 너무 길어요`); return }
    const note = str(c.note)
    if (note.length > MAX_NOTE) { errors.push(`${w}: 메모(note)가 너무 길어요`); return }
    const ko = str(c.ko)
    if (!ko) warnings.push(`${w}: 한국어 뜻(ko)이 없어요`)
    const stress = Array.isArray(c.stress)
      ? c.stress.filter((s): s is string => typeof s === 'string').map((s) => s.trim()).filter(Boolean)
      : typeof c.stress === 'string' ? c.stress.split(',').map((s) => s.trim()).filter(Boolean) : []
    const subs: ParsedSub[] = []
    if (c.subs != null && !Array.isArray(c.subs)) errors.push(`${w}: subs 는 목록이어야 해요`)
    else (c.subs as unknown[] | undefined)?.forEach((s, k) => {
      const sw = `${w} · 대답/비슷한 표현 ${k + 1}`
      if (!isObj(s)) { errors.push(`${sw}: 형식이 올바르지 않아요`); return }
      const sen = str(s.en)
      if (!sen) { errors.push(`${sw}: 영어 문장(en)이 비어 있어요`); return }
      if (sen.length > MAX_EN) { errors.push(`${sw}: 영어 문장이 너무 길어요`); return }
      if (s.kind != null && s.kind !== 'reply' && s.kind !== 'alt') warnings.push(`${sw}: kind 는 "reply" 또는 "alt" 여야 해서 대답으로 처리했어요`)
      subs.push({ kind: s.kind === 'alt' ? 'alt' : 'reply', en: sen, ko: str(s.ko), t: seg(s.t, `${sw}의 시간(t)`, errors), restored: s.restored === true })
    })
    cards.push({
      en, ko, note, stress,
      native: seg(c.native, `${w}의 native`, errors),
      explain: seg(c.explain, `${w}의 explain`, errors),
      role: seg(c.role, `${w}의 role`, errors),
      subs,
    })
  })
  if (errors.length) return { ok: false, errors }
  const yt = typeof root.youtubeId === 'string' ? parseYoutubeId(root.youtubeId) : null
  return { ok: true, data: { title: str(root.title).slice(0, 100), youtubeId: yt ?? '', cards }, warnings }
}

/** 파싱한 카드에 id 를 붙인다. 한 번 쓴 id 는 다시 쓰지 않도록 무작위 글자를 쓴다. */
export function withIds(videoId: string, cards: ParsedCard[], taken: Set<string> = new Set()): Card[] {
  const fresh = (prefix: string) => {
    let id: string
    do id = `${videoId}-${prefix}${uid(6)}`; while (taken.has(id))
    taken.add(id)
    return id
  }
  return cards.map((c) => ({ ...c, id: fresh('e'), subs: c.subs.map((s) => ({ ...s, id: fresh('r') })) }))
}

/** 공유용 카드 파일. 내 진행 기록은 넣지 않는다. */
export function toCardFile(v: Pick<Video, 'title' | 'youtubeId' | 'cards'>): string {
  const out = {
    app: 'english-review',
    version: 1,
    title: v.title,
    youtubeId: v.youtubeId,
    cards: v.cards.map((c) => ({
      en: c.en, ko: c.ko, note: c.note, stress: c.stress, native: c.native, explain: c.explain, role: c.role,
      subs: c.subs.map((s) => ({ kind: s.kind, en: s.en, ko: s.ko, t: s.t, restored: s.restored })),
    })),
  }
  return JSON.stringify(out, null, 2)
}

export function fileNameFor(title: string): string {
  const base = title.replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'cards'
  return `${base}.cards.json`
}
