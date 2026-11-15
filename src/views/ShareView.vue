<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import { useLibraryStore } from '../stores/library'
import { useUiStore } from '../stores/ui'
import { fileNameFor, toCardFile } from '../lib/cardfile'

const route = useRoute()
const router = useRouter()
const library = useLibraryStore()
const ui = useUiStore()

const video = computed(() => library.videoById(String(route.params.id ?? '')))
const linkOn = ref(false)
/** 미리보기용 주소. 실제로는 8단계에서 만들어진다. */
const fakeLink = computed(() => `${location.origin}${import.meta.env.BASE_URL}#/s/${(video.value?.id ?? '').toLowerCase().slice(-8).padStart(8, 'x')}`)

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
      <p class="notice info" data-testid="share-preview-note">미리보기 화면이에요. 링크는 로그인과 저장소를 연결하는 단계에서 실제로 만들어져요.</p>
      <label class="switch"><input v-model="linkOn" type="checkbox" role="switch" data-testid="link-switch" />링크로 공유하기</label>
      <template v-if="linkOn">
        <div class="linkbox"><input type="text" readonly :value="fakeLink" aria-label="공유 링크(미리보기)" data-testid="link" /></div>
        <button class="cbtn white wide" disabled><Icon name="copy" />링크 복사 (준비 중)</button>
        <p>링크를 열면 로그인하지 않아도 카드를 보고, 내 복습장에 담을 수 있게 할 예정이에요.</p>
      </template>
    </section>
  </template>
</template>
