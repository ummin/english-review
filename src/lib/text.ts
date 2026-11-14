/** 초 → m:ss 또는 h:mm:ss */
export function fmt(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const x = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`
}

export interface Part {
  text: string
  hit: boolean
}

/** 영어 문장에서 강세 단어에 해당하는 조각을 표시한다. */
export function highlightParts(en: string, stress: string[]): Part[] {
  const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '')
  const set = new Set(stress.flatMap((s) => s.split(/\s+/)).map(norm).filter(Boolean))
  return en
    .split(/(\s+)/)
    .filter((t) => t !== '')
    .map((text) => ({ text, hit: norm(text) !== '' && set.has(norm(text)) }))
}
