<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import DraftCardList from '../components/DraftCardList.vue'
import { useLibraryStore } from '../stores/library'
import { useUiStore } from '../stores/ui'
import { useAuthStore } from '../stores/auth'
import { buildPrompt } from '../lib/prompt'
import { copyText } from '../lib/clipboard'
import { parseCardFile, parseYoutubeId, withIds, type ParseResult } from '../lib/cardfile'
import { uid } from '../lib/id'
import type { Card, Video } from '../types'

const route = useRoute()
const router = useRouter()
const library = useLibraryStore()
const ui = useUiStore()
const auth = useAuthStore()

const editId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null))
const original = editId.value ? library.videoById(editId.value) : null
const isNew = !editId.value
/** 샘플이거나 없는 영상은 고칠 수 없다. */
const blocked = computed(() => {
  if (isNew) return ''
  if (!original) return '찾을 수 없는 영상이에요.'
  if (library.isSample(original.id)) return '샘플 영상은 수정할 수 없어요. 새 영상을 추가해 보세요.'
  return ''
})

const videoId = original?.id ?? `v${uid(8)}`
const title = ref(original?.title ?? '')
const ytInput = ref(original?.youtubeId ?? '')
const cards = ref<Card[]>(original ? (JSON.parse(JSON.stringify(original.cards)) as Card[]) : [])

const ytId = computed(() => parseYoutubeId(ytInput.value))
const ytMsg = computed(() => (!ytInput.value.trim() ? '' : ytId.value ? `영상 ID: ${ytId.value}` : '유튜브 주소나 11자리 영상 ID를 확인해 주세요.'))

const prompt = buildPrompt()
async function copyPrompt() {
  ui.say((await copyText(prompt)) ? '프롬프트를 복사했어요. AI 채팅에 붙여 넣어 주세요.' : '복사하지 못했어요. 아래 글을 길게 눌러 직접 복사해 주세요.')
}

const pasted = ref('')
const checked = ref<ParseResult | null>(null)
watch(pasted, () => { checked.value = null })
function check() { checked.value = parseCardFile(pasted.value) }
const okResult = computed(() => (checked.value && checked.value.ok ? checked.value : null))
const subCount = computed(() => okResult.value?.data.cards.reduce((n, c) => n + c.subs.length, 0) ?? 0)

function addChecked() {
  const r = okResult.value
  if (!r) return
  const taken = new Set(cards.value.flatMap((c) => [c.id, ...c.subs.map((s) => s.id)]))
  cards.value = [...cards.value, ...withIds(videoId, r.data.cards, taken)]
  if (!title.value.trim() && r.data.title) title.value = r.data.title
  if (!ytInput.value.trim() && r.data.youtubeId) ytInput.value = r.data.youtubeId
  ui.say(`카드 ${r.data.cards.length}개를 추가했어요.`)
  pasted.value = ''
  checked.value = null
}

const fileMsg = ref('')
async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  input.value = ''
  fileMsg.value = ''
  if (!f) return
  if (f.size > 2_000_000) { fileMsg.value = '파일이 너무 커요. (2MB 이하)'; return }
  pasted.value = await f.text()
  await nextTick() // 붙여넣은 글이 바뀌면 이전 검사 결과를 지우는 감시가 먼저 돌게 한 뒤 검사한다
  check()
}

const saving = ref(false)
const saveError = ref('')
const canSave = computed(() => !!ytId.value && !!title.value.trim() && cards.value.length > 0 && cards.value.every((c) => c.en.trim()))
const saveHint = computed(() => {
  if (!title.value.trim()) return '제목을 입력해 주세요.'
  if (!ytId.value) return '유튜브 주소를 입력해 주세요.'
  if (!cards.value.length) return '카드를 하나 이상 추가해 주세요.'
  if (!cards.value.every((c) => c.en.trim())) return '영어 문장이 비어 있는 카드가 있어요.'
  return ''
})
async function save() {
  if (!canSave.value || saving.value) return
  saving.value = true
  saveError.value = ''
  const v: Video = {
    id: videoId,
    youtubeId: ytId.value!,
    title: title.value.trim(),
    createdAt: original?.createdAt ?? Date.now(),
    ...(original?.shareId ? { shareId: original.shareId } : {}),
    cards: cards.value.map((c) => ({ ...c, en: c.en.trim(), ko: c.ko.trim(), note: c.note.trim(), subs: c.subs.map((s) => ({ ...s, en: s.en.trim(), ko: s.ko.trim() })) })),
  }
  try {
    await library.saveVideo(v)
    library.select(v.id)
    ui.say(isNew ? '영상을 저장했어요.' : '수정한 내용을 저장했어요.')
    router.push('/sent')
  } catch {
    saveError.value = '저장하지 못했어요. 잠시 뒤 다시 눌러 주세요.'
  } finally {
    saving.value = false
  }
}

const confirmDel = ref(false)
async function remove() {
  if (!original) return
  try {
    await library.removeVideo(original.id)
    ui.say('영상을 삭제했어요.')
    router.push('/')
  } catch {
    saveError.value = '삭제하지 못했어요. 잠시 뒤 다시 눌러 주세요.'
  }
}
</script>

<template>
  <div class="subhead">
    <button class="icon" aria-label="뒤로" @click="router.back()"><Icon name="back" /></button>
    <h2>{{ isNew ? '영상 추가' : '영상 편집' }}</h2>
  </div>

  <div v-if="blocked" class="empty" role="alert"><strong>{{ blocked }}</strong><button class="cbtn blue sm" style="margin:8px auto 0" @click="router.push('/')">홈으로</button></div>

  <template v-else>
    <p v-if="!auth.loggedIn" class="notice" data-testid="local-notice">로그인하지 않으면 이 기기에만 저장돼요. 로그인하면 다른 저장소로 바뀌어 지금 만든 영상은 보이지 않아요. (내 계정 화면에서 옮길 수 있어요)</p>
    <section class="card sec" aria-labelledby="s1">
      <h3 id="s1"><span class="no">1</span>영상 정보</h3>
      <label class="f">제목<input v-model="title" type="text" maxlength="100" placeholder="예: 공항에서 쓰는 영어" data-testid="title" /></label>
      <label class="f">유튜브 주소 또는 영상 ID
        <input v-model="ytInput" type="text" inputmode="url" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="https://youtu.be/..." data-testid="yt" />
      </label>
      <p v-if="ytMsg" class="field-msg" :class="ytId ? 'ok' : 'bad'" data-testid="yt-msg" role="status">{{ ytMsg }}</p>
    </section>

    <section class="card sec" aria-labelledby="s2">
      <h3 id="s2"><span class="no">2</span>AI에게 카드 만들기</h3>
      <ol class="steps">
        <li>아래 버튼으로 프롬프트를 복사해요.</li>
        <li>평소 쓰는 AI 채팅에 붙여 넣고, 맨 아래 자리에 유튜브 스크립트를 붙여 넣어 보내요.</li>
        <li>AI가 준 답변 전체를 복사해 다음 칸에 붙여 넣어요.</li>
      </ol>
      <button class="cbtn blue wide" data-testid="copy-prompt" @click="copyPrompt"><Icon name="copy" />프롬프트 복사</button>
      <details class="more"><summary>프롬프트 내용 보기</summary><textarea class="prompt-box" readonly :value="prompt" aria-label="프롬프트 내용" /></details>
    </section>

    <section class="card sec" aria-labelledby="s3">
      <h3 id="s3"><span class="no">3</span>AI 답변 붙여 넣기</h3>
      <textarea v-model="pasted" placeholder="AI가 준 답변을 여기에 붙여 넣어 주세요" aria-label="AI 답변" data-testid="paste" />
      <div class="btnrow">
        <button class="cbtn white" :disabled="!pasted.trim()" data-testid="check" @click="check">확인하기</button>
        <label class="cbtn white" style="cursor:pointer">파일에서 불러오기<input type="file" accept=".json,application/json,text/plain" class="sr-only" aria-label="카드 파일 선택" data-testid="file" @change="onFile" /></label>
      </div>
      <p v-if="fileMsg" class="field-msg bad" role="alert">{{ fileMsg }}</p>
      <template v-if="checked">
        <div v-if="!checked.ok" role="alert" data-testid="check-errors">
          <p class="field-msg bad">이대로는 쓸 수 없어요. 아래를 고치거나 AI에게 다시 만들어 달라고 해 보세요.</p>
          <ul class="errlist"><li v-for="(e, k) in checked.errors.slice(0, 8)" :key="k">{{ e }}</li><li v-if="checked.errors.length > 8">…외 {{ checked.errors.length - 8 }}건</li></ul>
        </div>
        <div v-else role="status" data-testid="check-ok">
          <p class="field-msg ok">카드 {{ checked.data.cards.length }}개(대답·비슷한 표현 {{ subCount }}개)를 읽었어요.</p>
          <ul v-if="checked.warnings.length" class="warnlist"><li v-for="(w, k) in checked.warnings.slice(0, 5)" :key="k">{{ w }}</li></ul>
          <button class="cbtn wide" style="margin-top:8px" data-testid="add-cards" @click="addChecked">카드 {{ checked.data.cards.length }}개 추가</button>
        </div>
      </template>
    </section>

    <section class="card sec" aria-labelledby="s4">
      <h3 id="s4"><span class="no">4</span>{{ isNew ? '등록할 카드' : '카드' }} <span data-testid="card-count" style="font-weight:700;color:var(--muted)">{{ cards.length }}개</span></h3>
      <div v-if="!cards.length" class="empty"><strong>아직 카드가 없어요</strong><span>위에서 AI 답변을 붙여 넣고 추가해 주세요.</span></div>
      <DraftCardList v-else v-model="cards" />
    </section>

    <p v-if="saveHint" class="field-msg" style="color:var(--muted)" data-testid="save-hint">{{ saveHint }}</p>
    <p v-if="saveError" class="field-msg bad" role="alert">{{ saveError }}</p>
    <button class="cbtn orange wide" :disabled="!canSave || saving" data-testid="save" @click="save">{{ isNew ? '영상 저장' : '수정 저장' }}</button>

    <section v-if="!isNew" class="card sec">
      <h3>영상 삭제</h3>
      <template v-if="!confirmDel">
        <p>이 영상과 카드가 지워져요. 지금까지의 연속 공부일 기록은 남아요.</p>
        <button class="cbtn danger wide" data-testid="del" @click="confirmDel = true"><Icon name="trash" />영상 삭제</button>
      </template>
      <template v-else>
        <p class="notice" role="alert">정말 삭제할까요? 되돌릴 수 없어요.</p>
        <div class="btnrow"><button class="cbtn white" @click="confirmDel = false">취소</button><button class="cbtn danger" data-testid="del-yes" @click="remove">네, 삭제할게요</button></div>
      </template>
    </section>
  </template>
</template>
