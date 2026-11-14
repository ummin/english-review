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
