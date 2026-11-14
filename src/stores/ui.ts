import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { todayKey } from '../lib/dates'

const get = (k: string): string | null => { try { return localStorage.getItem(k) } catch { return null } }
const set = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* 무시 */ } }

export const useUiStore = defineStore('ui', () => {
  const hideEn = ref(get('er-ui:hideEn') === '1')
  const hideKo = ref(get('er-ui:hideKo') === '1')
  const revealed = ref<Set<string>>(new Set())
  const toast = ref('')
  const overlay = ref<null | 'review' | 'celebrate'>(null)
  const rv = reactive({ ids: [] as string[], i: 0, shown: false, fin: false, total: 0 })
  let toastTimer: ReturnType<typeof setTimeout> | undefined

  function toggleHideEn() { hideEn.value = !hideEn.value; set('er-ui:hideEn', hideEn.value ? '1' : '0'); revealed.value = new Set() }
  function toggleHideKo() { hideKo.value = !hideKo.value; set('er-ui:hideKo', hideKo.value ? '1' : '0'); revealed.value = new Set() }
  function toggleReveal(key: string) {
    const s = new Set(revealed.value)
    if (s.has(key)) s.delete(key); else s.add(key)
    revealed.value = s
  }
  function say(msg: string) {
    toast.value = msg
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => { toast.value = '' }, 3000)
  }
  /** 하루 목표를 처음 채운 순간 한 번만 축하 화면을 띄운다. */
  function celebrateOnce() {
    const t = todayKey()
    if (get('er-ui:celebrated') === t) return
    set('er-ui:celebrated', t)
    overlay.value = 'celebrate'
  }
  function startReview(ids: string[]) {
    if (!ids.length) { say('복습할 문장이 없어요.'); return }
    rv.ids = ids.slice(); rv.i = 0; rv.shown = false; rv.fin = false; rv.total = ids.length
    overlay.value = 'review'
  }
  function closeOverlay() { overlay.value = null }
  function reviewNext(miss: boolean) {
    if (miss) { rv.shown = false; return } // 다시 볼래요: 같은 카드를 정답이 가려진 채로 다시
    rv.i++; rv.shown = false
    if (rv.i >= rv.ids.length) rv.fin = true
  }
  return { hideEn, hideKo, revealed, toast, overlay, rv, toggleHideEn, toggleHideKo, toggleReveal, say, celebrateOnce, startReview, closeOverlay, reviewNext }
})
