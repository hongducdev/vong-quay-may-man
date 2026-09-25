import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // The only runtime that ever loads this build is Tauri's WebView2, which is
    // an evergreen Chromium. Targeting it directly avoids shipping unnecessary
    // downlevelled output that a weak CPU would have to parse at startup.
    target: 'chrome110',
    cssTarget: 'chrome110',
    sourcemap: false,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        // Keep the heavyweight, rarely used libraries in their own chunks so
        // they are never part of the initial parse on app launch.
        manualChunks(id) {
          if (id.includes('node_modules/xlsx')) return 'spreadsheet'
          if (id.includes('node_modules/canvas-confetti')) return 'confetti'
          return undefined
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**', '**/dist-windows/**'],
    },
  },
})
