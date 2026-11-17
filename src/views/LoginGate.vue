<script setup lang="ts">
import LoginCard from '../components/LoginCard.vue'
</script>

<template>
  <header class="top"><span class="logo">영어회화 복습장</span></header>
  <main data-testid="login-gate">
    <div class="form">
      <div class="card sec">
        <h2 style="margin:0;font-size:22px;font-weight:900">로그인이 필요해요</h2>
        <p>영어회화 카드로 복습하고, 내 공부 기록을 어디서든 이어서 볼 수 있어요. 로그인한 사람만 사용할 수 있어요.</p>
      </div>
      <LoginCard />
    </div>
  </main>
</template>
