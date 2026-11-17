import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { storage } from '../storage'
import { streakDays } from '../lib/streak'
import { todayKey } from '../lib/dates'
import { useUiStore } from './ui'
import type { ProgressRecord } from '../types'

export const useProgressStore = defineStore('progress', () => {
  const records = ref<Record<string, ProgressRecord>>({})

  async function load() {
    records.value = await storage.loadProgress()
  }

  const datesOf = (id: string): string[] => records.value[id]?.dates ?? []
  const ever = (id: string) => datesOf(id).length > 0
  const doneToday = (id: string) => datesOf(id).includes(todayKey())
  const isStar = (id: string) => !!records.value[id]?.star
  const offsetOf = (id: string) => records.value[id]?.offset ?? 0

  function patch(id: string, videoId: string, p: Partial<ProgressRecord>) {
    const cur = records.value[id] ?? { videoId, dates: [], star: false, offset: 0 }
    const next: ProgressRecord = { ...cur, ...p, videoId }
    records.value = { ...records.value, [id]: next }
    storage.saveProgress(id, next).catch(() => useUiStore().say('저장하지 못했어요. 인터넷 연결을 확인해 주세요.'))
  }

  /** 오늘 완료를 켜거나 끈다(취소). 새로 완료했으면 true. */
  function toggleToday(id: string, videoId: string): boolean {
    const t = todayKey()
    const dates = datesOf(id).slice()
    const i = dates.indexOf(t)
    if (i >= 0) {
      dates.splice(i, 1)
      patch(id, videoId, { dates })
      return false
    }
    dates.push(t)
    dates.sort()
    patch(id, videoId, { dates })
    return true
  }
  const toggleStar = (id: string, videoId: string) => patch(id, videoId, { star: !isStar(id) })
  const adjustOffset = (id: string, videoId: string, d: number) =>
    patch(id, videoId, { offset: Math.max(-60, Math.min(60, offsetOf(id) + d)) })

  const allDates = computed(() => {
    const s = new Set<string>()
    for (const r of Object.values(records.value)) r.dates.forEach((d) => s.add(d))
    return s
  })
  const streak = computed(() => streakDays(allDates.value))
  const todayCount = computed(() => {
    const t = todayKey()
    return Object.values(records.value).filter((r) => r.dates.includes(t)).length
  })
  /** 기록이 있는 모든 날짜(오늘 포함), 최근 순 */
  const reviewDatesAll = computed(() => [...allDates.value].sort().reverse())
  /** 오늘 이전 날짜만, 최근 순 */
  const pastDates = computed(() => reviewDatesAll.value.filter((d) => d < todayKey()))

  return { records, load, datesOf, ever, doneToday, isStar, offsetOf, toggleToday, toggleStar, adjustOffset, allDates, streak, todayCount, reviewDatesAll, pastDates }
})
