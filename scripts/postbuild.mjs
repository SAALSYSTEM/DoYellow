// Nach `vite build`: dist/app.html (alles eingebettet) als eigenständige index.html in den Projekt-Root kopieren.
import { readFileSync, writeFileSync } from 'node:fs'

const html = readFileSync('dist/app.html', 'utf8')
if (html.includes('/src/main.tsx')) throw new Error('Build enthält noch den Dev-Einstieg /src/main.tsx')
writeFileSync('index.html', html)
console.log(`index.html geschrieben (${Math.round(html.length / 1024)} KB, keine externen Skripte)`)
