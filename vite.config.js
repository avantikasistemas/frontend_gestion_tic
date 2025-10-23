import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  plugins: [
    vue(), 
    // vueDevTools()
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  server: {
    host: '0.0.0.0',
    port: 5184,
  },
  build: {
    // Asegurarse de que el output sea en dist/
    outDir: 'dist',
    // No fallar el build por warnings
    rollupOptions: {
      onwarn(warning, warn) {
        // Ignorar warnings específicos si es necesario
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return
        warn(warning)
      }
    }
  }
})