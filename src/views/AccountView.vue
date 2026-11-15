<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import { useAuthStore, type Provider } from '../stores/auth'
import { useUiStore } from '../stores/ui'

const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()
const email = ref('')
const emailOk = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()))
const sent = ref(false)
const labels: Record<Provider, string> = { google: 'Google', kakao: '카카오', email: '이메일' }

function social(p: 'google' | 'kakao') {
  auth.signIn(p)
  ui.say(`${labels[p]} 로그인 미리보기예요. 실제 계정과 연결되지 않았어요.`)
}
function sendLink() {
  if (!emailOk.value) return
  sent.value = true
}
function openLink() {
  auth.signIn('email', email.value.trim())
  sent.value = false
  email.value = ''
  ui.say('이메일 로그인 미리보기예요. 실제 계정과 연결되지 않았어요.')
}
</script>

<template>
  <div class="subhead">
    <button class="icon" aria-label="뒤로" @click="router.back()"><Icon name="back" /></button>
    <h2>내 계정</h2>
  </div>

  <p class="notice info" data-testid="account-preview-note">미리보기 화면이에요. 실제 로그인은 다음 단계에서 연결돼요. 지금 누르면 이 기기에 로그인된 것처럼만 보여요.</p>

  <template v-if="auth.user">
    <div class="card">
      <div class="who">
        <span class="av"><Icon name="user" /></span>
        <div><h3 data-testid="who-name">{{ auth.user.name }}</h3><small>{{ auth.user.email || labels[auth.user.provider] + ' 계정' }}</small></div>
      </div>
      <p class="hintp" style="margin:0;font-size:14px;color:var(--muted)">로그인하면 공부 기록과 카드가 어느 기기에서든 이어져요. (연결 후)</p>
      <button class="cbtn danger wide" data-testid="signout" @click="auth.signOut()">로그아웃</button>
    </div>
  </template>

  <template v-else>
    <div class="card sec">
      <h3>로그인하고 어디서든 이어서 공부하기</h3>
      <button class="cbtn google wide" data-testid="login-google" @click="social('google')">Google로 계속하기</button>
      <button class="cbtn kakao wide" data-testid="login-kakao" @click="social('kakao')">카카오로 계속하기</button>
    </div>
    <div class="card sec">
      <h3>이메일로 로그인</h3>
      <template v-if="!sent">
        <label class="f">이메일<input v-model="email" type="text" inputmode="email" autocomplete="email" autocapitalize="off" placeholder="name@example.com" data-testid="email" @keyup.enter="sendLink" /></label>
        <p v-if="email && !emailOk" class="field-msg bad" role="status">이메일 형식을 확인해 주세요.</p>
        <button class="cbtn blue wide" :disabled="!emailOk" data-testid="send-link" @click="sendLink">로그인 링크 받기</button>
      </template>
      <template v-else>
        <p class="notice ok" role="status" data-testid="link-sent">{{ email }} 로 링크를 보냈다고 가정할게요. (미리보기)</p>
        <button class="cbtn wide" data-testid="open-link" @click="openLink">메일의 링크를 눌렀어요</button>
        <button class="cbtn white wide" @click="sent = false">이메일 다시 입력</button>
      </template>
    </div>
  </template>
</template>
