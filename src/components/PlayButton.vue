<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import type { IconName } from '../lib/icons'
import { fmt } from '../lib/text'
import { useUiStore } from '../stores/ui'
import type { Seg } from '../types'

const props = defineProps<{ videoId: string; seg: Seg | null; offset: number; label: string; icon: IconName }>()
const ui = useUiStore()
const shown = computed<Seg | null>(() => {
  if (!props.seg) return null
  const s = Math.max(0, props.seg[0] + props.offset)
  return [s, Math.max(s + 1, props.seg[1] + props.offset)]
})
</script>

<template>
  <button v-if="shown" class="play" :aria-label="`${label} ${fmt(shown[0])}부터 재생`" @click="ui.requestPlay(videoId, shown, label)">
    <Icon :name="icon" />{{ label }} <small>{{ fmt(shown[0]) }}–{{ fmt(shown[1]) }}</small>
  </button>
</template>
