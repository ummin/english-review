<script setup lang="ts">
import Icon from './Icon.vue'
import { useUiStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { useProgressStore } from '../stores/progress'

const ui = useUiStore()
const settings = useSettingsStore()
const progress = useProgressStore()
const colors = ['var(--orange)', 'var(--blue)', 'var(--green)', 'var(--amber)']
const confetti = Array.from({ length: 24 }, (_, i) => ({ left: `${(i * 37) % 100}%`, bg: colors[i % 4], delay: `${((i * 13) % 20) / 10}s` }))
</script>

<template>
  <div class="overlay celebrate" role="dialog" aria-modal="true" aria-label="목표 달성">
    <div class="confetti" aria-hidden="true"><i v-for="(c, i) in confetti" :key="i" :style="{ left: c.left, background: c.bg, animationDelay: c.delay }" /></div>
    <div class="box">
      <Icon name="flame" cls="big" fill />
      <h2>오늘 목표 달성!</h2>
      <p class="muted">{{ settings.dailyGoal }}문장을 따라 말했어요<template v-if="progress.streak"> · {{ progress.streak }}일 연속</template></p>
      <button class="cbtn wide" @click="ui.closeOverlay()">계속하기</button>
    </div>
  </div>
</template>
