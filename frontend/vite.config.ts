import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/workers': resolve(__dirname, './src/workers'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    watch: {
      usePolling: true, // Enable polling for Docker compatibility
    },
  },
  worker: {
    format: 'es',
    rollupOptions: {
      output: {
        format: 'es'
      }
    }
  },
  optimizeDeps: {
    exclude: [
      '@jsquash/avif',
      '@jsquash/jpeg',
      '@jsquash/png',
      '@jsquash/webp',
      'gifsicle-wasm-browser',
      '@ffmpeg/ffmpeg',
      '@ffmpeg/util'
    ],
  },
  build: {
    target: 'esnext',
    // Optimize bundle size
    minify: 'esbuild',
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Generate sourcemaps for production debugging
    sourcemap: false,
    // Suppress WASM source map warnings
    assetsInlineLimit: 0,
    // Chunk size warnings
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Manual chunking for better caching
        manualChunks: {
          // Vendor chunk for React and React DOM
          'react-vendor': ['react', 'react-dom'],
          // UI components chunk
          'ui-vendor': [
            '@radix-ui/react-checkbox',
            '@radix-ui/react-label',
            '@radix-ui/react-progress',
            '@radix-ui/react-select',
            '@radix-ui/react-slider',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            'lucide-react',
          ],
          // Utilities chunk
          'utils-vendor': [
            'clsx',
            'class-variance-authority',
            'tailwind-merge',
          ],
          // Image processing vendors (lazy loaded separately)
          'jszip-vendor': ['jszip'],
          'dropzone-vendor': ['react-dropzone'],
        },
        // Optimize asset file names for caching
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.')
          const extType = info?.[info.length - 1]
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType || '')) {
            return `assets/images/[name]-[hash][extname]`
          } else if (/woff2?|eot|ttf|otf/i.test(extType || '')) {
            return `assets/fonts/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
  },
})
