<script setup lang="ts">
import { ref } from 'vue'
import { friendlyAuthError, useAuthStore } from '../stores/auth'
import { describeCallbackError } from '../lib/authCallback'

const auth = useAuthStore()
const busy = ref(false)
const error = ref('')

async function google() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await auth.signInWith('google') // 성공하면 Google 화면으로 이동했다가 돌아온다
  } catch (e) {
    error.value = friendlyAuthError(e)
    busy.value = false
  }
}
</script>

<template>
  <div class="form">
    <p v-if="auth.callbackError && !auth.user" class="notice" role="alert" data-testid="callback-error">{{ describeCallbackError(auth.callbackError) }} <small>(오류 코드: {{ auth.callbackError }})</small></p>
    <div class="card sec">
      <h3>Google 계정으로 로그인</h3>
      <p>비밀번호 없이 바로 로그인해요. 처음이면 자동으로 계정이 만들어져요.</p>
      <button class="cbtn google wide" :disabled="busy" data-testid="login-google" @click="google">Google로 계속하기</button>
      <p v-if="error" class="field-msg bad" role="alert" data-testid="social-error">{{ error }}</p>
      <p class="legal" data-testid="legal-links">계속하면 <a :href="`${BASE}terms.html`" target="_blank" rel="noopener">이용약관</a>과 <a :href="`${BASE}privacy.html`" target="_blank" rel="noopener">개인정보처리방침</a>에 동의한 것으로 봐요.</p>
    </div>
  </div>
</template>

<script lang="ts">
const BASE = import.meta.env.BASE_URL
</script>
