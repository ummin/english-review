<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from './Icon.vue'
import { shortDate } from '../lib/dates'
import { useProgressStore } from '../stores/progress'
import { useSettingsStore } from '../stores/settings'
import { useUiStore } from '../stores/ui'
import type { Item } from '../types'

const props = defineProps<{ item: Item; short?: boolean; label?: string }>()
const progress = useProgressStore()
const settings = useSettingsStore()
const ui = useUiStore()
const popped = ref(false)

const dates = computed(() => progress.datesOf(props.item.id))
const state = computed<'new' | 'again' | 'today'>(() => (progress.doneToday(props.item.id) ? 'today' : dates.value.length ? 'again' : 'new'))

function press() {
  const before = progress.todayCount
  const added = progress.toggleToday(props.item.id, props.item.videoId)
  if (added) {
    popped.value = true
    setTimeout(() => (popped.value = false), 450)
    if (before < settings.dailyGoal && progress.todayCount >= settings.dailyGoal) ui.celebrateOnce()
  }
}
</script>

<template>
  <div v-if="state === 'today'" class="chk">
    <div class="donebox" :class="{ sm: short, pop: popped }"><Icon name="check" />오늘 완료<template v-if="!short"> · 총 {{ dates.length }}일</template></div>
    <button class="cancel" aria-label="오늘 완료 취소" @click="press">취소</button>
  </div>
  <div v-else-if="state === 'again'" class="chk col">
    <button class="cbtn" :class="{ sm: short }" @click="press">오늘도 따라 말하기 완료</button>
    <span class="prev">지난번 {{ shortDate(dates[dates.length - 1]) }} · 총 {{ dates.length }}일</span>
  </div>
  <button v-else class="cbtn" :class="{ sm: short }" @click="press">{{ label ?? '따라 말하기 완료' }}</button>
</template>
