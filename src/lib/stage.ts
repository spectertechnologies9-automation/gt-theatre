// Mutable, render-loop friendly state shared between the GSAP timelines
// (DOM side) and the React Three Fiber scene. Mutating it never re-renders React.
export const stage = {
  reveal: 0, // 0 = black, 1 = scene fully lit
  curtain: 0, // 0 = closed, 1 = fully open
  screen: 0, // screen glow intensity
  dolly: 0, // intro camera push
  scroll: 0, // hero scroll progress (0..1)
  pointerX: 0,
  pointerY: 0,
}

export type Quality = 'high' | 'low'

export function detectQuality(): Quality {
  if (typeof window === 'undefined') return 'low'
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const small = window.innerWidth < 900
  const cores = navigator.hardwareConcurrency || 4
  // @ts-expect-error deviceMemory is not in all TS DOM libs
  const mem: number = navigator.deviceMemory || 8
  if (coarse || small || cores <= 4 || mem <= 4) return 'low'
  return 'high'
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const INTRO_KEY = 'specter-intro-seen'

// Resolves once the WebGL scene has rendered its first frame, so the curtain
// moment never plays to an empty canvas on slow connections.
let resolveReady: () => void = () => {}
export const sceneReady = new Promise<void>((r) => (resolveReady = r))
export const markSceneReady = () => resolveReady()
