<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import { useLibraryStore } from '../stores/library'
import { useProgressStore } from '../stores/progress'
import { useSettingsStore } from '../stores/settings'
import { useAuthStore } from '../stores/auth'
import { addDays, dateKey, longDate, todayKey, WEEKDAYS } from '../lib/dates'

const router = useRouter()
const library = useLibraryStore()
const progress = useProgressStore()
const settings = useSettingsStore()
const auth = useAuthStore()

const C = 226.2
const pct = computed(() => Math.min(1, progress.todayCount / settings.dailyGoal))
const doneToday = computed(() => progress.allDates.has(todayKey()))
const message = computed(() =>
  doneToday.value ? '오늘도 해냈어요!' : progress.streak ? `오늘 한 문장만 하면 ${progress.streak + 1}일째!` : '오늘 한 문장부터 시작해 봐요',
)
const week = computed(() =>
  Array.from({ length: 7 }, (_, k) => {
    const d = addDays(new Date(), k - 6)
    const key = dateKey(d)
    return { key, label: WEEKDAYS[d.getDay()], ok: progress.allDates.has(key), today: k === 6 }
  }),
)
const lastPast = computed(() => progress.pastDates[0] ?? null)
const lastPastLabel = computed(() => (lastPast.value === dateKey(addDays(new Date(), -1)) ? '어제' : lastPast.value ? longDate(lastPast.value) : ''))
const lastPastCount = computed(() => (lastPast.value ? library.items.filter((i) => progress.datesOf(i.id).includes(lastPast.value!)).length : 0))
const videos = computed(() =>
  [...library.videos].sort((a, b) => b.createdAt - a.createdAt).map((v) => {
    const items = library.itemsOf(v.id)
    const done = items.filter((i) => progress.ever(i.id)).length
    return { v, total: items.length, done, pct: items.length ? Math.round((done / items.length) * 100) : 0 }
  }),
)

function openVideo(id: string) {
  library.select(id)
  router.push('/sent')
}
</script>

<template>
  <div class="card hero">
    <Icon name="flame" :cls="'flame' + (progress.streak || doneToday ? '' : ' off')" fill />
    <div>
      <h2><span data-testid="streak">{{ progress.streak }}</span><span>일 연속</span></h2>
      <p>{{ message }}</p>
    </div>
  </div>

  <div class="card">
    <div class="week" aria-label="최근 7일">
      <div v-for="d in week" :key="d.key" :class="{ ok: d.ok, today: d.today }"><i><Icon v-if="d.ok" name="check" /></i>{{ d.label }}</div>
    </div>
  </div>

  <div class="card goal">
    <div class="ring" role="img" :aria-label="`오늘 ${progress.todayCount}개 / 목표 ${settings.dailyGoal}개`">
      <svg viewBox="0 0 84 84">
        <circle class="tr" cx="42" cy="42" r="36" fill="none" stroke-width="9" />
        <circle class="pr" cx="42" cy="42" r="36" fill="none" stroke-width="9" stroke-linecap="round" :stroke-dasharray="C" :stroke-dashoffset="(C * (1 - pct)).toFixed(1)" />
      </svg>
      <b>{{ progress.todayCount }}</b>
    </div>
    <div class="t">
      <h3>{{ progress.todayCount >= settings.dailyGoal ? '오늘 목표 달성!' : '오늘의 목표' }}</h3>
      <p>{{ progress.todayCount }} / {{ settings.dailyGoal }} 문장</p>
      <div class="gstep">
        목표
        <button class="icon" aria-label="목표 줄이기" @click="settings.setGoal(settings.dailyGoal - 1)"><Icon name="minus" /></button>
        <button class="icon" aria-label="목표 늘리기" @click="settings.setGoal(settings.dailyGoal + 1)"><Icon name="plus" /></button>
      </div>
    </div>
  </div>

  <div v-if="lastPast" class="card review-banner">
    <div class="t"><h3>{{ lastPastLabel }} 공부한 문장</h3><p>{{ lastPastCount }}개를 다시 말해 볼까요?</p></div>
    <button class="cbtn blue" @click="router.push('/review')">복습</button>
  </div>

  <h2 class="h">내 영상</h2>
  <button class="cbtn blue wide" data-testid="add-video" @click="router.push('/video/new')"><Icon name="plus" />영상 추가</button>
  <div v-for="x in videos" :key="x.v.id" class="card video">
    <div class="cover"><Icon name="play" fill /></div>
    <div class="t">
      <h3>{{ x.v.title }}</h3>
      <div class="bar" role="progressbar" :aria-valuenow="x.pct" aria-valuemin="0" aria-valuemax="100" aria-label="공부한 문장 비율"><i :style="{ width: x.pct + '%' }" /></div>
      <small>문장 {{ x.total }}개 · 완료 {{ x.done }}개</small>
      <div class="btns">
        <button class="cbtn orange sm" @click="openVideo(x.v.id)">문장 보기</button>
        <button v-if="!library.isSample(x.v.id)" class="icon s" :aria-label="`${x.v.title} 편집`" @click="router.push(`/video/${x.v.id}`)"><Icon name="edit" /></button>
        <button class="icon s" :aria-label="`${x.v.title} 공유`" @click="router.push(`/share/${x.v.id}`)"><Icon name="share" /></button>
      </div>
    </div>
  </div>

  <h2 class="h">내 정보</h2>
  <button class="card who" style="text-align:left;flex-direction:row;cursor:pointer" data-testid="go-account" @click="router.push('/account')">
    <span class="av"><Icon name="user" /></span>
    <span><b>{{ auth.user ? auth.user.name : '로그인' }}</b><br /><small>{{ auth.user ? '내 계정 보기' : '어디서든 이어서 공부하기' }}</small></span>
  </button>
</template>
