import { describe, expect, it } from 'vitest'
import { highlightParts, fmt } from '../../src/lib/text'
import { takeSnapshot, isDimmed } from '../../src/lib/filter'
import { buildIndex } from '../../src/lib/items'
import { sampleVideo } from '../../src/data/sample'

describe('text', () => {
  it('fmt', () => {
    expect(fmt(59)).toBe('0:59')
    expect(fmt(65)).toBe('1:05')
    expect(fmt(3725)).toBe('1:02:05')
  })
  it('강세 단어를 표시한다', () => {
    const hit = highlightParts('Is this seat taken?', ['seat', 'taken']).filter((p) => p.hit).map((p) => p.text)
    expect(hit).toEqual(['seat', 'taken?'])
  })
})

describe('filter snapshot', () => {
  const { exprs } = buildIndex([sampleVideo])
  const e1 = exprs[0]!, e2 = exprs[1]!
  const none = () => false

  it('전체는 모두 보인다', () => {
    const s = takeSnapshot(exprs, 'all', none, none)
    expect(s.full.size).toBe(exprs.length)
  })
  it('남은 문장: 질문만 끝났고 대답이 남으면 keep', () => {
    const done = new Set([e1.id])
    const s = takeSnapshot(exprs, 'todo', (id) => done.has(id), none)
    expect(s.full.has(e1.id)).toBe(false)
    expect(s.keep.has(e1.id)).toBe(true)
    expect(s.subs.has(e1.subs[0]!.id)).toBe(true)
  })
  it('남은 문장: 전부 끝나면 목록에서 빠진다', () => {
    const done = new Set([e1.id, ...e1.subs.map((x) => x.id)])
    const s = takeSnapshot(exprs, 'todo', (id) => done.has(id), none)
    expect(s.full.has(e1.id) || s.keep.has(e1.id)).toBe(false)
    expect(s.full.has(e2.id)).toBe(true)
  })
  it('흐림 판정', () => {
    expect(isDimmed('todo', 'a', () => true, none)).toBe(true)
    expect(isDimmed('todo', 'a', none, none)).toBe(false)
    expect(isDimmed('star', 'a', none, none)).toBe(true)
    expect(isDimmed('all', 'a', () => true, none)).toBe(false)
  })
})
