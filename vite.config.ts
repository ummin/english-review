import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// GitHub Pages: https://ummin.github.io/english-review/
export default defineConfig({
  base: process.env.VITE_BASE ?? '/english-review/',
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
  },
})
