/**
 * YouTube IFrame Player API 래퍼. (무료, API 키 없음)
 * 화면 코드는 이 파일의 PlayerHandle만 사용하고, 테스트에서는 factory를 바꿔 끼운다.
 */
export interface PlayerEvents {
  onState(state: number): void
  onError(code: number): void
}
export interface PlayerHandle {
  /** start~end(초) 구간을 재생한다. 구간 끝에서 자동으로 멈춘다(ENDED). */
  load(videoId: string, start: number, end: number): void
  setRate(rate: number): void
  destroy(): void
}
export type PlayerFactory = (host: HTMLElement, ev: PlayerEvents) => Promise<PlayerHandle>

/** IFrame API의 상태 값 */
export const YT_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 } as const

/** 퍼가기가 막힌 영상의 오류 코드 */
export const EMBED_BLOCKED = [101, 150, 153]

interface YTPlayerLike {
  loadVideoById(o: { videoId: string; startSeconds: number; endSeconds: number }): void
  setPlaybackRate(r: number): void
  destroy(): void
}
interface YTLike {
  Player: new (el: HTMLElement, opts: unknown) => YTPlayerLike
}
declare global {
  interface Window {
    YT?: YTLike
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<void> | null = null

function loadApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve()
  if (apiPromise) return apiPromise
  apiPromise = new Promise<void>((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve()
    }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    s.async = true
    s.onerror = () => {
      apiPromise = null
      reject(new Error('YouTube API를 불러오지 못했어요'))
    }
    document.head.appendChild(s)
    setTimeout(() => {
      if (!window.YT?.Player) {
        apiPromise = null
        reject(new Error('YouTube API 응답이 없어요'))
      }
    }, 10_000)
  })
  return apiPromise
}

export const realPlayerFactory: PlayerFactory = async (host, ev) => {
  await loadApi()
  const inner = document.createElement('div')
  host.appendChild(inner)
  return new Promise<PlayerHandle>((resolve) => {
    const player = new window.YT!.Player(inner, {
      width: '100%',
      height: '100%',
      playerVars: { playsinline: 1, rel: 0, modestbranding: 1, cc_load_policy: 1, origin: location.origin },
      events: {
        onReady: () =>
          resolve({
            load: (videoId, startSeconds, endSeconds) => player.loadVideoById({ videoId, startSeconds, endSeconds }),
            setRate: (r) => player.setPlaybackRate(r),
            destroy: () => {
              player.destroy()
              host.innerHTML = ''
            },
          }),
        onStateChange: (e: { data: number }) => ev.onState(e.data),
        onError: (e: { data: number }) => ev.onError(e.data),
      },
    })
  })
}
