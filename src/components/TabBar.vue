<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Icon from './Icon.vue'
import type { IconName } from '../lib/icons'
import { useProgressStore } from '../stores/progress'
import { useLibraryStore } from '../stores/library'

const route = useRoute()
const progress = useProgressStore()
const library = useLibraryStore()

const reviewCount = computed(() => {
  const d = progress.reviewDatesAll[0]
  return d ? library.items.filter((i) => progress.datesOf(i.id).includes(d)).length : 0
})
const starCount = computed(() => library.items.filter((i) => progress.isStar(i.id)).length)

const tabs = computed<{ name: string; to: string; label: string; icon: IconName; badge: number }[]>(() => [
  { name: 'home', to: '/', label: '홈', icon: 'home', badge: 0 },
  { name: 'sent', to: '/sent', label: '문장', icon: 'list', badge: 0 },
  { name: 'review', to: '/review', label: '복습', icon: 'redo', badge: reviewCount.value },
  { name: 'star', to: '/star', label: '어려움', icon: 'star', badge: starCount.value },
])
</script>

<template>
  <nav class="tabs" aria-label="화면">
    <div role="tablist">
      <router-link v-for="t in tabs" :key="t.name" :to="t.to" class="tab" role="tab" :aria-selected="route.name === t.name">
        <Icon :name="t.icon" />{{ t.label }}<em v-if="t.badge">{{ t.badge }}</em>
      </router-link>
    </div>
  </nav>
</template>
