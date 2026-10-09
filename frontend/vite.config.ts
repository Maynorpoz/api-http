import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Puerto fijo: el backend autoriza exactamente este origen en su configuracion de CORS.
    port: 5173,
    strictPort: true,
  },
})
