<script setup lang="ts">
import type { Item } from '../types'
import ExprCard from './ExprCard.vue'
import SubCard from './SubCard.vue'

defineProps<{ item: Item }>()
const none = new Set<string>()
</script>

<template>
  <ExprCard v-if="item.kind === 'expr'" :item="item" :sub-ids="none" />
  <SubCard v-else :item="item" standalone />
</template>
