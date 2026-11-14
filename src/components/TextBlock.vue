<script setup lang="ts">
import { computed } from 'vue'
import { highlightParts } from '../lib/text'
import { useUiStore } from '../stores/ui'
import type { Item } from '../types'

const props = defineProps<{ item: Item; small?: boolean }>()
const ui = useUiStore()
const parts = computed(() => highlightParts(props.item.en, props.item.kind === 'expr' ? props.item.stress : []))
const enKey = computed(() => `en:${props.item.id}`)
const koKey = computed(() => `ko:${props.item.id}`)
</script>

<template>
  <p class="en" :class="[{ sm: small, rev: ui.revealed.has(enKey) }]" @click="ui.hideEn && ui.toggleReveal(enKey)">
    <template v-for="(p, i) in parts" :key="i"><mark v-if="p.hit">{{ p.text }}</mark><template v-else>{{ p.text }}</template></template>
  </p>
  <p v-if="item.ko" class="ko" :class="[{ sm: small, rev: ui.revealed.has(koKey) }]" @click="ui.hideKo && ui.toggleReveal(koKey)">{{ item.ko }}</p>
</template>
