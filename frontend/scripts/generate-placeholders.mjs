// Generates abstract SVG artwork for the demo projects (public/projects/<slug>-{cover,1,2,3}.svg).
// Deterministic: re-running yields identical files. Replace the images from the admin dashboard.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'projects')
mkdirSync(OUT, { recursive: true })
const W = 1600
const H = 1000

const rng = (seed) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)

const PROJECTS = {
  aurora: { kind: 'arcs', bg: ['#0b2a4a', '#3b1d6e'], ink: '#8cf0d4', alt: '#d9b3ff' },
  atlas: { kind: 'grid', bg: ['#dccbb5', '#c4b199'], ink: '#084d6e', alt: '#f4ede2' },
  nimbus: { kind: 'blobs', bg: ['#06344f', '#0b6b8f'], ink: '#d8dad6', alt: '#7fd4ff' },
  pulse: { kind: 'wave', bg: ['#2b0f1c', '#7a1f3d'], ink: '#ff9e80', alt: '#ffe0d1' },
  lumen: { kind: 'glow', bg: ['#1b1408', '#3d2b0c'], ink: '#ffd36e', alt: '#fff3cf' },
}

const defs = (p, id) =>
  `<defs><linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.bg[0]}"/><stop offset="1" stop-color="${p.bg[1]}"/></linearGradient><filter id="blur${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="60"/></filter></defs>`

const kinds = {
  arcs(p, r) {
    const cx = W * (0.3 + r() * 0.4)
    const cy = H * (0.35 + r() * 0.4)
    let out = ''
    for (let i = 0; i < 14; i++) {
      const rad = 70 + i * 62
      const start = r() * Math.PI * 2
      const sweep = Math.PI * (0.5 + r() * 1.2)
      const x1 = cx + rad * Math.cos(start),
        y1 = cy + rad * Math.sin(start)
      const x2 = cx + rad * Math.cos(start + sweep),
        y2 = cy + rad * Math.sin(start + sweep)
      out += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} A${rad} ${rad} 0 ${sweep > Math.PI ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${i % 3 ? p.ink : p.alt}" stroke-width="${2 + (i % 4) * 3}" stroke-linecap="round" opacity="${0.35 + r() * 0.65}"/>`
    }
    return out + `<circle cx="${cx}" cy="${cy}" r="38" fill="${p.alt}"/>`
  },
  grid(p, r) {
    const cols = 8,
      rows = 5,
      cw = W / cols,
      ch = H / rows
    let out = ''
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const v = r()
        if (v < 0.42) continue
        const fill = v < 0.7 ? p.ink : v < 0.88 ? p.alt : 'none'
        out += `<rect x="${x * cw + 14}" y="${y * ch + 14}" width="${cw - 28}" height="${ch - 28}" fill="${fill}" stroke="${p.ink}" stroke-width="3" opacity="${fill === 'none' ? 0.7 : 0.92}"/>`
      }
    return out
  },
  blobs(p, r) {
    let out = ''
    for (let i = 0; i < 7; i++)
      out += `<circle cx="${r() * W}" cy="${r() * H}" r="${140 + r() * 260}" fill="${i % 2 ? p.alt : p.ink}" opacity="${0.18 + r() * 0.35}" filter="url(#blurX)"/>`
    for (let i = 0; i < 26; i++)
      out += `<circle cx="${r() * W}" cy="${r() * H}" r="${2 + r() * 5}" fill="${p.ink}" opacity="${0.4 + r() * 0.5}"/>`
    return out
  },
  wave(p, r) {
    let out = ''
    const base = H * (0.4 + r() * 0.2)
    for (let k = 0; k < 9; k++) {
      const amp = 40 + r() * 190,
        freq = 0.004 + r() * 0.008,
        phase = r() * 6
      let d = ''
      for (let x = 0; x <= W; x += 16)
        d += `${x ? 'L' : 'M'}${x} ${(base + (k - 4) * 34 + amp * Math.sin(x * freq + phase)).toFixed(1)}`
      out += `<path d="${d}" fill="none" stroke="${k % 2 ? p.ink : p.alt}" stroke-width="${3 + (k % 3) * 2}" stroke-linecap="round" opacity="${0.35 + r() * 0.6}"/>`
    }
    return out
  },
  glow(p, r) {
    let out = ''
    const cx = W * (0.25 + r() * 0.5),
      cy = H * (0.3 + r() * 0.4)
    out += `<radialGradient id="g"><stop offset="0" stop-color="${p.alt}"/><stop offset="0.35" stop-color="${p.ink}" stop-opacity="0.8"/><stop offset="1" stop-color="${p.ink}" stop-opacity="0"/></radialGradient>`
    out += `<circle cx="${cx}" cy="${cy}" r="520" fill="url(#g)"/>`
    for (let i = 0; i < 18; i++) {
      const x = r() * W
      out += `<line x1="${x}" y1="0" x2="${x + (r() - 0.5) * 300}" y2="${H}" stroke="${p.ink}" stroke-width="${1 + r() * 3}" opacity="${0.1 + r() * 0.3}"/>`
    }
    return out
  },
}

for (const [slug, p] of Object.entries(PROJECTS)) {
  for (const variant of ['cover', '1', '2', '3']) {
    const r = rng(hash(`${slug}-${variant}`))
    const body = kinds[p.kind](p, r).replaceAll('blurX', `blur${variant}`)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">${defs(p, variant)}<rect width="${W}" height="${H}" fill="url(#bg${variant})"/>${body}</svg>\n`
    writeFileSync(join(OUT, `${slug}-${variant}.svg`), svg)
  }
}
console.log(`Wrote ${Object.keys(PROJECTS).length * 4} placeholder images to ${OUT}`)
