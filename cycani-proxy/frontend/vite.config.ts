import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3006',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // Enable source maps for production debugging
    sourcemap: true,
    // Use esbuild for minification (built-in, faster)
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            // Vue core
            if (id.includes('vue') || id.includes('pinia') || id.includes('@vue')) {
              return 'vendor'
            }
            // Router
            if (id.includes('vue-router')) {
              return 'router'
            }
            // UI library
            if (id.includes('element-plus')) {
              return 'ui'
            }
            // Video player
            if (id.includes('plyr')) {
              return 'player'
            }
            // Other dependencies
            return 'vendor'
          }
        },
        // Asset naming for cache busting
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    // Chunk size warning limit
    chunkSizeWarningLimit: 600
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'axios', 'element-plus'],
    exclude: []
  }
})
