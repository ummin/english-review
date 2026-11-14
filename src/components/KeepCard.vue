<script setup lang="ts">
import { computed } from 'vue'
import type { ExprItem } from '../types'
import Icon from './Icon.vue'
import SubCard from './SubCard.vue'

/** 질문은 이미 끝나서 요약만 보이고, 남은 대답만 보여주는 카드 */
const props = defineProps<{ item: ExprItem; subIds: Set<string>; dimSub?: (id: string) => boolean }>()
const subs = computed(() => props.item.subs.filter((s) => props.subIds.has(s.id)))
</script>

<template>
  <div class="card compact" :data-id="item.id">
    <div class="top-row"><Icon name="check" /><p class="en">{{ item.en }}</p></div>
    <p v-if="item.ko" class="ko sm">{{ item.ko }}</p>
    <div class="subs">
      <span class="lab">남은 대답·표현</span>
      <SubCard v-for="s in subs" :key="s.id" :item="s" :dim="dimSub ? dimSub(s.id) : false" />
    </div>
  </div>
</template>
