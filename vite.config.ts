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
        stagingV2: 'staging-v2/index.html',
        stagingV2Catalog: 'staging-v2/catalog/index.html',
        stagingV2Preview: 'staging-v2/preview/index.html',
        stagingV2Cart: 'staging-v2/cart/index.html',
        stagingV2Order: 'staging-v2/order/index.html',
        stagingV2Account: 'staging-v2/account/index.html',
        stagingV2Apps: 'staging-v2/apps/index.html',
      },
    },
  },
  server: { port: 5192, strictPort: true },
})
