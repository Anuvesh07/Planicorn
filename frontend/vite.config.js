import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production'
  
  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: isProduction
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: !isProduction,
      minify: isProduction ? 'esbuild' : false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            dnd: ['react-dnd', 'react-dnd-html5-backend'],
            socket: ['socket.io-client']
          }
        }
      }
    },
    css: {
      modules: {
        localsConvention: 'camelCase'
      }
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.js']
    },
    define: {
      __DEV__: !isProduction
    }
  }
})