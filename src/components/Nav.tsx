import { useEffect, useRef, useState } from 'react'
import { gsap, scrollToTarget, lockScroll } from '../lib/motion'
import { asset } from '../lib/asset'

export const NAV_LINKS = [
  { href: '#story', label: 'The Story', img: asset('media/img/velvet-tall.webp') },
  { href: '#experience', label: 'The Experience', img: asset('media/img/aisle.webp') },
  { href: '#occasions', label: 'Occasions', img: asset('media/img/champagne.webp') },
  { href: '#gallery', label: 'Gallery', img: asset('media/img/projector-beam.webp') },
  { href: '#reserve', label: 'Reserve', img: asset('media/img/seats-close.webp') },
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let lastY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 40)
      setHidden(y > lastY && y > window.innerHeight * 1.2)
      lastY = y
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const m = menuRef.current
    if (!m) return
    const ctx = gsap.context(() => {
      tl.current = gsap
        .timeline({ paused: true })
        .set(m, { visibility: 'visible' })
        .fromTo(m, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.9, ease: 'expo.inOut' })
        .fromTo('.menu__link-inner', { yPercent: 110 }, { yPercent: 0, stagger: 0.06, duration: 0.9, ease: 'expo.out' }, 0.45)
        .fromTo('.menu__meta > *', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, stagger: 0.05, duration: 0.6 }, 0.7)
        .fromTo('.menu__preview', { autoAlpha: 0, scale: 1.08 }, { autoAlpha: 1, scale: 1, duration: 1.1, ease: 'power3.out' }, 0.5)
    }, m)
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!tl.current) return
    if (open) {
      lockScroll(true)
      tl.current.timeScale(1).play()
      const first = menuRef.current?.querySelector('a') as HTMLElement | null
      setTimeout(() => first?.focus(), 500)
    } else {
      tl.current.timeScale(1.6).reverse()
      lockScroll(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const go = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    const wasOpen = open
    setOpen(false)
    setTimeout(() => scrollToTarget(href), wasOpen ? 450 : 0)
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className={`nav ${scrolled ? 'nav--scrolled' : ''} ${hidden && !open ? 'nav--hidden' : ''} ${open ? 'nav--open' : ''}`}>
        <a href="#top" className="nav__brand" onClick={go('#top')} aria-label="Specter Theatres — back to top" data-cursor="hover">
          <svg className="nav__mono" viewBox="0 0 40 40" aria-hidden="true">
            <defs>
              <linearGradient id="g-mono" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f3dfa9" />
                <stop offset="0.5" stopColor="#c9a45c" />
                <stop offset="1" stopColor="#8e7042" />
              </linearGradient>
            </defs>
            <rect x="1" y="1" width="38" height="38" rx="0" fill="none" stroke="url(#g-mono)" strokeWidth="1" transform="rotate(45 20 20) scale(.72) translate(7.8 7.8)" />
            <text x="20" y="26.5" textAnchor="middle" fontFamily="Cormorant Garamond Variable, serif" fontSize="19" fill="url(#g-mono)">S</text>
          </svg>
          <span className="nav__word">
            SPECTER <em>Theatres</em>
          </span>
        </a>
        <nav className="nav__links" aria-label="Primary">
          {NAV_LINKS.slice(0, 4).map((l) => (
            <a key={l.href} href={l.href} onClick={go(l.href)} data-cursor="hover">
              <span>{l.label}</span>
            </a>
          ))}
        </nav>
        <div className="nav__actions">
          <a href="#reserve" className="nav__reserve" onClick={go('#reserve')} data-cursor="hover">
            Reserve
          </a>
          <button
            ref={toggleRef}
            className="nav__toggle"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((o) => !o)}
            data-cursor="hover"
          >
            <span className="nav__toggle-label">{open ? 'Close' : 'Menu'}</span>
            <span className="nav__toggle-icon" aria-hidden="true">
              <i />
              <i />
            </span>
          </button>
        </div>
      </header>

      <div id="site-menu" className="menu" ref={menuRef} aria-hidden={!open} inert={!open}>
        <div className="menu__inner">
          <nav className="menu__links" aria-label="Menu">
            {NAV_LINKS.map((l, i) => (
              <a
                key={l.href}
                href={l.href}
                className="menu__link"
                onClick={go(l.href)}
                onMouseEnter={() => setPreview(i)}
                onFocus={() => setPreview(i)}
                data-cursor="hover"
              >
                <span className="menu__link-inner">
                  <small>0{i + 1}</small>
                  {l.label}
                </span>
              </a>
            ))}
          </nav>
          <div className="menu__side">
            <div className="menu__preview">
              {NAV_LINKS.map((l, i) => (
                <img key={l.href} src={l.img} alt="" className={i === preview ? 'is-active' : ''} decoding="async" />
              ))}
            </div>
            <div className="menu__meta">
              <p>Specter Theatres</p>
              <p>A private world of cinema.</p>
              <a href="#reserve" onClick={go('#reserve')} className="menu__enquire" data-cursor="hover">
                Make a booking enquiry →
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
