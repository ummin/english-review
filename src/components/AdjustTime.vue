<script setup lang="ts">
import { useProgressStore } from '../stores/progress'
import type { Item } from '../types'
const props = defineProps<{ item: Item }>()
const progress = useProgressStore()
const sign = (n: number) => (n > 0 ? '+' : '')
</script>

<template>
  <details class="adj">
    <summary>재생 시작이 어긋나면 시간 맞추기<template v-if="progress.offsetOf(item.id)"> ({{ sign(progress.offsetOf(item.id)) }}{{ progress.offsetOf(item.id) }}초)</template></summary>
    <div class="row">
      <button class="cbtn white sm" @click="progress.adjustOffset(props.item.id, props.item.videoId, -1)">−1초</button>
      <span class="val">{{ sign(progress.offsetOf(item.id)) }}{{ progress.offsetOf(item.id) }}초</span>
      <button class="cbtn white sm" @click="progress.adjustOffset(props.item.id, props.item.videoId, 1)">+1초</button>
    </div>
  </details>
</template>
