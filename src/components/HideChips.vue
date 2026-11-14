<script setup lang="ts">
import { useUiStore } from '../stores/ui'
const ui = useUiStore()
</script>

<template>
  <div class="tools">
    <div class="chips">
      <button class="chip" :aria-pressed="ui.hideKo" @click="ui.toggleHideKo()">한글 가리기</button>
      <button class="chip" :aria-pressed="ui.hideEn" @click="ui.toggleHideEn()">영어 가리기</button>
    </div>
  </div>
</template>
