import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'recharts-vendor': ['recharts', 'd3-scale'],
          'ui-vendor': ['lucide-react', 'react-simple-maps', 'react-tooltip']
        }
      }
    }
  }
})
