import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

mkdirSync('public', { recursive: true })

const sizes = [
  { size: 192, out: 'public/icon-192.png' },
  { size: 512, out: 'public/icon-512.png' },
  { size: 180, out: 'public/apple-touch-icon.png' },
  { size: 32, out: 'public/favicon-32.png' },
]

for (const { size, out } of sizes) {
  await sharp('icon-source.svg').resize(size, size).png().toFile(out)
  console.log('wrote', out)
}

// maskable icon with safe-zone padding (icon content within inner ~80%)
await sharp('icon-source.svg')
  .resize(410, 410)
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: '#6366f1' })
  .png()
  .toFile('public/icon-maskable-512.png')
console.log('wrote public/icon-maskable-512.png')
