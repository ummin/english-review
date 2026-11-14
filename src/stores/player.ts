import { computed, nextTick, ref } from 'vue'
import { defineStore } from 'pinia'
import { EMBED_BLOCKED, realPlayerFactory, YT_STATE, type PlayerFactory, type PlayerHandle } from '../lib/youtube'
import type { Seg } from '../types'

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'needtap' | 'blocked'

let factory: PlayerFactory = realPlayerFactory
/** 테스트에서 실제 유튜브 대신 가짜 플레이어를 끼울 때 쓴다. */
export const setPlayerFactory = (f: PlayerFactory) => { factory = f }

let host: HTMLElement | null = null
let handle: PlayerHandle | null = null
let creating: Promise<PlayerHandle> | null = null
let tapTimer: ReturnType<typeof setTimeout> | undefined
let requestNo = 0
const TAP_HINT_MS = 2000

export const usePlayerStore = defineStore('player', () => {
  const open = ref(false)
  const status = ref<PlayerStatus>('idle')
  const message = ref('')
  const videoId = ref('')
  const seg = ref<Seg | null>(null)
  const label = ref('')
  const loop = ref(false)
  const rate = ref(1)

  const ytLink = computed(() => (videoId.value ? `https://youtu.be/${encodeURIComponent(videoId.value)}?t=${Math.floor(seg.value?.[0] ?? 0)}` : ''))

  function registerHost(el: HTMLElement | null) { host = el }

  function fail(msg: string) {
    clearTimeout(tapTimer)
    status.value = 'blocked'
    message.value = msg
  }
  function onState(s: number) {
    if (s === YT_STATE.PLAYING) {
      clearTimeout(tapTimer)
      status.value = 'playing'
      handle?.setRate(rate.value)
    } else if (s === YT_STATE.PAUSED) {
      if (status.value !== 'needtap') status.value = 'paused'
    } else if (s === YT_STATE.ENDED) {
      if (loop.value && seg.value) startSegment()
      else status.value = 'ended'
    }
  }
  function onError(code: number) {
    if (EMBED_BLOCKED.includes(code)) fail('이 영상은 앱 안에서 재생할 수 없게 막혀 있어요.')
    else if (code === 100) fail('영상을 찾을 수 없어요. 삭제됐거나 비공개일 수 있어요.')
    else fail('재생하지 못했어요. 유튜브에서 열어 보세요.')
  }

  function startSegment() {
    if (!handle || !seg.value) return
    status.value = 'loading'
    message.value = ''
    handle.load(videoId.value, seg.value[0], seg.value[1])
    if (rate.value !== 1) handle.setRate(rate.value)
    // 아이폰 등은 처음에 직접 눌러야 소리가 나는 경우가 있어 안내를 띄운다.
    clearTimeout(tapTimer)
    tapTimer = setTimeout(() => { if (status.value === 'loading') status.value = 'needtap' }, TAP_HINT_MS)
  }

  /** ▶ 버튼에서 호출: 이 구간을 지금 재생한다. */
  async function requestPlay(ytId: string, range: Seg, name: string) {
    const mine = ++requestNo
    videoId.value = ytId
    seg.value = range
    label.value = name
    open.value = true
    status.value = 'loading'
    message.value = ''
    await nextTick()
    try {
      if (!handle) {
        if (!host) throw new Error('no host')
        creating ??= factory(host, { onState, onError })
        handle = await creating
      }
    } catch {
      creating = null
      fail('플레이어를 불러오지 못했어요. 인터넷 연결을 확인하거나 유튜브에서 열어 보세요.')
      return
    }
    // 연달아 눌렀을 때는 마지막 요청만 재생한다.
    if (mine === requestNo) startSegment()
  }

  const replay = () => startSegment()
  function toggleLoop() { loop.value = !loop.value }
  function setRate(r: number) {
    rate.value = r
    handle?.setRate(r)
  }
  function close() {
    clearTimeout(tapTimer)
    handle?.destroy()
    handle = null
    creating = null
    requestNo++
    open.value = false
    status.value = 'idle'
    message.value = ''
  }

  return { open, status, message, videoId, seg, label, loop, rate, ytLink, registerHost, requestPlay, replay, toggleLoop, setRate, close }
})
