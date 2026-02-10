import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

// https://vite.dev/config/
export default defineConfig({
  base: './', // CRITICAL for GitHub Pages
  plugins: [
    react(),
    tailwindcss(),
    wasm(),
    topLevelAwait()
  ],
  server: {
    host: true,
    port: 3000,
  }
})
