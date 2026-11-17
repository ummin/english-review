<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import { storage } from '../storage'
import { useLibraryStore } from '../stores/library'
import { useUiStore } from '../stores/ui'
import { importShared } from '../lib/cardfile'
import type { SharedVideo } from '../types'

const route = useRoute()
const router = useRouter()
const library = useLibraryStore()
const ui = useUiStore()

const code = computed(() => String(route.params.code ?? ''))
const state = ref<'loading' | 'ok' | 'none' | 'error'>('loading')
const shared = ref<SharedVideo | null>(null)
const mine = computed(() => library.videos.find((v) => v.shareId === code.value) ?? null)
const adding = ref(false)

async function load() {
  state.value = 'loading'
  if (!/^[a-z0-9]{6,32}$/.test(code.value)) { state.value = 'none'; return }
  try {
    shared.value = await storage.getShared(code.value)
    state.value = shared.value ? 'ok' : 'none'
  } catch {
    state.value = 'error'
  }
}
onMounted(load)

const exprCount = computed(() => shared.value?.cards.length ?? 0)
const total = computed(() => shared.value?.cards.reduce((n, c) => n + 1 + c.subs.length, 0) ?? 0)

async function add() {
  if (!shared.value || adding.value) return
  const v = importShared(shared.value)
  if (!v) { ui.say('이 공유 영상은 읽을 수 없어요.'); return }
  adding.value = true
  try {
    await library.saveVideo(v)
    library.select(v.id)
    ui.say('내 복습장에 담았어요.')
    router.replace('/sent')
  } catch {
    ui.say('담지 못했어요. 인터넷 연결을 확인해 주세요.')
  } finally {
    adding.value = false
  }
}
</script>

<template>
  <div class="subhead">
    <button class="icon" aria-label="홈으로" @click="router.replace('/')"><Icon name="back" /></button>
    <h2>공유받은 영상</h2>
  </div>

  <p v-if="state === 'loading'" class="notice" role="status" data-testid="shared-loading">불러오는 중…</p>
  <div v-else-if="state === 'none'" class="empty" role="alert" data-testid="shared-none"><strong>찾을 수 없는 링크예요.</strong><span>링크가 잘못되었거나 공유가 중단됐어요.</span><button class="cbtn blue sm" style="margin:8px auto 0" @click="router.replace('/')">홈으로</button></div>
  <div v-else-if="state === 'error'" class="empty" role="alert" data-testid="shared-error"><strong>불러오지 못했어요.</strong><button class="cbtn blue sm" style="margin:8px auto 0" @click="load">다시 시도</button></div>

  <template v-else-if="shared">
    <div class="card sec">
      <h3 data-testid="shared-title">{{ shared.title }}</h3>
      <p>표현 {{ exprCount }}개 · 문장 {{ total }}개 · 공유한 사람의 공부 기록은 들어 있지 않아요.</p>
      <p v-if="mine" class="notice info" data-testid="shared-mine">내가 공유한 영상이에요.</p>
      <button v-else class="cbtn orange wide" :disabled="adding" data-testid="shared-add" @click="add">내 복습장에 담기</button>
    </div>
    <div class="card sec">
      <h3>미리보기</h3>
      <ul class="plain" data-testid="shared-cards">
        <li v-for="(c, i) in shared.cards.slice(0, 30)" :key="i" style="margin-bottom:8px"><b>{{ c.en }}</b><br /><small>{{ c.ko }}</small></li>
      </ul>
      <p v-if="shared.cards.length > 30">…외 {{ shared.cards.length - 30 }}개</p>
    </div>
  </template>
</template>
