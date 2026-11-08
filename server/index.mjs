// Minimal production server: serves the built site from /dist and handles
// POST /api/enquiries with local JSON storage. Usage: npm run build && npm start
import http from 'node:http'
import { promises as fs, createReadStream } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createEnquiryHandler } from './enquiries.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const dataDir = path.join(root, 'data')
const port = Number(process.env.PORT) || 4173

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.ico': 'image/x-icon',
}

const api = createEnquiryHandler(dataDir)

async function serveStatic(req, res) {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
  let file = path.normalize(path.join(dist, urlPath))
  if (!file.startsWith(dist)) {
    res.statusCode = 403
    return res.end('Forbidden')
  }
  try {
    const stat = await fs.stat(file)
    if (stat.isDirectory()) file = path.join(file, 'index.html')
  } catch {
    file = path.join(dist, 'index.html')
  }
  try {
    const stat = await fs.stat(file)
    const ext = path.extname(file)
    res.setHeader('Content-Type', TYPES[ext] || 'application/octet-stream')
    if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    // Range support so <video> can seek.
    const range = req.headers.range
    if (range && ext === '.mp4') {
      const [s, e] = range.replace('bytes=', '').split('-')
      const start = Number(s)
      const end = e ? Number(e) : stat.size - 1
      res.statusCode = 206
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`)
      res.setHeader('Accept-Ranges', 'bytes')
      res.setHeader('Content-Length', end - start + 1)
      return createReadStream(file, { start, end }).pipe(res)
    }
    res.setHeader('Content-Length', stat.size)
    createReadStream(file).pipe(res)
  } catch {
    res.statusCode = 404
    res.end('Not found')
  }
}

http
  .createServer((req, res) => api(req, res, () => serveStatic(req, res)))
  .listen(port, () => console.log(`Specter Theatres running at http://localhost:${port}`))
