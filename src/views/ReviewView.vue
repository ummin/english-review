<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLibraryStore } from '../stores/library'
import { useProgressStore } from '../stores/progress'
import { useUiStore } from '../stores/ui'
import { longDate, shortDate, todayKey } from '../lib/dates'
import Icon from '../components/Icon.vue'
import HideChips from '../components/HideChips.vue'
import ExprCard from '../components/ExprCard.vue'
import ItemCard from '../components/ItemCard.vue'

const library = useLibraryStore()
const progress = useProgressStore()
const ui = useUiStore()

const selected = ref<string | null>(null)
const dates = computed(() => progress.reviewDatesAll.slice(0, 8))
const current = computed<string | 'all' | null>(() =>
  selected.value === 'all' ? 'all' : selected.value && progress.reviewDatesAll.includes(selected.value) ? selected.value : (progress.reviewDatesAll[0] ?? null),
)
const isAll = computed(() => current.value === 'all')
const list = computed(() => {
  const c = current.value
  if (!c) return []
  return library.items.filter((i) => (c === 'all' ? progress.ever(i.id) : progress.datesOf(i.id).includes(c)))
})
/** 전체: 질문과 대답을 한 묶음으로 */
const groups = computed(() => library.exprs.filter((e) => progress.ever(e.id) || e.subs.some((s) => progress.ever(s.id))))
const title = computed(() => (isAll.value ? '전체' : current.value ? (current.value === todayKey() ? '오늘 ' : '') + longDate(current.value) : ''))
</script>

<template>
  <h2 class="h">복습<template v-if="current"> · {{ title }}</template></h2>
  <div v-if="!current" class="empty">
    <strong>복습할 기록이 아직 없어요</strong>
    <span>문장에서 “따라 말하기 완료”를 누르면 바로 여기에 쌓여요.</span>
  </div>
  <template v-else>
    <div class="chips">
      <button class="chip" :aria-pressed="isAll" @click="selected = 'all'">전체</button>
      <button v-for="d in dates" :key="d" class="chip" :aria-pressed="d === current" @click="selected = d">{{ d === todayKey() ? '오늘' : shortDate(d) }}</button>
    </div>
    <button class="cbtn blue wide" @click="ui.startReview(list.map((i) => i.id))"><Icon name="redo" />카드로 복습 ({{ list.length }}개)</button>
    <HideChips />
    <template v-if="isAll">
      <p class="muted" style="margin: 0">한 번이라도 완료한 문장을 질문·대답 묶음으로 보여줘요.</p>
      <ExprCard v-for="e in groups" :key="e.id" :item="e" :sub-ids="null" />
    </template>
    <template v-else>
      <ItemCard v-for="i in list" :key="i.id" :item="i" />
    </template>
  </template>
</template>
