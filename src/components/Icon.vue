<script setup lang="ts">
import { computed } from 'vue'
import { ICONS, type IconName } from '../lib/icons'
const props = defineProps<{ name: IconName; fill?: boolean; cls?: string }>()
const html = computed(() => ICONS[props.name])
</script>

<template>
  <svg class="i" :class="[{ fill }, cls]" viewBox="0 0 24 24" aria-hidden="true" v-html="html" />
</template>
