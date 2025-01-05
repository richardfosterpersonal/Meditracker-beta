import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Critical Path: Frontend.Build
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@services': path.resolve(__dirname, './src/services'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Ensure we're following the critical path for production builds
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'medication': ['./src/features/medication'],
          'auth': ['./src/features/auth'],
        },
      },
    },
  },
})
