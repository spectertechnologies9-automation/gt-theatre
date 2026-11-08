import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger, SplitText, lockScroll, scrollToTarget } from '../lib/motion'
import { stage, detectQuality, hasWebGL, prefersReducedMotion, sceneReady, markSceneReady, INTRO_KEY, type Quality } from '../lib/stage'
import { MagneticButton } from './MagneticButton'

const TheatreScene = lazy(() => import('../three/TheatreScene'))

export function Hero() {
  const root = useRef<HTMLElement>(null)
  const [quality] = useState<Quality>(() => detectQuality())
  const [webgl] = useState(() => hasWebGL())
  const [active, setActive] = useState(true)
  const [introDone, setIntroDone] = useState(false)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const skipRef = useRef<() => void>(() => {})

  // Pause the WebGL loop when the hero is off-screen.
  useEffect(() => {
    const el = root.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: '10% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Pointer parallax feeds the camera rig.
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches || prefersReducedMotion()) return
    const onMove = (e: PointerEvent) => {
      stage.pointerX = (e.clientX / window.innerWidth) * 2 - 1
      stage.pointerY = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const reduced = prefersReducedMotion()
    const seen = sessionStorage.getItem(INTRO_KEY) === '1'

    const ctx = gsap.context(() => {
      const title = new SplitText('.hero__title-line', { type: 'chars', charsClass: 'char' })
      const markLetters = new SplitText('.intro-mark__word', { type: 'chars', charsClass: 'mchar' })
      const clEls = gsap.utils.toArray<HTMLElement>('.css-curtain--l')
      const crEls = gsap.utils.toArray<HTMLElement>('.css-curtain--r')
      // Plain objects stand in when the CSS fallback isn't rendered (avoids GSAP warnings).
      const cl: object = clEls.length ? clEls : { xPercent: 0 }
      const cr: object = crEls.length ? crEls : { xPercent: 0 }
      if (!webgl) markSceneReady()

      const finish = () => {
        sessionStorage.setItem(INTRO_KEY, '1')
        lockScroll(false)
        document.documentElement.classList.remove('intro-active')
        setIntroDone(true)
        el.classList.add('is-ready')
      }

      if (reduced) {
        Object.assign(stage, { reveal: 1, curtain: 1, screen: 1, dolly: 1 })
        gsap.set('.intro-mark', { autoAlpha: 0 })
        gsap.set(['.hero__eyebrow', '.hero__tagline', '.hero__cta', '.hero__scroll', title.chars], { autoAlpha: 1, y: 0 })
        gsap.set(cl, { xPercent: -88 })
        gsap.set(cr, { xPercent: 88 })
        finish()
        return
      }

      lockScroll(true)
      document.documentElement.classList.add('intro-active')
      gsap.set(title.chars, { yPercent: 110, autoAlpha: 0, rotateX: -50 })
      gsap.set(['.hero__eyebrow', '.hero__tagline', '.hero__cta', '.hero__scroll'], { autoAlpha: 0, y: 24 })
      gsap.set(markLetters.chars, { autoAlpha: 0, y: 18, filter: 'blur(8px)' })

      const tl = gsap.timeline({ onComplete: finish })
      let ready = false
      const go = () => {
        if (ready) return
        ready = true
        if (tl.paused() && tl.progress() < 1) tl.play()
      }
      sceneReady.then(go)
      skipRef.current = () => {
        ready = true
        tl.progress(1)
      }
      const fallback = window.setTimeout(go, 7000)
      tl.eventCallback('onComplete', () => {
        window.clearTimeout(fallback)
        finish()
      })
      tlRef.current = tl
      if (import.meta.env.DEV) Object.assign(window, { __introTL: tl, __skipIntro: () => skipRef.current() })

      if (seen) {
        // Returning visitor in this session: a short, respectful version.
        gsap.set('.intro-mark', { autoAlpha: 0 })
        tl.to(stage, { reveal: 1, duration: 0.8, ease: 'power2.out' })
          .to(stage, { curtain: 1, duration: 1.4, ease: 'power3.inOut' }, 0)
          .to(stage, { screen: 1, dolly: 1, duration: 1.4, ease: 'power2.out' }, 0.3)
          .to(cl, { xPercent: -88, duration: 1.4, ease: 'power3.inOut' }, 0)
          .to(cr, { xPercent: 88, duration: 1.4, ease: 'power3.inOut' }, 0)
          .to(title.chars, { yPercent: 0, autoAlpha: 1, rotateX: 0, stagger: 0.025, duration: 0.9, ease: 'power3.out' }, 0.6)
          .to(['.hero__eyebrow', '.hero__tagline', '.hero__cta', '.hero__scroll'], { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.7, ease: 'power2.out' }, 0.9)
        return
      }

      // 1 — darkness, then the wordmark warms into gold.
      tl.addLabel('mark', 0.5)
        .to(markLetters.chars, { autoAlpha: 1, y: 0, filter: 'blur(0px)', stagger: 0.07, duration: 1.1, ease: 'power3.out' }, 'mark')
        .fromTo('.intro-mark__rule', { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: 'power3.inOut' }, 'mark+=0.5')
        .fromTo('.intro-mark__sub', { autoAlpha: 0, letterSpacing: '0.2em' }, { autoAlpha: 1, letterSpacing: '0.6em', duration: 1.4, ease: 'power2.out' }, 'mark+=0.7')
        .to('.intro-mark', { '--sheen': '120%', duration: 1.6, ease: 'power2.inOut' }, 'mark+=0.6')
        // Hold here until the 3D scene has drawn (or 7s have passed).
        .call(() => {
          if (!ready) tl.pause()
        }, [], 'mark+=1.25')
        // 2 — the room is lit; curtains stand closed.
        .to(stage, { reveal: 1, duration: 1.8, ease: 'power2.inOut' }, 'mark+=1.3')
        .to('.intro-mark', { autoAlpha: 0, y: -30, filter: 'blur(6px)', duration: 0.9, ease: 'power2.in' }, 'mark+=2.6')
        // 3 — the curtains part from the centre.
        .addLabel('open', 'mark+=3.2')
        .to(stage, { curtain: 1, duration: 3.4, ease: 'power2.inOut' }, 'open')
        .to(cl, { xPercent: -88, duration: 3.4, ease: 'power2.inOut' }, 'open')
        .to(cr, { xPercent: 88, duration: 3.4, ease: 'power2.inOut' }, 'open')
        .to(stage, { screen: 1, duration: 2.6, ease: 'power1.inOut' }, 'open+=0.9')
        .to(stage, { dolly: 1, duration: 4.2, ease: 'power2.inOut' }, 'open+=0.3')
        // 4 — the title arrives.
        .to(title.chars, { yPercent: 0, autoAlpha: 1, rotateX: 0, stagger: 0.04, duration: 1.2, ease: 'power3.out' }, 'open+=2.2')
        .to(['.hero__eyebrow', '.hero__tagline', '.hero__cta', '.hero__scroll'], { autoAlpha: 1, y: 0, stagger: 0.12, duration: 0.9, ease: 'power2.out' }, 'open+=3.0')
    }, el)

    return () => {
      ctx.revert()
      document.documentElement.classList.remove('intro-active')
      tlRef.current = null
    }
  }, [])

  // Scroll-linked push toward the screen after the intro.
  useLayoutEffect(() => {
    if (!introDone || prefersReducedMotion()) return
    const el = root.current
    if (!el) return
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          stage.scroll = self.progress
        },
      })
      gsap.to('.hero__content', {
        yPercent: -30,
        autoAlpha: 0,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top top', end: '16% top', scrub: 1 },
      })
      gsap
        .timeline({ scrollTrigger: { trigger: el, start: '14% top', end: 'bottom bottom', scrub: 1 } })
        .fromTo('.hero__projection', { autoAlpha: 0, scale: 0.92 }, { autoAlpha: 1, scale: 1, ease: 'power1.out', duration: 0.4 })
        .to('.hero__projection', { scale: 1.04, duration: 0.35, ease: 'none' })
        .to('.hero__projection', { autoAlpha: 0, duration: 0.25 })
    }, el)
    return () => ctx.revert()
  }, [introDone])

  const skip = () => skipRef.current()

  return (
    <section ref={root} id="top" className="hero" aria-label="Specter Theatres — opening">
      <div className="hero__sticky">
      <div className="hero__stage">
        {webgl ? (
          <Suspense fallback={null}>
            <TheatreScene quality={quality} active={active} />
          </Suspense>
        ) : (
          <div className="css-stage" aria-hidden="true">
            <div className="css-stage__screen" />
            <div className="css-curtain css-curtain--l" />
            <div className="css-curtain css-curtain--r" />
          </div>
        )}
        <div className="hero__shade" aria-hidden="true" />
      </div>

      <div className="intro-mark" aria-hidden="true">
        <span className="intro-mark__word">SPECTER</span>
        <span className="intro-mark__rule" />
        <span className="intro-mark__sub">THEATRES</span>
      </div>

      <p className="hero__projection" aria-hidden="true">
        The house lights dim.
        <em>The room is yours.</em>
      </p>

      <div className="hero__content">
        <p className="hero__eyebrow">A private cinema experience</p>
        <h1 className="hero__title">
          <span className="hero__title-line">SPECTER</span>
          <span className="hero__title-line hero__title-line--b">THEATRES</span>
        </h1>
        <p className="hero__tagline">Your Private World of Cinema.</p>
        <div className="hero__cta">
          <MagneticButton onClick={() => scrollToTarget('#story')} variant="gold">
            Enter the Experience
          </MagneticButton>
        </div>
      </div>

      <button className="hero__scroll" onClick={() => scrollToTarget('#story')} aria-label="Scroll to the story">
        <span>Scroll</span>
        <i />
      </button>

      {!introDone && (
        <button className="skip-intro" onClick={skip}>
          Skip intro
        </button>
      )}
      </div>
    </section>
  )
}
