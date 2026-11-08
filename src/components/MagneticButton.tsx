import { useEffect, useRef, type ReactNode } from 'react'
import { gsap } from '../lib/motion'

type Props = {
  children: ReactNode
  onClick?: () => void
  href?: string
  variant?: 'gold' | 'ghost'
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
}

// Button that leans toward the pointer; label travels a little further than the
// shell for a sense of depth. Disabled for touch and reduced motion.
export function MagneticButton({ children, onClick, href, variant = 'gold', type = 'button', disabled, className = '' }: Props) {
  const ref = useRef<HTMLAnchorElement & HTMLButtonElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(pointer: coarse), (prefers-reduced-motion: reduce)').matches) return
    const label = el.querySelector('.mbtn__label') as HTMLElement
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' })
    const lx = gsap.quickTo(label, 'x', { duration: 0.6, ease: 'power3.out' })
    const ly = gsap.quickTo(label, 'y', { duration: 0.6, ease: 'power3.out' })
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      xTo(dx * 0.28)
      yTo(dy * 0.38)
      lx(dx * 0.12)
      ly(dy * 0.16)
    }
    const leave = () => {
      xTo(0)
      yTo(0)
      lx(0)
      ly(0)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [])

  const cls = `mbtn mbtn--${variant} ${className}`
  const inner = (
    <>
      <span className="mbtn__shine" aria-hidden="true" />
      <span className="mbtn__label">{children}</span>
    </>
  )
  if (href)
    return (
      <a ref={ref} className={cls} href={href} data-cursor="hover">
        {inner}
      </a>
    )
  return (
    <button ref={ref} className={cls} onClick={onClick} type={type} disabled={disabled} data-cursor="hover">
      {inner}
    </button>
  )
}
