import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { setPlayerFactory } from '../../src/stores/player'
import { usePlayerStore } from '../../src/stores/player'
import type { PlayerEvents, PlayerHandle } from '../../src/lib/youtube'

let ev: PlayerEvents
const calls: unknown[][] = []
let created = 0
let host: HTMLElement

beforeEach(() => {
  vi.useFakeTimers()
  calls.length = 0
  created = 0
  setActivePinia(createPinia())
  host = document.createElement('div')
  setPlayerFactory(async (_h, e) => {
    created++
    ev = e
    const handle: PlayerHandle = {
      load: (...a) => calls.push(['load', ...a]),
      setRate: (r) => calls.push(['rate', r]),
      destroy: () => calls.push(['destroy']),
    }
    return handle
  })
})
let cur: ReturnType<typeof usePlayerStore> | null = null
afterEach(() => {
  cur?.close()
  cur = null
  vi.useRealTimers()
})

const setup = () => {
  const p = usePlayerStore()
  p.registerHost(host)
  cur = p
  return p
}

describe('player store', () => {
  it('구간을 재생하고, 다른 구간을 눌러도 플레이어는 하나만 만든다', async () => {
    const p = setup()
    await p.requestPlay('VID', [10, 16], '원어민')
    await p.requestPlay('VID', [20, 30], '설명')
    expect(created).toBe(1)
    expect(calls.filter((c) => c[0] === 'load')).toEqual([['load', 'VID', 10, 16], ['load', 'VID', 20, 30]])
    expect(p.label).toBe('설명')
  })

  it('재생이 시작되면 playing, 구간이 끝나면 ended(자동 정지)', async () => {
    const p = setup()
    await p.requestPlay('VID', [10, 16], '원어민')
    expect(p.status).toBe('loading')
    ev.onState(1)
    expect(p.status).toBe('playing')
    ev.onState(0)
    expect(p.status).toBe('ended')
  })

  it('반복을 켜면 끝날 때 같은 구간을 다시 재생한다', async () => {
    const p = setup()
    await p.requestPlay('VID', [10, 16], '원어민')
    p.toggleLoop()
    ev.onState(0)
    expect(calls.filter((c) => c[0] === 'load').length).toBe(2)
    p.toggleLoop()
    ev.onState(0)
    expect(calls.filter((c) => c[0] === 'load').length).toBe(2)
    expect(p.status).toBe('ended')
  })

  it('0.75배속은 재생 시작 때도 다시 적용된다', async () => {
    const p = setup()
    await p.requestPlay('VID', [10, 16], '원어민')
    p.setRate(0.75)
    expect(calls).toContainEqual(['rate', 0.75])
    calls.length = 0
    ev.onState(1)
    expect(calls).toContainEqual(['rate', 0.75])
  })

  it('퍼가기가 막힌 영상은 안내와 유튜브 링크로 바뀐다', async () => {
    const p = setup()
    await p.requestPlay('VID', [75, 80], '설명')
    ev.onError(150)
    expect(p.status).toBe('blocked')
    expect(p.message).toContain('막혀')
    expect(p.ytLink).toBe('https://youtu.be/VID?t=75')
  })

  it('없는 영상은 다른 안내를 보여준다', async () => {
    const p = setup()
    await p.requestPlay('VID', [1, 5], '설명')
    ev.onError(100)
    expect(p.message).toContain('찾을 수 없어요')
  })

  it('2초 안에 재생이 시작되지 않으면 눌러 달라는 안내를 띄운다', async () => {
    const p = setup()
    await p.requestPlay('VID', [10, 16], '원어민')
    vi.advanceTimersByTime(2100)
    expect(p.status).toBe('needtap')
    ev.onState(1)
    expect(p.status).toBe('playing')
  })

  it('플레이어를 만들지 못하면 막힘 안내', async () => {
    setPlayerFactory(async () => { throw new Error('x') })
    const p = setup()
    await p.requestPlay('VID', [10, 16], '원어민')
    expect(p.status).toBe('blocked')
  })

  it('닫으면 플레이어를 없애고 다음에 새로 만든다', async () => {
    const p = setup()
    await p.requestPlay('VID', [10, 16], '원어민')
    p.close()
    expect(calls).toContainEqual(['destroy'])
    expect(p.open).toBe(false)
    p.registerHost(host)
    await p.requestPlay('VID', [10, 16], '원어민')
    expect(created).toBe(2)
  })
})
