<script setup lang="ts">
import { ref } from 'vue'
import Icon from './Icon.vue'
import { fmt } from '../lib/text'
import type { Card, Seg } from '../types'

const cards = defineModel<Card[]>({ required: true })
const openId = ref<string | null>(null)

const times = (c: Card) =>
  ([['원어민', c.native], ['설명', c.explain], ['역할', c.role]] as [string, Seg | null][])
    .filter((x): x is [string, Seg] => !!x[1])
    .map(([n, s]) => `${n} ${fmt(s[0])}–${fmt(s[1])}`)
    .join(' · ')

const stressText = (c: Card) => c.stress.join(', ')
const setStress = (c: Card, v: string) => { c.stress = v.split(',').map((s) => s.trim()).filter(Boolean) }
const removeCard = (i: number) => { cards.value = cards.value.filter((_, k) => k !== i) }
const removeSub = (c: Card, k: number) => { c.subs = c.subs.filter((_, j) => j !== k) }
</script>

<template>
  <div class="form" data-testid="draft-cards">
    <div v-for="(c, i) in cards" :key="c.id" class="dcard" :data-testid="`draft-${i + 1}`">
      <div class="row">
        <div class="t">
          <p class="en">{{ i + 1 }}. {{ c.en || '(영어 문장이 비어 있어요)' }}</p>
          <p class="ko">{{ c.ko }}</p>
          <span v-if="times(c)" class="times">{{ times(c) }}</span>
          <span v-if="c.subs.length" class="times"> · 대답·비슷한 표현 {{ c.subs.length }}개</span>
        </div>
        <button class="icon s" :aria-label="`카드 ${i + 1} ${openId === c.id ? '접기' : '수정'}`" :aria-expanded="openId === c.id" @click="openId = openId === c.id ? null : c.id"><Icon name="edit" /></button>
        <button class="icon s" :aria-label="`카드 ${i + 1} 삭제`" @click="removeCard(i)"><Icon name="trash" /></button>
      </div>
      <div v-if="openId === c.id" class="form">
        <label class="f">영어 문장<input v-model="c.en" type="text" maxlength="500" /></label>
        <label class="f">한국어 뜻<input v-model="c.ko" type="text" maxlength="500" /></label>
        <label class="f">메모<textarea v-model="c.note" style="min-height:80px" maxlength="1000" /></label>
        <label class="f">세게 읽는 단어 (쉼표로 구분)<input :value="stressText(c)" type="text" @change="setStress(c, ($event.target as HTMLInputElement).value)" /></label>
        <div v-for="(s, k) in c.subs" :key="s.id" class="ed-sub">
          <span class="tag">{{ s.kind === 'alt' ? '비슷한 표현' : '대답' }}</span>
          <label class="f">영어<input v-model="s.en" type="text" maxlength="500" /></label>
          <label class="f">한국어<input v-model="s.ko" type="text" maxlength="500" /></label>
          <button class="cbtn danger sm" @click="removeSub(c, k)"><Icon name="trash" />이 {{ s.kind === 'alt' ? '표현' : '대답' }} 삭제</button>
        </div>
        <p class="hintp" style="font-size:12px;color:var(--muted);margin:0">재생 구간은 여기서 바꾸지 않아요. 문장 화면의 시간 보정으로 맞춰요.</p>
      </div>
    </div>
  </div>
</template>
