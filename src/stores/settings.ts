import { ref } from 'vue'
import { defineStore } from 'pinia'
import { storage } from '../storage'
import { useUiStore } from './ui'

export const useSettingsStore = defineStore('settings', () => {
  const dailyGoal = ref(10)
  async function load() {
    dailyGoal.value = (await storage.loadSettings()).dailyGoal
  }
  function setGoal(n: number) {
    dailyGoal.value = Math.max(1, Math.min(50, Math.round(n)))
    storage.saveSettings({ dailyGoal: dailyGoal.value }).catch(() => useUiStore().say('목표를 저장하지 못했어요. 인터넷 연결을 확인해 주세요.'))
  }
  return { dailyGoal, load, setGoal }
})
