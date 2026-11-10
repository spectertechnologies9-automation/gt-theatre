import { useEffect, useRef } from 'react'
import { gsap } from '../lib/motion'
import { prefersReducedMotion } from '../lib/stage'
import { asset } from '../lib/asset'

// A porcelain panel with a hidden photograph: the pointer is a spotlight that
// reveals it. On touch screens the light wanders on its own.
export function Spotlight() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    if (prefersReducedMotion()) {
      el.style.setProperty('--sx', '50%')
      el.style.setProperty('--sy', '50%')
      el.style.setProperty('--sr', '60vmax')
      return
    }
    const pos = { x: 0.5, y: 0.55, r: 0 }
    const apply = () => {
      el.style.setProperty('--sx', `${pos.x * 100}%`)
      el.style.setProperty('--sy', `${pos.y * 100}%`)
      el.style.setProperty('--sr', `${pos.r}vmax`)
    }
    const xTo = gsap.quickTo(pos, 'x', { duration: 0.9, ease: 'power3.out', onUpdate: apply })
    const yTo = gsap.quickTo(pos, 'y', { duration: 0.9, ease: 'power3.out', onUpdate: apply })
    const rTo = gsap.quickTo(pos, 'r', { duration: 1.2, ease: 'expo.out', onUpdate: apply })
    let wander: gsap.core.Tween | null = null
    const fine = window.matchMedia('(pointer: fine)').matches
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        rTo(fine ? 16 : 22)
        if (!fine && !wander) {
          wander = gsap.to(pos, {
            keyframes: { x: [0.3, 0.7, 0.55, 0.25, 0.5], y: [0.4, 0.6, 0.35, 0.65, 0.5] },
            duration: 12,
            repeat: -1,
            ease: 'sine.inOut',
            onUpdate: apply,
          })
        }
      } else {
        rTo(0)
      }
    })
    io.observe(el)
    const move = (e: PointerEvent) => {
      const b = el.getBoundingClientRect()
      xTo((e.clientX - b.left) / b.width)
      yTo((e.clientY - b.top) / b.height)
    }
    const down = () => rTo(34)
    const up = () => rTo(16)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    return () => {
      io.disconnect()
      wander?.kill()
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
    }
  }, [])

  return (
    <section ref={root} className="spot" aria-label="Interlude" data-cursor-label="Look">
      <div className="spot__reveal" aria-hidden="true">
        <picture>
          <source srcSet={asset('media/img/seats-close.webp')} type="image/webp" />
          <img src={asset('media/img/seats-close.jpg')} alt="" loading="lazy" width="1024" height="683" />
        </picture>
        <p className="spot__line spot__line--lit">
          Lights down.
          <em>Look closer.</em>
        </p>
      </div>
      <p className="spot__line">
        Lights down.
        <em>Look closer.</em>
      </p>
      <span className="spot__hint" aria-hidden="true">Hold to widen the light</span>
    </section>
  )
}
