import { useEffect, useRef } from 'react'
import { gsap } from '../lib/motion'

// Gold dot + trailing ring. Grows over interactive elements and shows a label
// for elements with data-cursor-label. Only on fine pointers.
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    const d = dot.current!
    const r = ring.current!
    document.documentElement.classList.add('has-cursor')
    const dx = gsap.quickTo(d, 'x', { duration: 0.12, ease: 'power3.out' })
    const dy = gsap.quickTo(d, 'y', { duration: 0.12, ease: 'power3.out' })
    const rx = gsap.quickTo(r, 'x', { duration: 0.55, ease: 'power3.out' })
    const ry = gsap.quickTo(r, 'y', { duration: 0.55, ease: 'power3.out' })
    const move = (e: PointerEvent) => {
      dx(e.clientX)
      dy(e.clientY)
      rx(e.clientX)
      ry(e.clientY)
    }
    const over = (e: PointerEvent) => {
      const t = (e.target as HTMLElement).closest('a, button, input, select, textarea, label, [data-cursor], [data-cursor-label]') as HTMLElement | null
      const lab = t?.getAttribute('data-cursor-label')
      r.classList.toggle('is-hover', !!t && !lab)
      r.classList.toggle('is-label', !!lab)
      if (label.current) label.current.textContent = lab || ''
    }
    const leave = () => {
      r.classList.add('is-hidden')
      d.classList.add('is-hidden')
    }
    const enter = () => {
      r.classList.remove('is-hidden')
      d.classList.remove('is-hidden')
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerover', over, { passive: true })
    document.addEventListener('pointerleave', leave)
    document.addEventListener('pointerenter', enter)
    return () => {
      document.documentElement.classList.remove('has-cursor')
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerover', over)
      document.removeEventListener('pointerleave', leave)
      document.removeEventListener('pointerenter', enter)
    }
  }, [])

  return (
    <>
      <div ref={ring} className="cursor-ring" aria-hidden="true">
        <span ref={label} />
      </div>
      <div ref={dot} className="cursor-dot" aria-hidden="true" />
    </>
  )
}
