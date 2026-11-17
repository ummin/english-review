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
        <ul class="plain" style="margin:8px 0 0">
          <li>유튜브 영어회화 영상에서 뽑은 표현을 카드로 만들어 반복 복습해요.</li>
          <li>내 AI 채팅으로 카드를 만들어 붙여 넣고, 친구와 링크로 나눌 수 있어요.</li>
          <li>Google 계정으로만 로그인하며, 이메일과 이름 외의 정보는 가져오지 않아요.</li>
        </ul>
      </div>
      <LoginCard />
    </div>
  </main>
</template>
