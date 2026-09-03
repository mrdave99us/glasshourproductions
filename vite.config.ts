import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Multi-page build: / is the coming-soon page (no framework, one small WebGL moment),
// /staging/ is the React + three.js skeleton the real site grows in.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    target: 'es2020',
    rollupOptions: {
      input: {
        main: 'index.html',
        staging: 'staging/index.html',
      },
    },
  },
  server: { port: 5192, strictPort: true },
})
