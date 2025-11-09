import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Todo lo que empiece por /api lo reenvía a Django (127.0.0.1:8000)
      '/api': 'http://127.0.0.1:8000',
    },
  },
})