<script setup lang="ts">
import { computed } from 'vue'
import type { ExprItem } from '../types'
import { useProgressStore } from '../stores/progress'
import CheckControl from './CheckControl.vue'
import StarButton from './StarButton.vue'
import PlayButton from './PlayButton.vue'
import AdjustTime from './AdjustTime.vue'
import TextBlock from './TextBlock.vue'
import SubCard from './SubCard.vue'

/** subIds: 보여줄 대답 id 모음. null이면 전부, 빈 모음이면 대답 없이 질문만. */
const props = defineProps<{ item: ExprItem; subIds?: Set<string> | null; dim?: boolean; dimSub?: (id: string) => boolean }>()
const progress = useProgressStore()
const subs = computed(() => (props.subIds ? props.item.subs.filter((s) => props.subIds!.has(s.id)) : props.item.subs))
const off = computed(() => progress.offsetOf(props.item.id))
</script>

<template>
  <div class="card" :class="{ dim }" :data-id="item.id">
    <div class="exp-head"><span class="num">{{ String(item.n).padStart(2, '0') }}</span></div>
    <TextBlock :item="item" />
    <p v-if="item.note" class="note-t">{{ item.note }}</p>
    <div class="plays">
      <PlayButton :video-id="item.videoId" :seg="item.segs.native" :offset="off" label="원어민" icon="speaker" />
      <PlayButton :video-id="item.videoId" :seg="item.segs.explain" :offset="off" label="설명" icon="book" />
      <PlayButton :video-id="item.videoId" :seg="item.segs.role" :offset="off" label="롤플레이" icon="chat" />
    </div>
    <div class="actions"><CheckControl :item="item" /><StarButton :item="item" /></div>
    <AdjustTime :item="item" />
    <div v-if="subs.length" class="subs">
      <span class="lab">대답·비슷한 표현</span>
      <SubCard v-for="s in subs" :key="s.id" :item="s" :dim="dimSub ? dimSub(s.id) : false" />
    </div>
  </div>
</template>
