// Nach `vite build`: dist/app.html (alles eingebettet) als eigenständige index.html ausgeben.
// Root-index.html für GitHub Pages, dist/index.html für Cloudflare Pages (Output-Verzeichnis `dist`).
import { readFileSync, writeFileSync } from 'node:fs'

const html = readFileSync('dist/app.html', 'utf8')
if (html.includes('/src/main.tsx')) throw new Error('Build enthält noch den Dev-Einstieg /src/main.tsx')
writeFileSync('index.html', html)
writeFileSync('dist/index.html', html)
console.log(`index.html geschrieben (${Math.round(html.length / 1024)} KB, keine externen Skripte)`)
