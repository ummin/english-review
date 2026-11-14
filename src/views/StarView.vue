<script setup lang="ts">
import { computed } from 'vue'
import { useLibraryStore } from '../stores/library'
import { useProgressStore } from '../stores/progress'
import { useUiStore } from '../stores/ui'
import Icon from '../components/Icon.vue'
import HideChips from '../components/HideChips.vue'
import ItemCard from '../components/ItemCard.vue'

const library = useLibraryStore()
const progress = useProgressStore()
const ui = useUiStore()
const list = computed(() => library.items.filter((i) => progress.isStar(i.id)))
</script>

<template>
  <h2 class="h">어려운 문장</h2>
  <div v-if="!list.length" class="empty"><strong>표시한 문장이 없어요</strong><span>카드의 별을 누르면 여기에 모여요.</span></div>
  <template v-else>
    <button class="cbtn blue wide" @click="ui.startReview(list.map((i) => i.id))"><Icon name="redo" />카드로 복습 ({{ list.length }}개)</button>
    <HideChips />
    <ItemCard v-for="i in list" :key="i.id" :item="i" />
  </template>
</template>
