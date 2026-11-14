<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import TopBar from './components/TopBar.vue'
import TabBar from './components/TabBar.vue'
import ReviewOverlay from './components/ReviewOverlay.vue'
import CelebrateOverlay from './components/CelebrateOverlay.vue'
import { useLibraryStore } from './stores/library'
import { useProgressStore } from './stores/progress'
import { useSettingsStore } from './stores/settings'
import { useUiStore } from './stores/ui'

const ui = useUiStore()
const ready = ref(false)
const failed = ref(false)

onMounted(async () => {
  try {
    await Promise.all([useLibraryStore().load(), useProgressStore().load(), useSettingsStore().load()])
    ready.value = true
  } catch {
    failed.value = true
  }
})
</script>

<template>
  <div class="app" :class="{ 'hide-en': ui.hideEn, 'hide-ko': ui.hideKo }">
    <template v-if="ready">
      <TopBar />
      <main><RouterView /></main>
      <TabBar />
    </template>
    <div v-else-if="failed" class="empty" style="margin-top: 40px"><strong>데이터를 불러오지 못했어요</strong><span>새로고침해도 같으면 잠시 뒤 다시 열어 주세요.</span></div>
    <div v-else class="empty" style="margin-top: 40px"><strong><span class="spin" />불러오는 중이에요</strong></div>
    <ReviewOverlay v-if="ui.overlay === 'review'" />
    <CelebrateOverlay v-if="ui.overlay === 'celebrate'" />
    <div v-if="ui.toast" class="toast" role="status">{{ ui.toast }}</div>
  </div>
</template>
