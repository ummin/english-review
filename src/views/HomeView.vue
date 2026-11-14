<script setup lang="ts">
import { useAppStore } from '../stores/app'
const app = useAppStore()
</script>

<template>
  <main class="hello">
    <h1 class="logo">영어회화 복습장</h1>
    <p data-testid="status">준비 중이에요 · v{{ app.version }}</p>
  </main>
</template>
