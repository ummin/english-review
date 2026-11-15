import { beforeEach, describe, expect, it } from 'vitest'
import { createSampleStorage } from '../../src/storage/sample'

describe('샘플 저장소', () => {
  beforeEach(() => {
    localStorage.clear()
    history.replaceState(null, '', '/')
  })
  it('기본 재생 영상', async () => {
    const [v] = await createSampleStorage().loadVideos()
    expect(v!.youtubeId).toMatch(/^[A-Za-z0-9_-]{11}$/)
  })
  it('?v=영상ID 로 열면 그 영상으로 바뀌고, 다음에도 유지된다', async () => {
    history.replaceState(null, '', '/?v=0EvDDlx2dYs')
    const s = createSampleStorage()
    expect((await s.loadVideos())[0]!.youtubeId).toBe('0EvDDlx2dYs')
    history.replaceState(null, '', '/')
    expect((await s.loadVideos())[0]!.youtubeId).toBe('0EvDDlx2dYs')
  })
  it('형식이 틀린 값은 무시한다', async () => {
    history.replaceState(null, '', '/?v=abc')
    const [v] = await createSampleStorage().loadVideos()
    expect(v!.youtubeId).not.toBe('abc')
  })
})

describe('샘플 저장소: 내 영상', () => {
  const mk = (id: string) => ({ id, youtubeId: 'aqz-KE-bpKQ', title: id, createdAt: 5, cards: [] })
  beforeEach(() => { localStorage.clear(); history.replaceState(null, '', '/') })
  it('저장하면 샘플 뒤에 붙고, 같은 id 로 다시 저장하면 덮어쓴다', async () => {
    const s = createSampleStorage()
    await s.saveVideo(mk('a'))
    await s.saveVideo({ ...mk('a'), title: '바뀜' })
    await s.saveVideo(mk('b'))
    const v = await s.loadVideos()
    expect(v.map((x) => x.id)).toEqual(['SAMPLE00001', 'a', 'b'])
    expect(v[1]!.title).toBe('바뀜')
  })
  it('삭제하면 사라지고 샘플은 그대로다', async () => {
    const s = createSampleStorage()
    await s.saveVideo(mk('a'))
    await s.deleteVideo('a')
    expect((await s.loadVideos()).map((x) => x.id)).toEqual(['SAMPLE00001'])
  })
  it('저장된 값이 깨져 있어도 앱이 멈추지 않는다', async () => {
    localStorage.setItem('er-sample:videos', JSON.stringify([{ foo: 1 }, null, 'x', mk('ok')]))
    expect((await createSampleStorage().loadVideos()).map((x) => x.id)).toEqual(['SAMPLE00001', 'ok'])
    localStorage.setItem('er-sample:videos', '{깨짐')
    expect(await createSampleStorage().loadVideos()).toHaveLength(1)
  })
})
