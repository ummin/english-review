<script setup lang="ts">
import Icon from './Icon.vue'
import { useProgressStore } from '../stores/progress'
import { useSettingsStore } from '../stores/settings'
const progress = useProgressStore()
const settings = useSettingsStore()
</script>

<template>
  <header class="top">
    <span class="logo">영어회화 복습장</span>
    <span class="pill fire" :class="{ off: !progress.streak }" aria-label="연속 공부일"><Icon name="flame" fill />{{ progress.streak }}</span>
    <span class="pill goal" aria-label="오늘 목표"><Icon name="check" />{{ progress.todayCount }}/{{ settings.dailyGoal }}</span>
  </header>
</template>
