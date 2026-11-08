import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import path from 'node:path'
// @ts-expect-error — plain ESM module shared with the production server
import { createEnquiryHandler } from './server/enquiries.mjs'

const dataDir = path.resolve(import.meta.dirname, 'data')

// Serves POST /api/enquiries during `vite dev` and `vite preview`.
function enquiryApi(): Plugin {
  const handler = createEnquiryHandler(dataDir)
  return {
    name: 'specter-enquiry-api',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}

// Emits sitemap.xml + robots.txt. The sitemap needs an absolute URL, so it is
// only generated when SITE_URL is provided (e.g. SITE_URL=https://example.com).
function seoFiles(): Plugin {
  return {
    name: 'specter-seo-files',
    generateBundle() {
      const site = (process.env.SITE_URL || '').replace(/\/$/, '')
      let robots = 'User-agent: *\nAllow: /\nDisallow: /api/\n'
      if (site) {
        const today = new Date().toISOString().slice(0, 10)
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${site}/</loc><lastmod>${today}</lastmod><priority>1.0</priority></url>\n</urlset>\n`,
        })
        robots += `\nSitemap: ${site}/sitemap.xml\n`
      }
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots })
    },
  }
}

export default defineConfig({
  // '/gt-theatre/' when building for GitHub Pages (see .github/workflows/pages.yml).
  base: process.env.BASE_PATH || '/',
  plugins: [react(), enquiryApi(), seoFiles()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/gsap') || id.includes('node_modules/lenis')) return 'motion'
        },
      },
    },
  },
})
