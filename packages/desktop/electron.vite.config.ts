import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

/**
 * electron-vite orchestre 3 builds Vite distincts :
 * - main     → process Node d'Electron (src/main)
 * - preload  → script de pont sécurisé (src/preload)
 * - renderer → l'app React dans la fenêtre (src/renderer)
 *
 * Chaque build sort dans out/<main|preload|renderer>/.
 * Pendant `dev`, le renderer tourne sur un serveur Vite (HMR),
 * main et preload sont recompilés à chaque changement.
 */
export default defineConfig({
  main: {
    build: {
      outDir: 'out/main',
      rollupOptions: {
        input: resolve(__dirname, 'src/main/index.ts'),
      },
    },
  },
  preload: {
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: resolve(__dirname, 'src/preload/index.ts'),
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html'),
      },
    },
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer'),
      },
    },
    plugins: [react()],
    server: {
      port: 5173,
    },
  },
})
