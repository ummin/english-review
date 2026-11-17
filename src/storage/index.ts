import { createSampleStorage } from './sample'
import type { AppStorage } from './types'

export type { AppStorage }

/** 로그인 전에는 이 기기(localStorage), 로그인 후에는 Supabase 저장소를 쓴다. 화면은 이 `storage`만 본다. */
let current: AppStorage = createSampleStorage()
export function setStorage(next: AppStorage) {
  current = next
}
export const storage: AppStorage = {
  loadVideos: () => current.loadVideos(),
  saveVideo: (v) => current.saveVideo(v),
  deleteVideo: (id) => current.deleteVideo(id),
  loadProgress: () => current.loadProgress(),
  saveProgress: (id, r) => current.saveProgress(id, r),
  loadSettings: () => current.loadSettings(),
  saveSettings: (s) => current.saveSettings(s),
}
