import type { ProgressRecord, Settings, Video } from '../types'
import { parseCardFile, toCardFile } from './cardfile'

export interface Backup {
  app: 'english-review-backup'
  version: 1
  savedAt: string
  videos: Video[]
  progress: Record<string, ProgressRecord>
  settings: Settings
}

export function makeBackup(videos: Video[], progress: Record<string, ProgressRecord>, settings: Settings, now = new Date()): string {
  const b: Backup = { app: 'english-review-backup', version: 1, savedAt: now.toISOString(), videos, progress, settings }
  return JSON.stringify(b)
}

export type BackupResult = { ok: true; videos: Video[]; progress: Record<string, ProgressRecord>; settings: Settings | null } | { ok: false; error: string }

const DATE = /^\d{4}-\d{2}-\d{2}$/
const ID = /^[^\s]{1,64}$/

/** 백업 파일을 읽고 검사한다. 카드는 카드 파일과 같은 검사를 거치되 id 는 그대로 둔다. */
export function parseBackup(text: string): BackupResult {
  let raw: unknown
  try { raw = JSON.parse(text) } catch { return { ok: false, error: '백업 파일이 아니에요. (JSON을 읽을 수 없어요)' } }
  const b = raw as Partial<Backup> | null
  if (!b || typeof b !== 'object' || b.app !== 'english-review-backup' || b.version !== 1 || !Array.isArray(b.videos)) return { ok: false, error: '이 앱의 백업 파일이 아니에요.' }
  if (b.videos.length > 200) return { ok: false, error: '영상이 너무 많아요. (200개 이하)' }
  const videos: Video[] = []
  for (const v of b.videos as Video[]) {
    if (!v || typeof v.id !== 'string' || !ID.test(v.id) || v.id.length > 64) return { ok: false, error: '영상 정보가 잘못된 백업이에요.' }
    const checked = parseCardFile(toCardFile({ title: String(v.title ?? ''), youtubeId: String(v.youtubeId ?? ''), cards: Array.isArray(v.cards) ? v.cards : [] }))
    if (!checked.ok) return { ok: false, error: `'${String(v.title).slice(0, 20)}' 영상의 카드를 읽을 수 없어요.` }
    // 검사를 통과한 값으로 다시 만들되, 카드 id 는 기록과 이어지도록 원본을 유지한다.
    if (checked.data.cards.length !== v.cards.length || checked.data.cards.some((c, i) => c.subs.length !== v.cards[i]!.subs?.length)) return { ok: false, error: `'${String(v.title).slice(0, 20)}' 영상의 카드를 읽을 수 없어요.` }
    const cards = checked.data.cards.map((c, i) => {
      const o = v.cards[i]!
      return { ...c, id: String(o.id), subs: c.subs.map((s, j) => ({ ...s, id: String(o.subs[j]!.id) })) }
    })
    if (cards.some((c) => !ID.test(c.id) || c.subs.some((s) => !ID.test(s.id)))) return { ok: false, error: '카드 정보가 잘못된 백업이에요.' }
    videos.push({ id: v.id, youtubeId: String(v.youtubeId), title: String(v.title).slice(0, 100), createdAt: Number(v.createdAt) || Date.now(), cards })
  }
  const progress: Record<string, ProgressRecord> = {}
  for (const [k, p] of Object.entries(b.progress ?? {})) {
    if (!ID.test(k) || k.length > 96 || !p || typeof p.videoId !== 'string') continue
    const dates = Array.isArray(p.dates) ? [...new Set(p.dates.filter((d) => typeof d === 'string' && DATE.test(d)))].sort().slice(-4000) : []
    progress[k] = { videoId: p.videoId.slice(0, 64), dates, star: !!p.star, offset: Math.max(-60, Math.min(60, Math.round(Number(p.offset) || 0))) }
  }
  const g = Number((b.settings as Settings | undefined)?.dailyGoal)
  return { ok: true, videos, progress, settings: Number.isFinite(g) && g >= 1 && g <= 50 ? { dailyGoal: Math.round(g) } : null }
}
