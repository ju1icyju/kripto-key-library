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
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Heavy crypto libs → separate vendor chunk (cached independently)
          if (id.includes('ethers') || id.includes('bitcoinjs-lib') || id.includes('ecpair') || id.includes('tiny-secp256k1')) {
            return 'vendor-crypto';
          }
          // React + React-DOM → separate vendor chunk
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
        },
      },
    },
  },
})

