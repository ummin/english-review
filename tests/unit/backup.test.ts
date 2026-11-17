import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { makeBackup, parseBackup } from '../../src/lib/backup'
import { importShared } from '../../src/lib/cardfile'
import { rowToVideo } from '../../src/storage/supabase'
import type { Video } from '../../src/types'

const card = (id: string) => ({ id, en: 'Hello', ko: '안녕', note: '', stress: [], native: [1, 2] as [number, number], explain: null, role: null, subs: [{ id: id + '-r1', kind: 'reply' as const, en: 'Hi', ko: '안녕', t: null, restored: false }] })
const video: Video = { id: 'v1', youtubeId: 'dQw4w9WgXcQ', title: '제목', createdAt: 5, cards: [card('v1-e1'), card('v1-e2')] }

describe('backup', () => {
  it('저장했다가 읽으면 카드 id 와 기록이 그대로다', () => {
    const t = makeBackup([video], { 'v1-e1': { videoId: 'v1', dates: ['2026-01-02', '2026-01-01'], star: true, offset: 3 } }, { dailyGoal: 7 })
    const r = parseBackup(t)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.videos[0]!.cards.map((c) => c.id)).toEqual(['v1-e1', 'v1-e2'])
    expect(r.videos[0]!.cards[0]!.subs[0]!.id).toBe('v1-e1-r1')
    expect(r.progress['v1-e1']).toEqual({ videoId: 'v1', dates: ['2026-01-01', '2026-01-02'], star: true, offset: 3 })
    expect(r.settings).toEqual({ dailyGoal: 7 })
  })
  it('잘못된 파일은 거절한다', () => {
    for (const bad of ['x', '{}', '{"app":"english-review-backup","version":2,"videos":[]}', JSON.stringify({ app: 'english-review-backup', version: 1, videos: [{ id: 'a b', title: 't', youtubeId: 'dQw4w9WgXcQ', cards: [] }] })])
      expect(parseBackup(bad).ok).toBe(false)
  })
  it('기록 값은 범위를 벗어나면 다듬고, 이상한 항목은 버린다', () => {
    const t = JSON.stringify({ app: 'english-review-backup', version: 1, videos: [], progress: { a: { videoId: 'v', dates: ['2026-01-01', 'zz', 3], star: 1, offset: 999 }, 'b c': { videoId: 'v', dates: [] }, d: null }, settings: { dailyGoal: 999 } })
    const r = parseBackup(t)
    expect(r.ok && r.progress).toEqual({ a: { videoId: 'v', dates: ['2026-01-01'], star: true, offset: 60 } })
    expect(r.ok && r.settings).toBeNull()
  })
})

describe('importShared', () => {
  it('새 id 를 붙이고, 쓸 수 없는 데이터는 null', () => {
    const v = importShared({ title: 't', youtubeId: 'dQw4w9WgXcQ', cards: video.cards })!
    expect(v.id).not.toBe('v1')
    expect(v.cards.every((c) => c.id.startsWith(v.id + '-e') && c.subs.every((s) => s.id.startsWith(v.id + '-r')))).toBe(true)
    expect(importShared({ title: 't', youtubeId: 'bad', cards: video.cards })).toBeNull()
    expect(importShared({ title: 't', youtubeId: 'dQw4w9WgXcQ', cards: [{ ...video.cards[0]!, en: '' }] })).toBeNull()
  })
})

describe('공유 스키마', () => {
  it('rowToVideo 가 share_id 를 읽는다', () => {
    expect(rowToVideo({ id: 'a', youtube_id: 'x', title: 't', created_ms: 1, cards: [], share_id: 'abc' }).shareId).toBe('abc')
    expect('shareId' in rowToVideo({ id: 'a', youtube_id: 'x', title: 't', created_ms: 1, cards: [], share_id: null })).toBe(false)
  })
  it('schema.sql: 공유 함수는 로그인한 사람만 실행하고 anon 은 막는다', () => {
    const sql = readFileSync('supabase/schema.sql', 'utf8')
    expect(sql).toMatch(/function public\.get_shared_video\(code text\)/)
    expect(sql).toMatch(/security\s+definer/)
    expect(sql).toMatch(/revoke all on function public\.get_shared_video\(text\) from public, anon/)
    expect(sql).toMatch(/grant execute on function public\.get_shared_video\(text\) to authenticated/)
  })
})
