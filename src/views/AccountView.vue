<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import LoginCard from '../components/LoginCard.vue'
import { useAuthStore } from '../stores/auth'
import { useLibraryStore } from '../stores/library'
import { useUiStore } from '../stores/ui'
import { createSampleStorage } from '../storage/sample'

const router = useRouter()
const auth = useAuthStore()
const library = useLibraryStore()
const ui = useUiStore()

const providerName = computed(() => ({ google: 'Google', kakao: '카카오', email: '이메일' }[auth.user?.provider ?? ''] ?? '이메일'))

// 로그인 전에 이 기기에 만든 영상을 계정으로 옮기기 (이 기기 저장을 쓰던 경우에만 나온다)
const localVideos = ref<number | null>(null)
async function countLocal() {
  const all = await createSampleStorage().loadVideos()
  localVideos.value = all.filter((v) => !library.isSample(v.id)).length
}
if (auth.loggedIn) void countLocal()
const moving = ref(false)
async function moveLocal() {
  moving.value = true
  try {
    const local = createSampleStorage()
    const mine = (await local.loadVideos()).filter((v) => !library.isSample(v.id))
    for (const v of mine) {
      await library.saveVideo(v)
      await local.deleteVideo(v.id)
    }
    ui.say(`영상 ${mine.length}개를 내 계정으로 옮겼어요.`)
    await countLocal()
  } catch {
    ui.say('옮기지 못했어요. 인터넷 연결을 확인해 주세요.')
  } finally {
    moving.value = false
  }
}
</script>

<template>
  <div class="subhead">
    <button class="icon" aria-label="뒤로" @click="router.back()"><Icon name="back" /></button>
    <h2>내 계정</h2>
  </div>

  <template v-if="auth.user">
    <div class="card">
      <div class="who">
        <span class="av"><Icon name="user" /></span>
        <div><h3 data-testid="who-name">{{ auth.user.label }}</h3><small>{{ providerName }} 로그인 · 공부 기록과 영상이 내 계정에 저장돼요</small></div>
      </div>
      <button class="cbtn danger wide" data-testid="signout" @click="auth.signOut()">로그아웃</button>
    </div>
    <div v-if="localVideos" class="card sec" data-testid="move-local">
      <h3>이 기기에 있던 영상 {{ localVideos }}개</h3>
      <p>로그인 전에 이 기기에 만든 영상이에요. 내 계정으로 옮기면 다른 기기에서도 볼 수 있어요.</p>
      <button class="cbtn blue wide" :disabled="moving" data-testid="move-local-btn" @click="moveLocal">내 계정으로 옮기기</button>
    </div>
  </template>
  <LoginCard v-else />
</template>
