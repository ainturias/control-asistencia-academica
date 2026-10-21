import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // ws: también redirige la conexión en tiempo real (/api/socket.io).
      '/api': { target: 'http://localhost:3000', ws: true },
    },
  },
})
