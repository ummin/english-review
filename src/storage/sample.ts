import { sampleVideo } from '../data/sample'
import { addDays, dateKey } from '../lib/dates'
import type { ProgressRecord, Settings, Video } from '../types'
import type { AppStorage } from './types'

const K_PROGRESS = 'er-sample:progress'
const K_SETTINGS = 'er-sample:settings'
const K_YT = 'er-sample:youtube'
const K_VIDEOS = 'er-sample:videos'

const isVideo = (v: unknown): v is Video =>
  typeof v === 'object' && v !== null && typeof (v as Video).id === 'string' && typeof (v as Video).youtubeId === 'string' && Array.isArray((v as Video).cards)

function read<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key)
    return v == null ? null : (JSON.parse(v) as T)
  } catch {
    return null
  }
}
function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* 저장 실패는 무시 (개인정보 보호 모드 등) */
  }
}

/** 처음 열었을 때 연속일·복습 화면이 보이도록 어제·그저께 기록을 몇 개 넣는다. (샘플 전용) */
function seed(): Record<string, ProgressRecord> {
  const y = dateKey(addDays(new Date(), -1))
  const y2 = dateKey(addDays(new Date(), -2))
  const v = sampleVideo.id
  const rec = (dates: string[]): ProgressRecord => ({ videoId: v, dates, star: false, offset: 0 })
  return {
    [`${v}-e1`]: rec([y2, y]),
    [`${v}-e1-r1`]: rec([y]),
    [`${v}-e2`]: rec([y]),
    [`${v}-e3`]: rec([y2]),
  }
}

export function createSampleStorage(): AppStorage {
  return {
    async loadVideos() {
      const video = structuredClone(sampleVideo)
      // 주소 뒤에 ?v=영상ID 를 붙여 열면 샘플 카드로 그 영상을 재생해 볼 수 있다. (퍼가기 허용 여부 확인용)
      const q = new URLSearchParams(location.search).get('v')
      if (q && /^[A-Za-z0-9_-]{11}$/.test(q)) write(K_YT, q)
      const yt = read<string>(K_YT)
      if (yt && /^[A-Za-z0-9_-]{11}$/.test(yt)) video.youtubeId = yt
      const mine = (read<unknown[]>(K_VIDEOS) ?? []).filter(isVideo)
      return [video, ...mine]
    },
    async saveVideo(v) {
      const mine = (read<unknown[]>(K_VIDEOS) ?? []).filter(isVideo).filter((x) => x.id !== v.id)
      write(K_VIDEOS, [...mine, v])
    },
    async deleteVideo(id) {
      const mine = (read<unknown[]>(K_VIDEOS) ?? []).filter(isVideo).filter((x) => x.id !== id)
      write(K_VIDEOS, mine)
    },
    async setShare() {
      throw new Error('로그인이 필요해요')
    },
    async getShared() {
      return null
    },
    async loadProgress() {
      return read<Record<string, ProgressRecord>>(K_PROGRESS) ?? seed()
    },
    async saveProgress(cardId, rec) {
      const all = read<Record<string, ProgressRecord>>(K_PROGRESS) ?? seed()
      all[cardId] = rec
      write(K_PROGRESS, all)
    },
    async loadSettings() {
      return read<Settings>(K_SETTINGS) ?? { dailyGoal: 10 }
    },
    async saveSettings(s) {
      write(K_SETTINGS, s)
    },
  }
}
