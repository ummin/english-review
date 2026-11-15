<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import Icon from './Icon.vue'
import { fmt } from '../lib/text'
import { usePlayerStore } from '../stores/player'

const player = usePlayerStore()
const mount = ref<HTMLElement | null>(null)
onMounted(() => player.registerHost(mount.value))
onBeforeUnmount(() => player.unregisterHost(mount.value))
</script>

<template>
  <section class="player" aria-label="재생 플레이어">
    <div class="player-box">
      <div ref="mount" class="player-host" />
      <div v-if="player.status === 'blocked'" class="player-msg" role="alert">
        <span>{{ player.message }}</span>
        <a class="cbtn orange sm" :href="player.ytLink" target="_blank" rel="noopener">유튜브에서 열기</a>
      </div>
    </div>
    <div class="player-bar">
      <span class="player-now" data-testid="player-now">
        <template v-if="player.seg"><span class="sr-only">{{ player.label }} </span>{{ fmt(player.seg[0]) }}–{{ fmt(player.seg[1]) }}</template>
      </span>
      <button class="chip" :aria-pressed="player.loop" @click="player.toggleLoop()">반복</button>
      <button class="chip" :aria-pressed="player.rate === 0.75" @click="player.setRate(player.rate === 0.75 ? 1 : 0.75)">0.75배</button>
      <button class="chip" aria-label="구간 다시 재생" @click="player.replay()"><Icon name="redo" />다시</button>
      <button class="icon s" aria-label="플레이어 닫기" @click="player.close()"><Icon name="close" /></button>
    </div>
    <p v-if="player.status === 'needtap'" class="player-hint" role="status">소리가 안 나면 영상의 ▶ 버튼을 한 번 눌러 주세요.</p>
  </section>
</template>
