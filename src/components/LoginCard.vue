<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { friendlyAuthError, useAuthStore } from '../stores/auth'
import { describeCallbackError } from '../lib/authCallback'

const auth = useAuthStore()
const email = ref('')
const code = ref('')
const stage = ref<'email' | 'code'>('email')
const busy = ref(false)
const error = ref('')
const cooldown = ref(0)
let timer: ReturnType<typeof setInterval> | undefined
const emailOk = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()))
const codeOk = computed(() => /^\d{6,10}$/.test(code.value.trim()))

function startCooldown() {
  cooldown.value = 60
  clearInterval(timer)
  timer = setInterval(() => { cooldown.value = Math.max(0, cooldown.value - 1); if (!cooldown.value) clearInterval(timer) }, 1000)
}
onBeforeUnmount(() => clearInterval(timer))

const socialError = ref('')
async function social(p: 'google' | 'kakao') {
  if (busy.value) return
  busy.value = true
  socialError.value = ''
  try {
    await auth.signInWith(p) // 성공하면 로그인 화면으로 이동한다
  } catch (e) {
    socialError.value = friendlyAuthError(e)
    busy.value = false
  }
}

async function sendCode() {
  if (!emailOk.value || busy.value || cooldown.value) return
  busy.value = true
  error.value = ''
  try {
    await auth.requestCode(email.value.trim())
    stage.value = 'code'
    code.value = ''
    startCooldown()
  } catch (e) {
    error.value = friendlyAuthError(e)
  } finally {
    busy.value = false
  }
}
async function verify() {
  if (!codeOk.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    await auth.verifyCode(email.value.trim(), code.value.trim())
  } catch (e) {
    error.value = friendlyAuthError(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="form">
  <p v-if="auth.callbackError && !auth.user" class="notice" role="alert" data-testid="callback-error">{{ describeCallbackError(auth.callbackError) }} <small>(오류 코드: {{ auth.callbackError }})</small></p>
    <div class="card sec">
      <h3>Google · 카카오로 로그인</h3>
      <p>메일 없이 바로 로그인해요. 처음이면 자동으로 계정이 만들어져요.</p>
      <button class="cbtn google wide" :disabled="busy" data-testid="login-google" @click="social('google')">Google로 계속하기</button>
      <button class="cbtn kakao wide" :disabled="busy" data-testid="login-kakao" @click="social('kakao')">카카오로 계속하기</button>
      <p v-if="socialError" class="field-msg bad" role="alert" data-testid="social-error">{{ socialError }}</p>
    </div>
    <div class="card sec">
      <h3>이메일로 로그인</h3>
      <p>이메일로 받은 링크를 누르면 로그인돼요. 처음이면 자동으로 계정이 만들어져요.</p>
      <template v-if="stage === 'email'">
        <label class="f">이메일<input v-model="email" type="text" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="name@example.com" data-testid="email" @keyup.enter="sendCode" /></label>
        <p v-if="email && !emailOk" class="field-msg bad" role="status">이메일 형식을 확인해 주세요.</p>
        <button class="cbtn blue wide" :disabled="!emailOk || busy" data-testid="send-code" @click="sendCode">{{ busy ? '보내는 중…' : '로그인 메일 받기' }}</button>
      </template>
      <template v-else>
        <p class="notice ok" role="status" data-testid="code-sent">{{ email }} 로 메일을 보냈어요. 메일의 <b>링크를 누르면</b> 바로 로그인돼요. (지금 쓰는 이 브라우저에서 열어 주세요. 안 보이면 스팸함도 확인해 주세요.)</p>
        <p class="hintp" style="margin:0;font-size:13px;color:var(--muted)">메일에 숫자 코드가 있다면 아래에 입력해도 돼요.</p>
        <label class="f">인증 코드 (있을 때만)<input v-model="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="숫자 코드" data-testid="code" @keyup.enter="verify" /></label>
        <button class="cbtn wide" :disabled="!codeOk || busy" data-testid="verify" @click="verify">{{ busy ? '확인 중…' : '로그인' }}</button>
        <div class="btnrow">
          <button class="cbtn white" :disabled="!!cooldown || busy" data-testid="resend" @click="sendCode">{{ cooldown ? `다시 보내기 (${cooldown}초)` : '메일 다시 받기' }}</button>
          <button class="cbtn white" data-testid="change-email" @click="stage = 'email'; error = ''">이메일 바꾸기</button>
        </div>
      </template>
      <p v-if="error" class="field-msg bad" role="alert" data-testid="auth-error">{{ error }}</p>
    </div>
  </div>
</template>
