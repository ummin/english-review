<script setup lang="ts">
import type { SubItem } from '../types'
import { useProgressStore } from '../stores/progress'
import CheckControl from './CheckControl.vue'
import StarButton from './StarButton.vue'
import PlayButton from './PlayButton.vue'
import AdjustTime from './AdjustTime.vue'
import TextBlock from './TextBlock.vue'

defineProps<{ item: SubItem; standalone?: boolean; dim?: boolean }>()
const progress = useProgressStore()
</script>

<template>
  <div :class="[standalone ? 'card' : 'sub', { dim }]" :data-id="item.id">
    <div class="shead">
      <span class="tag">{{ item.kind === 'alt' ? '비슷한 표현' : '대답' }}</span>
      <span v-if="item.restored" class="tag warn">복원한 문장</span>
    </div>
    <span v-if="standalone" class="ctx">{{ item.parent.en }}</span>
    <TextBlock :item="item" small />
    <div v-if="item.seg" class="plays">
      <PlayButton :video-id="item.videoId" :seg="item.seg" :offset="progress.offsetOf(item.id)" label="듣기" icon="play" />
    </div>
    <div class="actions"><CheckControl :item="item" short label="따라 말하기 완료" /><StarButton :item="item" small /></div>
    <AdjustTime :item="item" />
  </div>
</template>
