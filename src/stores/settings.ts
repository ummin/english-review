import { ref } from 'vue'
import { defineStore } from 'pinia'
import { storage } from '../storage'

export const useSettingsStore = defineStore('settings', () => {
  const dailyGoal = ref(10)
  async function load() {
    dailyGoal.value = (await storage.loadSettings()).dailyGoal
  }
  function setGoal(n: number) {
    dailyGoal.value = Math.max(1, Math.min(50, Math.round(n)))
    void storage.saveSettings({ dailyGoal: dailyGoal.value })
  }
  return { dailyGoal, load, setGoal }
})
