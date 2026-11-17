<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import { useLibraryStore } from '../stores/library'
import { useUiStore } from '../stores/ui'
import { useAuthStore } from '../stores/auth'
import { copyText } from '../lib/clipboard'
import { fileNameFor, toCardFile } from '../lib/cardfile'

const route = useRoute()
const router = useRouter()
const library = useLibraryStore()
const ui = useUiStore()
const auth = useAuthStore()

const video = computed(() => library.videoById(String(route.params.id ?? '')))
const canLink = computed(() => auth.loggedIn && !!video.value && !library.isSample(video.value.id))
const code = computed(() => video.value?.shareId ?? null)
const link = computed(() => (code.value ? `${location.origin}${import.meta.env.BASE_URL}#/s/${code.value}` : ''))
const busy = ref(false)
async function toggleLink(e: Event) {
  const input = e.target as HTMLInputElement
  const on = input.checked
  if (!video.value) return
  busy.value = true
  try {
    await library.setShare(video.value.id, on)
    ui.say(on ? '공유 링크를 만들었어요.' : '공유를 중단했어요. 이 링크는 더 이상 열리지 않아요.')
  } catch {
    input.checked = !on
    ui.say('바꾸지 못했어요. 인터넷 연결을 확인해 주세요.')
  } finally {
    busy.value = false
  }
}
async function copyLink() {
  ui.say((await copyText(link.value)) ? '링크를 복사했어요.' : '복사하지 못했어요. 주소를 길게 눌러 직접 복사해 주세요.')
}

function download() {
  const v = video.value
  if (!v) return
  const blob = new Blob([toCardFile(v)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileNameFor(v.title)
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  ui.say('카드 파일을 저장했어요.')
}
</script>

<template>
  <div class="subhead">
    <button class="icon" aria-label="뒤로" @click="router.back()"><Icon name="back" /></button>
    <h2>공유하기</h2>
  </div>

  <div v-if="!video" class="empty" role="alert"><strong>찾을 수 없는 영상이에요.</strong><button class="cbtn blue sm" style="margin:8px auto 0" @click="router.push('/')">홈으로</button></div>

  <template v-else>
    <div class="card sec">
      <h3 data-testid="share-title">{{ video.title }}</h3>
      <p>카드 {{ video.cards.length }}개 · 내 공부 기록은 공유되지 않아요.</p>
    </div>

    <section class="card sec" aria-labelledby="sh1">
      <h3 id="sh1"><Icon name="download" />카드 파일로 보내기</h3>
      <p>파일을 메신저나 메일로 보내면, 받은 사람이 <b>영상 추가 → 파일에서 불러오기</b>로 같은 카드를 쓸 수 있어요.</p>
      <button class="cbtn blue wide" data-testid="download" @click="download"><Icon name="download" />카드 파일 받기</button>
    </section>

    <section class="card sec" aria-labelledby="sh2">
      <h3 id="sh2"><Icon name="share" />공유 링크</h3>
      <p v-if="!canLink" class="notice info" data-testid="share-link-off">{{ auth.loggedIn ? '샘플 영상은 링크로 공유할 수 없어요.' : '로그인하면 공유 링크를 만들 수 있어요.' }}</p>
      <template v-else>
        <label class="switch"><input type="checkbox" role="switch" :checked="!!code" :disabled="busy" data-testid="link-switch" @change="toggleLink" />링크로 공유하기</label>
        <template v-if="code">
          <div class="linkbox"><input type="text" readonly :value="link" aria-label="공유 링크" data-testid="link" @focus="($event.target as HTMLInputElement).select()" /></div>
          <button class="cbtn white wide" data-testid="copy-link" @click="copyLink"><Icon name="copy" />링크 복사</button>
          <p>링크를 받은 사람은 <b>로그인한 뒤</b> 카드를 보고 내 복습장에 담을 수 있어요. 링크를 아는 사람이면 누구나 볼 수 있으니 필요한 사람에게만 보내 주세요. 끄면 링크가 바로 닫혀요.</p>
        </template>
      </template>
    </section>
  </template>
</template>
