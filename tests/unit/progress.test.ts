import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useProgressStore } from '../../src/stores/progress'
import { sampleVideo } from '../../src/data/sample'
import { todayKey } from '../../src/lib/dates'

const v = sampleVideo.id

describe('progress store', () => {
  beforeEach(async () => {
    localStorage.clear()
    setActivePinia(createPinia())
    await useProgressStore().load()
  })

  it('처음 열면 어제·그저께 샘플 기록으로 연속 2일', () => {
    const p = useProgressStore()
    expect(p.streak).toBe(2)
    expect(p.todayCount).toBe(0)
    expect(p.pastDates.length).toBe(2)
  })

  it('오늘 완료하면 연속일이 늘고, 취소하면 오늘 기록만 빠진다', () => {
    const p = useProgressStore()
    const id = `${v}-e1`
    expect(p.toggleToday(id, v)).toBe(true)
    expect(p.doneToday(id)).toBe(true)
    expect(p.streak).toBe(3)
    expect(p.datesOf(id).length).toBe(3)
    expect(p.toggleToday(id, v)).toBe(false)
    expect(p.doneToday(id)).toBe(false)
    expect(p.datesOf(id).length).toBe(2)
    expect(p.streak).toBe(2)
  })

  it('복습 날짜에 오늘이 바로 들어간다', () => {
    const p = useProgressStore()
    expect(p.reviewDatesAll[0]).not.toBe(todayKey())
    p.toggleToday(`${v}-e4`, v)
    expect(p.reviewDatesAll[0]).toBe(todayKey())
    expect(p.pastDates).not.toContain(todayKey())
  })

  it('별과 시간 보정이 저장되고 한도를 넘지 않는다', () => {
    const p = useProgressStore()
    const id = `${v}-e2`
    p.toggleStar(id, v)
    expect(p.isStar(id)).toBe(true)
    for (let i = 0; i < 70; i++) p.adjustOffset(id, v, 1)
    expect(p.offsetOf(id)).toBe(60)
  })

  it('새로 불러와도 기록이 유지된다', async () => {
    const p = useProgressStore()
    p.toggleToday(`${v}-e5`, v)
    setActivePinia(createPinia())
    const q = useProgressStore()
    await q.load()
    expect(q.doneToday(`${v}-e5`)).toBe(true)
  })
})
