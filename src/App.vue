<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterView } from 'vue-router'
import TopBar from './components/TopBar.vue'
import LoginGate from './views/LoginGate.vue'
import { REQUIRE_LOGIN } from './lib/config'
import TabBar from './components/TabBar.vue'
import PlayerPanel from './components/PlayerPanel.vue'
import { usePlayerStore } from './stores/player'
import ReviewOverlay from './components/ReviewOverlay.vue'
import CelebrateOverlay from './components/CelebrateOverlay.vue'
import { useLibraryStore } from './stores/library'
import { useProgressStore } from './stores/progress'
import { useSettingsStore } from './stores/settings'
import { useUiStore } from './stores/ui'
import { useAuthStore } from './stores/auth'

const ui = useUiStore()
const auth = useAuthStore()
const player = usePlayerStore()
const ready = ref(false)
const authReady = ref(false)
/** 로그인이 필요한 앱이라, 로그인하기 전에는 로그인 화면만 보인다. */
const gated = computed(() => REQUIRE_LOGIN && !auth.user)
const failed = ref(false)

// 복습 카드 화면이 열리고 닫힐 때는 플레이어도 멈춘다. (카드 안에 따로 열린다)
watch(() => ui.overlay, () => player.close())

async function loadAll() {
  failed.value = false
  try {
    await Promise.all([useLibraryStore().load(), useProgressStore().load(), useSettingsStore().load()])
    ready.value = true
  } catch {
    failed.value = true
  }
}

onMounted(async () => {
  await auth.init() // 저장된 로그인을 먼저 확인해야 알맞은 저장소에서 데이터를 불러온다
  authReady.value = true
  if (!gated.value) await loadAll()
})

// 로그인·로그아웃으로 사용자가 바뀌면 그 사람의 데이터를 다시 불러온다.
watch(() => auth.user?.id, async () => {
  if (!authReady.value) return
  player.close()
  ready.value = false
  failed.value = false
  if (gated.value) return // 로그아웃: 데이터를 불러오지 않고 로그인 화면으로
  await loadAll()
})
</script>

<template>
  <div class="app" :class="{ 'hide-en': ui.hideEn, 'hide-ko': ui.hideKo }">
    <LoginGate v-if="authReady && gated" />
    <template v-else-if="ready">
      <div class="sticky-head">
        <TopBar />
        <PlayerPanel v-if="player.open && ui.overlay !== 'review'" />
      </div>
      <main><RouterView v-slot="{ Component, route }"><component :is="Component" :key="route.fullPath" /></RouterView></main>
      <TabBar />
    </template>
    <div v-else-if="failed" class="empty" style="margin-top: 40px" role="alert"><strong>데이터를 불러오지 못했어요</strong><span>인터넷 연결을 확인하고 다시 시도해 주세요.</span><button class="cbtn blue sm" style="margin:10px auto 0" data-testid="retry" @click="loadAll">다시 시도</button></div>
    <div v-else class="empty" style="margin-top: 40px"><strong><span class="spin" />불러오는 중이에요</strong></div>
    <ReviewOverlay v-if="ui.overlay === 'review'" />
    <CelebrateOverlay v-if="ui.overlay === 'celebrate'" />
    <div v-if="ui.toast" class="toast" role="status">{{ ui.toast }}</div>
  </div>
</template>
