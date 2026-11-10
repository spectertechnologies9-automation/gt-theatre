import { useEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '../lib/motion'
import { prefersReducedMotion } from '../lib/stage'

const WORDS = ['Private screenings', 'Date nights', 'Birthdays', 'Anniversaries', 'Family', 'Friends']

// An endless ribbon of occasions. Scrolling speeds it up, flips its direction
// and leans it; hovering slows it to a drift.
export function Marquee() {
  const root = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = root.current
    const tr = track.current
    if (!el || !tr || prefersReducedMotion()) return
    let x = 0
    let dir = -1
    let boost = 0
    let hover = 1
    let skew = 0
    const setX = gsap.quickSetter(tr, 'x', 'px')
    const setSkew = gsap.quickSetter(tr, 'skewX', 'deg')
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        const v = self.getVelocity()
        if (Math.abs(v) > 40) dir = v > 0 ? -1 : 1
        boost = Math.min(14, Math.abs(v) / 180)
      },
    })
    const tick = (_: number, dt: number) => {
      if (!st.isActive) return
      const k = Math.min(dt, 40) / 16.67
      const half = tr.scrollWidth / 2
      boost *= Math.pow(0.92, k)
      x += dir * (0.9 + boost) * hover * k
      if (x <= -half) x += half
      if (x > 0) x -= half
      skew += (-dir * boost * 0.9 - skew) * 0.12 * k
      setX(x)
      setSkew(skew)
    }
    gsap.ticker.add(tick)
    const enter = () => gsap.to({ v: hover }, { v: 0.25, duration: 0.8, onUpdate() { hover = this.targets()[0].v } })
    const leave = () => gsap.to({ v: hover }, { v: 1, duration: 0.8, onUpdate() { hover = this.targets()[0].v } })
    el.addEventListener('pointerenter', enter)
    el.addEventListener('pointerleave', leave)
    return () => {
      gsap.ticker.remove(tick)
      st.kill()
      el.removeEventListener('pointerenter', enter)
      el.removeEventListener('pointerleave', leave)
    }
  }, [])


  return (
    <div ref={root} className="marquee" aria-label={WORDS.join(', ')} role="img">
      <div ref={track} className="marquee__track" aria-hidden="true">
        {[...WORDS, ...WORDS].map((w, i) => (
          <span key={i} className="marquee__item">
            {w}
            <i>✦</i>
          </span>
        ))}
      </div>
    </div>
  )
}
