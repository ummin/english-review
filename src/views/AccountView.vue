<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import LoginCard from '../components/LoginCard.vue'
import { useAuthStore } from '../stores/auth'
import { useLibraryStore } from '../stores/library'
import { useUiStore } from '../stores/ui'
import { createSampleStorage } from '../storage/sample'
import { storage } from '../storage'
import { useProgressStore } from '../stores/progress'
import { useSettingsStore } from '../stores/settings'
import { makeBackup, parseBackup } from '../lib/backup'
import { todayKey } from '../lib/dates'

const router = useRouter()
const auth = useAuthStore()
const library = useLibraryStore()
const ui = useUiStore()
const progress = useProgressStore()
const settings = useSettingsStore()

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

// 백업: 내 영상·공부 기록·목표를 파일 하나로 저장하고, 나중에 다시 불러온다.
function saveBackup() {
  const mine = library.videos.filter((v) => !library.isSample(v.id))
  const text = makeBackup(mine, progress.records, { dailyGoal: settings.dailyGoal })
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `영어회화복습장-백업-${todayKey()}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  ui.say(`영상 ${mine.length}개와 공부 기록을 백업했어요.`)
}
const restoring = ref(false)
const restoreMsg = ref('')
async function onRestore(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  input.value = ''
  restoreMsg.value = ''
  if (!f) return
  if (f.size > 20_000_000) { restoreMsg.value = '파일이 너무 커요. (20MB 이하)'; return }
  const r = parseBackup(await f.text())
  if (!r.ok) { restoreMsg.value = r.error; return }
  restoring.value = true
  try {
    for (const v of r.videos) {
      const cur = library.videoById(v.id)
      await library.saveVideo(cur?.shareId ? { ...v, shareId: cur.shareId } : v)
    }
    const entries = Object.entries(r.progress)
    for (let i = 0; i < entries.length; i += 20) {
      await Promise.all(entries.slice(i, i + 20).map(([id, p]) => {
        const cur = progress.records[id]
        const dates = [...new Set([...(cur?.dates ?? []), ...p.dates])].sort()
        return storage.saveProgress(id, { ...p, dates, star: p.star || !!cur?.star })
      }))
    }
    if (r.settings) await storage.saveSettings(r.settings)
    await Promise.all([library.load(), progress.load(), settings.load()])
    ui.say(`영상 ${r.videos.length}개와 기록 ${entries.length}개를 불러왔어요.`)
  } catch {
    restoreMsg.value = '일부만 불러왔을 수 있어요. 인터넷 연결을 확인하고 같은 파일로 다시 시도해 주세요.'
  } finally {
    restoring.value = false
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
    <div class="card sec" data-testid="backup">
      <h3>백업과 복원</h3>
      <p>내 영상, 공부 기록, 하루 목표를 파일 하나로 저장해 둘 수 있어요. 계정을 옮기거나 실수로 지웠을 때 불러오면 합쳐져요. (같은 영상은 덮어쓰고, 공부한 날짜는 합쳐요)</p>
      <button class="cbtn blue wide" data-testid="backup-save" @click="saveBackup"><Icon name="download" />백업 파일 저장</button>
      <label class="cbtn white wide" style="cursor:pointer;margin-top:8px" :aria-disabled="restoring">{{ restoring ? '불러오는 중…' : '백업 파일 불러오기' }}<input type="file" accept=".json,application/json" class="sr-only" aria-label="백업 파일 선택" data-testid="backup-file" :disabled="restoring" @change="onRestore" /></label>
      <p v-if="restoreMsg" class="field-msg bad" role="alert" data-testid="restore-error">{{ restoreMsg }}</p>
    </div>
  </template>
  <LoginCard v-else />
</template>
