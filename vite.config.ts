import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Einstieg ist app.html (Quelle). Die fertige, eigenständige index.html im Projekt-Root
// erzeugt scripts/postbuild.mjs nach dem Build – sie wird von GitHub Pages ausgeliefert.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  server: { open: '/app.html' },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 100000000,
    rollupOptions: { input: 'app.html' },
  },
})
