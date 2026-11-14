<script setup lang="ts">
import Icon from './Icon.vue'
import { useProgressStore } from '../stores/progress'
import type { Item } from '../types'
const props = defineProps<{ item: Item; small?: boolean }>()
const progress = useProgressStore()
</script>

<template>
  <button class="icon" :class="{ s: small, on: progress.isStar(item.id) }" :aria-pressed="progress.isStar(item.id)" aria-label="어려운 문장 표시"
    @click="progress.toggleStar(props.item.id, props.item.videoId)">
    <Icon name="star" />
  </button>
</template>
