<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLibraryStore } from '../stores/library'
import { useProgressStore } from '../stores/progress'
import { isDimmed, takeSnapshot } from '../lib/filter'
import type { ExprItem, Filter } from '../types'
import ExprCard from '../components/ExprCard.vue'
import KeepCard from '../components/KeepCard.vue'
import HideChips from '../components/HideChips.vue'

const library = useLibraryStore()
const progress = useProgressStore()

const filter = ref<Filter>('all')
const snap = ref(takeSnapshot(library.exprsOf(library.current?.id ?? ''), 'all', progress.ever, progress.isStar))
const exprs = computed(() => library.exprsOf(library.current?.id ?? ''))
const items = computed(() => library.itemsOf(library.current?.id ?? ''))

/** 필터를 누르면(같은 필터를 다시 눌러도) 그 순간의 목록으로 새로 고정한다. */
function setFilter(f: Filter) {
  filter.value = f
  snap.value = takeSnapshot(exprs.value, f, progress.ever, progress.isStar)
}
watch(() => library.current?.id, () => setFilter('all'))

const remaining = computed(() => items.value.filter((i) => !progress.ever(i.id)).length)
const stars = computed(() => items.value.filter((i) => progress.isStar(i.id)).length)
const dimmed = (id: string) => filter.value !== 'all' && isDimmed(filter.value, id, progress.ever, progress.isStar)
type Row = { e: ExprItem; mode: 'full' | 'keep' }
const shown = computed<Row[]>(() => {
  if (filter.value === 'all') return exprs.value.map((e) => ({ e, mode: 'full' }))
  const rows: Row[] = []
  for (const e of exprs.value) {
    if (snap.value.full.has(e.id)) rows.push({ e, mode: 'full' })
    else if (snap.value.keep.has(e.id)) rows.push({ e, mode: 'keep' })
  }
  return rows
})
const filters = computed<{ key: Filter; label: string; n: number | null }[]>(() => [
  { key: 'all', label: '전체', n: null },
  { key: 'todo', label: '남은 문장', n: remaining.value },
  { key: 'star', label: '어려움', n: stars.value },
])
</script>

<template>
  <template v-if="library.current">
    <div v-if="library.videos.length > 1" class="chips">
      <button v-for="v in library.videos" :key="v.id" class="chip" :aria-pressed="v.id === library.current.id" @click="library.select(v.id)">{{ v.title.slice(0, 14) }}</button>
    </div>
    <div class="tools"><p class="vtitle">{{ library.current.title }}</p></div>
    <div class="tools">
      <div class="chips">
        <button v-for="f in filters" :key="f.key" class="chip" :aria-pressed="filter === f.key" @click="setFilter(f.key)">{{ f.label }}<template v-if="f.n !== null"> <b>{{ f.n }}</b></template></button>
      </div>
    </div>
    <HideChips />
    <div v-if="filter === 'todo'" class="notice info">방금 체크한 문장은 흐리게 남아 있어요. “남은 문장”을 다시 누르면 정리돼요.</div>

    <template v-for="x in shown" :key="x.e.id">
      <ExprCard v-if="x.mode === 'full'" :item="x.e" :sub-ids="filter === 'all' ? null : snap.subs" :dim="dimmed(x.e.id)" :dim-sub="dimmed" />
      <KeepCard v-else :item="x.e" :sub-ids="snap.subs" :dim-sub="dimmed" />
    </template>
    <div v-if="!shown.length" class="empty">
      <strong>{{ filter === 'todo' ? '남은 문장이 없어요' : '표시한 문장이 없어요' }}</strong>
      <span>{{ filter === 'todo' ? '모든 문장을 한 번 이상 체크했어요. 대단해요!' : '카드의 별을 누르면 여기에 모여요.' }}</span>
    </div>
  </template>
  <div v-else class="empty"><strong>등록된 영상이 없어요</strong></div>
</template>
