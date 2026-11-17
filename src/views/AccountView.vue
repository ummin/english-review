<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import { friendlyAuthError, useAuthStore } from '../stores/auth'
import { useLibraryStore } from '../stores/library'
import { useUiStore } from '../stores/ui'
import { createSampleStorage } from '../storage/sample'
import { describeCallbackError } from '../lib/authCallback'

const router = useRouter()
const auth = useAuthStore()
const library = useLibraryStore()
const ui = useUiStore()

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
    ui.say('로그인했어요.')
  } catch (e) {
    error.value = friendlyAuthError(e)
  } finally {
    busy.value = false
  }
}

// 로그인 전에 이 기기에 만든 영상을 계정으로 옮기기
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

  <p v-if="auth.callbackError && !auth.user" class="notice" role="alert" data-testid="callback-error">{{ describeCallbackError(auth.callbackError) }} <small>(오류 코드: {{ auth.callbackError }})</small></p>

  <template v-if="auth.user">
    <div class="card">
      <div class="who">
        <span class="av"><Icon name="user" /></span>
        <div><h3 data-testid="who-name">{{ auth.user.email }}</h3><small>공부 기록과 영상이 내 계정에 저장돼요</small></div>
      </div>
      <button class="cbtn danger wide" data-testid="signout" @click="auth.signOut()">로그아웃</button>
    </div>
    <div v-if="localVideos" class="card sec" data-testid="move-local">
      <h3>이 기기에 있던 영상 {{ localVideos }}개</h3>
      <p>로그인 전에 이 기기에 만든 영상이에요. 내 계정으로 옮기면 다른 기기에서도 볼 수 있어요.</p>
      <button class="cbtn blue wide" :disabled="moving" data-testid="move-local-btn" @click="moveLocal">내 계정으로 옮기기</button>
    </div>
  </template>

  <template v-else>
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
    <div class="card sec">
      <h3>Google · 카카오로 로그인</h3>
      <p>다음 단계에서 연결돼요.</p>
      <button class="cbtn google wide" disabled data-testid="login-google">Google로 계속하기 (준비 중)</button>
      <button class="cbtn kakao wide" disabled data-testid="login-kakao">카카오로 계속하기 (준비 중)</button>
    </div>
  </template>
</template>
