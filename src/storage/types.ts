import type { ProgressRecord, Settings, SharedVideo, Video } from '../types'

/**
 * 화면은 이 인터페이스만 사용한다.
 * 지금은 샘플 구현이고, 5단계에서 Supabase 구현으로 바꾼다.
 */
export interface AppStorage {
  loadVideos(): Promise<Video[]>
  /** 영상(과 카드)을 새로 저장하거나 덮어쓴다. */
  saveVideo(v: Video): Promise<void>
  deleteVideo(id: string): Promise<void>
  /** 공유 링크를 켜거나(코드) 끈다(null). */
  setShare(videoId: string, shareId: string | null): Promise<void>
  /** 공유 코드로 영상 한 편을 가져온다. 없으면 null. */
  getShared(code: string): Promise<SharedVideo | null>
  loadProgress(): Promise<Record<string, ProgressRecord>>
  saveProgress(cardId: string, rec: ProgressRecord): Promise<void>
  loadSettings(): Promise<Settings>
  saveSettings(s: Settings): Promise<void>
}
