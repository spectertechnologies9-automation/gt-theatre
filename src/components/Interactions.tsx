import { useEffect, useRef } from 'react'
import { gsap, getLenis } from '../lib/motion'
import { prefersReducedMotion } from '../lib/stage'

const fine = () => window.matchMedia('(pointer: fine)').matches

// Page-wide playful layer: gold dust on click, a gold scroll thread,
// 3D tilt + glare on [data-tilt], hero letters that lean toward the pointer,
// and drag-to-scroll on the gallery.
export function Interactions() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const thread = useRef<HTMLDivElement>(null)

  // Scroll thread
  useEffect(() => {
    const t = thread.current
    if (!t) return
    const set = gsap.quickSetter(t, 'scaleX')
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      set(max > 0 ? window.scrollY / max : 0)
    }
    gsap.ticker.add(update)
    return () => gsap.ticker.remove(update)
  }, [])

  // Gold dust burst on click
  useEffect(() => {
    const c = canvas.current
    if (!c || prefersReducedMotion()) return
    const ctx = c.getContext('2d')!
    type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; hue: number }
    let parts: P[] = []
    let running = false
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const resize = () => {
      c.width = window.innerWidth * dpr
      c.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    const tick = (_: number, dt: number) => {
      const k = Math.min(dt, 40) / 16.67
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      parts = parts.filter((p) => (p.life += k) < p.max)
      for (const p of parts) {
        p.vx *= 0.96
        p.vy = p.vy * 0.96 + 0.06 * k
        p.x += p.vx * k
        p.y += p.vy * k
        const a = 1 - p.life / p.max
        ctx.globalAlpha = a
        ctx.fillStyle = `hsl(${p.hue} 62% ${58 + a * 20}%)`
        ctx.beginPath()
        // four-point star sparkle
        const r = p.r * (0.6 + a * 0.4)
        ctx.moveTo(p.x, p.y - r * 2.2)
        ctx.quadraticCurveTo(p.x, p.y, p.x + r * 2.2, p.y)
        ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + r * 2.2)
        ctx.quadraticCurveTo(p.x, p.y, p.x - r * 2.2, p.y)
        ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - r * 2.2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      if (!parts.length) {
        gsap.ticker.remove(tick)
        running = false
      }
    }
    const burst = (e: PointerEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, .menu')) return
      const n = 16 + Math.round(Math.random() * 8)
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.4
        const sp = 2 + Math.random() * 4.5
        parts.push({ x: e.clientX, y: e.clientY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.5, life: 0, max: 45 + Math.random() * 30, r: 1.2 + Math.random() * 2, hue: 38 + Math.random() * 10 })
      }
      if (!running) {
        running = true
        gsap.ticker.add(tick)
      }
    }
    window.addEventListener('pointerdown', burst, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', burst)
      window.removeEventListener('resize', resize)
      gsap.ticker.remove(tick)
    }
  }, [])

  // Tilt + glare on [data-tilt]
  useEffect(() => {
    if (!fine() || prefersReducedMotion()) return
    const map = new WeakMap<HTMLElement, { rx: gsap.QuickToFunc; ry: gsap.QuickToFunc }>()
    let current: HTMLElement | null = null
    const get = (el: HTMLElement) => {
      let q = map.get(el)
      if (!q) {
        gsap.set(el, { transformPerspective: 900 })
        q = { rx: gsap.quickTo(el, 'rotationX', { duration: 0.8, ease: 'power3.out' }), ry: gsap.quickTo(el, 'rotationY', { duration: 0.8, ease: 'power3.out' }) }
        map.set(el, q)
      }
      return q
    }
    const move = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest?.('[data-tilt]') as HTMLElement | null
      if (current && current !== el) {
        const q = get(current)
        q.rx(0)
        q.ry(0)
        current.classList.remove('is-tilting')
      }
      current = el
      if (!el) return
      const b = el.getBoundingClientRect()
      const px = (e.clientX - b.left) / b.width
      const py = (e.clientY - b.top) / b.height
      const q = get(el)
      q.ry((px - 0.5) * 10)
      q.rx((0.5 - py) * 8)
      el.style.setProperty('--gx', `${px * 100}%`)
      el.style.setProperty('--gy', `${py * 100}%`)
      el.classList.add('is-tilting')
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])

  // Hero letters lean toward the pointer (uses the CSS `translate` property so
  // it never fights the GSAP transforms of the intro).
  useEffect(() => {
    if (!fine() || prefersReducedMotion()) return
    let chars: HTMLElement[] = []
    let raf = 0
    const move = (e: PointerEvent) => {
      if (document.documentElement.classList.contains('intro-active')) return
      if (!chars.length) chars = Array.from(document.querySelectorAll<HTMLElement>('.hero__title .char'))
      if (!chars.length || window.scrollY > window.innerHeight) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        for (const c of chars) {
          const b = c.getBoundingClientRect()
          const dx = e.clientX - (b.left + b.width / 2)
          const dy = e.clientY - (b.top + b.height / 2)
          const d = Math.hypot(dx, dy)
          const f = Math.max(0, 1 - d / 260)
          c.style.setProperty('--lx', `${(dx / (d || 1)) * f * 10}px`)
          c.style.setProperty('--ly', `${(-f * 14).toFixed(2)}px`)
          c.style.setProperty('--lg', f.toFixed(3))
        }
      })
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => {
      window.removeEventListener('pointermove', move)
      cancelAnimationFrame(raf)
    }
  }, [])

  // Drag the gallery sideways (maps to vertical scroll of the pinned track).
  useEffect(() => {
    if (!fine() || prefersReducedMotion()) return
    let start: { x: number; scroll: number } | null = null
    let moved = false
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || !(e.target as HTMLElement).closest('.gal__track')) return
      start = { x: e.clientX, scroll: window.scrollY }
      moved = false
      document.documentElement.classList.add('is-dragging')
    }
    const move = (e: PointerEvent) => {
      if (!start) return
      const dx = e.clientX - start.x
      if (Math.abs(dx) > 4) moved = true
      const target = start.scroll - dx * 1.4
      const lenis = getLenis()
      if (lenis) lenis.scrollTo(target, { lerp: 0.12 })
      else window.scrollTo(0, target)
    }
    const up = () => {
      start = null
      document.documentElement.classList.remove('is-dragging')
    }
    const click = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault()
        e.stopPropagation()
        moved = false
      }
    }
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerup', up)
    window.addEventListener('click', click, true)
    return () => {
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('click', click, true)
    }
  }, [])

  return (
    <>
      <div className="thread" aria-hidden="true">
        <div ref={thread} className="thread__fill" />
      </div>
      <canvas ref={canvas} className="dust" aria-hidden="true" />
    </>
  )
}
