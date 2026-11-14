<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import PlayButton from './PlayButton.vue'
import { useUiStore } from '../stores/ui'
import { useLibraryStore } from '../stores/library'
import { useProgressStore } from '../stores/progress'

const ui = useUiStore()
const library = useLibraryStore()
const progress = useProgressStore()
const item = computed(() => library.byId(ui.rv.ids[ui.rv.i] ?? ''))
const pct = computed(() => (ui.rv.ids.length ? Math.round((ui.rv.i / ui.rv.ids.length) * 100) : 0))
const seg = computed(() => {
  const it = item.value
  if (!it) return null
  return it.kind === 'expr' ? (it.segs.native ?? it.segs.explain) : it.seg
})
</script>

<template>
  <div class="overlay" role="dialog" aria-modal="true" aria-label="카드 복습">
    <div class="in">
      <div class="rtop">
        <button class="icon" aria-label="복습 닫기" @click="ui.closeOverlay()"><Icon name="close" /></button>
        <div class="rbar"><i :style="{ width: pct + '%' }" /></div>
      </div>
      <template v-if="ui.rv.fin">
        <div class="rcard"><Icon name="check" cls="big" fill /><p class="q">복습 끝!</p><p class="hint">{{ ui.rv.total }}개 문장을 다시 말해 봤어요.</p></div>
        <div class="rfoot"><button class="cbtn wide" @click="ui.closeOverlay()">닫기</button></div>
      </template>
      <template v-else-if="item">
        <div class="rcard">
          <p class="q" data-testid="rv-q">{{ item.ko || item.en }}</p>
          <div v-if="ui.rv.shown" class="ans">
            <p class="en" data-testid="rv-a">{{ item.en }}</p>
            <PlayButton v-if="seg" :video-id="item.videoId" :seg="seg" :offset="progress.offsetOf(item.id)" label="듣기" icon="play" />
          </div>
          <p v-else class="hint">영어로 말해 본 뒤 정답을 확인해요</p>
        </div>
        <div class="rfoot">
          <button v-if="!ui.rv.shown" class="cbtn blue wide" @click="ui.rv.shown = true">정답 보기</button>
          <template v-else>
            <button class="cbtn white" @click="ui.reviewNext(true)">다시 볼래요</button>
            <button class="cbtn" @click="ui.reviewNext(false)">알아요</button>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>
