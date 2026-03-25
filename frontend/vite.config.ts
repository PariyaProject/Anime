import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const frontendPort = Number(env.FRONTEND_PORT || 3000)
  const backendPort = Number(env.BACKEND_PORT || 3006)
  const frontendHost = env.FRONTEND_HOST || '0.0.0.0'
  const backendTarget =
    env.VITE_DEV_PROXY_TARGET || env.VITE_API_BASE_URL || `http://localhost:${backendPort}`

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      host: frontendHost,
      port: frontendPort,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true
        }
      }
    },
    preview: {
      host: frontendHost,
      port: frontendPort
    },
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      // Disable source maps for production (smaller files)
      sourcemap: false,
      // Use esbuild for minification (built-in, faster)
      minify: 'esbuild',
      rollupOptions: {
        output: {
          // Asset naming for cache busting
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
        }
      },
      // Chunk size warning limit
      chunkSizeWarningLimit: 1000
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ['vue', 'vue-router', 'pinia', 'axios', 'element-plus'],
      exclude: []
    }
  }
})
