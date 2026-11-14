import { describe, expect, it } from 'vitest'
import { streakDays } from '../../src/lib/streak'

const today = new Date(2026, 10, 14) // 2026-11-14

describe('streakDays', () => {
  it('기록이 없으면 0', () => expect(streakDays([], today)).toBe(0))
  it('오늘까지 이어진 날을 센다', () =>
    expect(streakDays(['2026-11-12', '2026-11-13', '2026-11-14'], today)).toBe(3))
  it('오늘 아직 안 했으면 어제부터 센다', () =>
    expect(streakDays(['2026-11-12', '2026-11-13'], today)).toBe(2))
  it('하루 비면 끊긴다', () =>
    expect(streakDays(['2026-11-10', '2026-11-14'], today)).toBe(1))
  it('어제도 오늘도 없으면 0', () => expect(streakDays(['2026-11-10'], today)).toBe(0))
})
