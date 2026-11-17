import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { storage } from '../storage'
import { buildIndex } from '../lib/items'
import { uid } from '../lib/id'
import { sampleVideo } from '../data/sample'
import type { Video } from '../types'

const K = 'er-ui:video'
const lsGet = (): string | null => { try { return localStorage.getItem(K) } catch { return null } }
const lsSet = (v: string) => { try { localStorage.setItem(K, v) } catch { /* 무시 */ } }

export const useLibraryStore = defineStore('library', () => {
  const videos = ref<Video[]>([])
  const currentId = ref<string | null>(lsGet())

  async function load() {
    videos.value = await storage.loadVideos()
  }
  const index = computed(() => buildIndex(videos.value))
  const items = computed(() => index.value.items)
  const exprs = computed(() => index.value.exprs)
  const current = computed(() => videos.value.find((v) => v.id === currentId.value) ?? videos.value[0] ?? null)
  function select(id: string) {
    currentId.value = id
    lsSet(id)
  }
  const isSample = (id: string) => id === sampleVideo.id
  /** 영상을 새로 만들거나 고친다. 저장에 실패하면 화면 목록도 바꾸지 않는다. */
  async function saveVideo(v: Video) {
    await storage.saveVideo(v)
    const i = videos.value.findIndex((x) => x.id === v.id)
    if (i >= 0) videos.value = videos.value.map((x) => (x.id === v.id ? v : x))
    else videos.value = [...videos.value, v]
  }
  async function removeVideo(id: string) {
    await storage.deleteVideo(id)
    videos.value = videos.value.filter((x) => x.id !== id)
    if (currentId.value === id) currentId.value = null
  }
  /** 공유 링크를 켜면 코드를, 끄면 null 을 돌려준다. 저장에 실패하면 화면도 바꾸지 않는다. */
  async function setShare(id: string, on: boolean): Promise<string | null> {
    const code = on ? (videoById(id)?.shareId ?? uid(12)) : null
    await storage.setShare(id, code)
    videos.value = videos.value.map((v) => {
      if (v.id !== id) return v
      const { shareId: _drop, ...rest } = v
      return code ? { ...rest, shareId: code } : rest
    })
    return code
  }
  const videoById = (id: string) => videos.value.find((v) => v.id === id) ?? null
  const exprsOf = (videoId: string) => exprs.value.filter((e) => e.videoId === videoId)
  const itemsOf = (videoId: string) => items.value.filter((i) => i.videoId === videoId)
  const byId = (id: string) => index.value.map.get(id)
  /** 앱 안 영상 id → 유튜브 영상 id */
  const youtubeIdOf = (videoId: string) => videos.value.find((v) => v.id === videoId)?.youtubeId ?? videoId

  return { videos, currentId, load, items, exprs, current, select, isSample, saveVideo, removeVideo, setShare, videoById, exprsOf, itemsOf, byId, youtubeIdOf }
})
