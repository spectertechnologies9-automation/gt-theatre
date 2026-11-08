import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import Lenis from 'lenis'
import { prefersReducedMotion } from './stage'

gsap.registerPlugin(ScrollTrigger, SplitText)
// Mobile address-bar show/hide should not trigger a full refresh (which jumps pins).
ScrollTrigger.config({ ignoreMobileResize: true })
gsap.config({ force3D: true })

// One Lenis instance drives scrolling; GSAP's ticker drives Lenis so that
// ScrollTrigger and smooth scroll share a single animation frame.
let lenis: Lenis | null = null

export function initSmoothScroll() {
  if (lenis || prefersReducedMotion()) return lenis
  // Lerp mode gives continuous, inertial wheel scrolling (no restart per wheel tick).
  lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 0.95, touchMultiplier: 1.2, smoothWheel: true, autoRaf: false })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis?.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
  return lenis
}

export function getLenis() {
  return lenis
}

export function scrollToTarget(target: string | HTMLElement | number) {
  const el = typeof target === 'string' ? (document.querySelector(target) as HTMLElement | null) : target
  if (el === null) return
  if (lenis) lenis.scrollTo(el, { duration: 1.8, easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), offset: 0 })
  else if (typeof el === 'number') window.scrollTo({ top: el, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  else el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

export function lockScroll(lock: boolean) {
  if (lenis) {
    if (lock) lenis.stop()
    else lenis.start()
  }
  document.documentElement.classList.toggle('is-locked', lock)
}

export { gsap, ScrollTrigger, SplitText }
