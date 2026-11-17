import type { SupabaseClient } from '@supabase/supabase-js'
import { sampleVideo } from '../data/sample'
import type { Card, ProgressRecord, Settings, SharedVideo, Video } from '../types'
import type { AppStorage } from './types'

/** DB 한 줄 ↔ 앱 데이터 변환 (순수 함수라 따로 테스트한다) */
export interface VideoRow { id: string; youtube_id: string; title: string; created_ms: number; cards: Card[]; share_id?: string | null }
export interface ProgressRow { card_id: string; video_id: string; dates: string[]; star: boolean; offset_sec: number }

export const videoToRow = (userId: string, v: Video) => ({ user_id: userId, id: v.id, youtube_id: v.youtubeId, title: v.title, created_ms: v.createdAt, cards: v.cards })
export const rowToVideo = (r: VideoRow): Video => ({ id: r.id, youtubeId: r.youtube_id, title: r.title, createdAt: Number(r.created_ms), cards: Array.isArray(r.cards) ? r.cards : [], ...(r.share_id ? { shareId: r.share_id } : {}) })
export const progressToRow = (userId: string, cardId: string, p: ProgressRecord) => ({ user_id: userId, card_id: cardId, video_id: p.videoId, dates: p.dates, star: p.star, offset_sec: p.offset })
export const rowToProgress = (r: ProgressRow): ProgressRecord => ({ videoId: r.video_id, dates: Array.isArray(r.dates) ? [...r.dates].sort() : [], star: !!r.star, offset: Number(r.offset_sec) || 0 })

const PAGE = 1000

function fail(what: string, error: { message: string } | null): asserts error is null {
  if (error) throw new Error(`${what}: ${error.message}`)
}

/** 로그인한 사용자의 Supabase 저장소. 내 행만 보이는 것은 DB의 RLS가 보장한다. */
export function createSupabaseStorage(client: SupabaseClient, userId: string): AppStorage {
  return {
    async loadVideos() {
      const rows: VideoRow[] = []
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await client.from('videos').select('id,youtube_id,title,created_ms,cards,share_id').order('created_ms').order('id').range(from, from + PAGE - 1)
        fail('영상 불러오기', error)
        rows.push(...(data as VideoRow[]))
        if (data.length < PAGE) break
      }
      return [structuredClone(sampleVideo), ...rows.map(rowToVideo)]
    },
    async saveVideo(v) {
      const { error } = await client.from('videos').upsert(videoToRow(userId, v), { onConflict: 'user_id,id' })
      fail('영상 저장', error)
    },
    async deleteVideo(id) {
      const { error } = await client.from('videos').delete().eq('user_id', userId).eq('id', id)
      fail('영상 삭제', error)
    },
    async setShare(videoId, shareId) {
      const { error } = await client.from('videos').update({ share_id: shareId }).eq('user_id', userId).eq('id', videoId)
      fail('공유 설정', error)
    },
    async getShared(code) {
      const { data, error } = await client.rpc('get_shared_video', { code })
      fail('공유 영상 불러오기', error)
      const r = (data as { title: string; youtube_id: string; cards: Card[] }[] | null)?.[0]
      if (!r) return null
      const out: SharedVideo = { title: r.title, youtubeId: r.youtube_id, cards: Array.isArray(r.cards) ? r.cards : [] }
      return out
    },
    async loadProgress() {
      const out: Record<string, ProgressRecord> = {}
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await client.from('progress').select('card_id,video_id,dates,star,offset_sec').order('card_id').range(from, from + PAGE - 1)
        fail('기록 불러오기', error)
        for (const r of data as ProgressRow[]) out[r.card_id] = rowToProgress(r)
        if (data.length < PAGE) break
      }
      return out
    },
    async saveProgress(cardId, rec) {
      const { error } = await client.from('progress').upsert(progressToRow(userId, cardId, rec), { onConflict: 'user_id,card_id' })
      fail('기록 저장', error)
    },
    async loadSettings(): Promise<Settings> {
      const { data, error } = await client.from('settings').select('daily_goal').limit(1)
      fail('설정 불러오기', error)
      const g = Number((data as { daily_goal: number }[])[0]?.daily_goal)
      return { dailyGoal: Number.isFinite(g) && g >= 1 ? g : 10 }
    },
    async saveSettings(s) {
      const { error } = await client.from('settings').upsert({ user_id: userId, daily_goal: s.dailyGoal }, { onConflict: 'user_id' })
      fail('설정 저장', error)
    },
  }
}
