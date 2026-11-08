import { useLayoutEffect, useRef } from 'react'
import { gsap, SplitText, scrollToTarget } from '../lib/motion'
import { prefersReducedMotion } from '../lib/stage'
import { MagneticButton } from './MagneticButton'
import { NAV_LINKS } from './Nav'
import { asset } from '../lib/asset'

export function Finale() {
  const root = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const el = root.current
    if (!el || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      const split = new SplitText('.finale__title', { type: 'chars,words', charsClass: 'fchar' })
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 65%' } })
      tl.from(split.chars, { yPercent: 120, autoAlpha: 0, rotateX: -70, stagger: 0.035, duration: 1.3, ease: 'expo.out' })
        .from('.finale__sub, .finale__cta', { autoAlpha: 0, y: 30, stagger: 0.12, duration: 1, ease: 'power3.out' }, '-=0.8')
      gsap.fromTo('.finale__bg img', { scale: 1.25, yPercent: -8 }, { scale: 1.05, yPercent: 8, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1 } })
      gsap.fromTo('.finale__rays', { rotate: -8, opacity: 0.2 }, { rotate: 8, opacity: 0.7, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1 } })
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={root} className="finale" aria-labelledby="finale-title">
      <div className="finale__bg" aria-hidden="true">
        <picture>
          <source srcSet={asset('media/img/curtain-stage.webp')} type="image/webp" />
          <img src={asset('media/img/curtain-stage.jpg')} alt="" loading="lazy" width="1024" height="683" />
        </picture>
        <div className="finale__rays" />
      </div>
      <div className="finale__inner">
        <h2 id="finale-title" className="finale__title">
          THE NIGHT IS YOURS.
        </h2>
        <p className="finale__sub">Make every frame unforgettable.</p>
        <div className="finale__cta">
          <MagneticButton onClick={() => scrollToTarget('#reserve')} variant="gold">
            Reserve your private screening
          </MagneticButton>
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  const year = new Date().getFullYear()
  const go = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    scrollToTarget(href)
  }
  return (
    <footer className="footer">
      <div className="footer__top">
        <a href="#top" onClick={go('#top')} className="footer__brand" aria-label="Back to top" data-cursor="hover">
          SPECTER <em>Theatres</em>
        </a>
        <nav className="footer__nav" aria-label="Footer">
          {NAV_LINKS.slice(0, 4).map((l) => (
            <a key={l.href} href={l.href} onClick={go(l.href)} data-cursor="hover">
              {l.label}
            </a>
          ))}
          <a href="#reserve" onClick={go('#reserve')} className="footer__enquire" data-cursor="hover">
            Booking enquiry
          </a>
        </nav>
      </div>
      <div className="footer__giant" aria-hidden="true">
        SPECTER
      </div>
      <div className="footer__bottom">
        <span>© {year} Specter Theatres. All rights reserved.</span>
        <span>Your Private World of Cinema.</span>
        <a href={asset('credits.html')} data-cursor="hover">
          Media credits
        </a>
      </div>
    </footer>
  )
}
