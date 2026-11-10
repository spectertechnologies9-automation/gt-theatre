import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '../lib/motion'
import { prefersReducedMotion } from '../lib/stage'
import { Media, type MediaItem } from './Media'
import { asset } from '../lib/asset'
import { scrollToTarget } from '../lib/motion'

// Pre-selects the occasion in the booking form, then glides there.
function pickOccasion(value: string) {
  window.dispatchEvent(new CustomEvent('specter:occasion', { detail: value }))
  scrollToTarget('#reserve')
}

const OCCASIONS: { title: string; line: string; book: string; media: MediaItem }[] = [
  {
    title: 'Private Movie Nights',
    line: 'Your film. No queue.',
    book: "Private movie night",
    media: { kind: 'image', src: asset('media/img/popcorn.jpg'), alt: 'A bowl of fresh popcorn in warm light', w: 1024, h: 683 },
  },
  {
    title: "Couples' Experiences",
    line: 'Just the two of you.',
    book: "Couples' experience",
    media: { kind: 'video', src: asset('media/video/couple.mp4'), poster: asset('media/video/couple-poster.jpg'), alt: 'A couple leaning into each other while watching a film' },
  },
  {
    title: 'Birthday Celebrations',
    line: 'The curtain rises for one.',
    book: "Birthday celebration",
    media: { kind: 'image', src: asset('media/img/curtain-stage.jpg'), alt: 'A red stage curtain lit from below', w: 1024, h: 683 },
  },
  {
    title: 'Anniversary Celebrations',
    line: 'Replay where it began.',
    book: "Anniversary celebration",
    media: { kind: 'image', src: asset('media/img/champagne.jpg'), alt: 'Two coupe glasses of champagne', w: 1920, h: 1280 },
  },
  {
    title: 'Family Screenings',
    line: 'Every generation, one row.',
    book: "Family screening",
    media: { kind: 'video', src: asset('media/video/family.mp4'), poster: asset('media/video/family-poster.jpg'), alt: 'A family sharing popcorn while watching a film' },
  },
  {
    title: 'Friends & Exclusive Gatherings',
    line: 'Your circle. Your room.',
    book: "Friends & exclusive gathering",
    media: { kind: 'video', src: asset('media/video/friends.mp4'), poster: asset('media/video/friends-poster.jpg'), alt: 'Friends laughing together during a film' },
  },
]

export function Occasions() {
  const root = useRef<HTMLElement>(null)
  const follower = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = root.current
    if (!el || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.occ__row').forEach((row) => {
        gsap.from(row.querySelectorAll('.occ__title-text, .occ__meta > *'), {
          yPercent: 100,
          autoAlpha: 0,
          duration: 1.1,
          stagger: 0.06,
          ease: 'expo.out',
          scrollTrigger: { trigger: row, start: 'top 88%' },
        })
        gsap.fromTo(row.querySelector('.occ__rule'), { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: row, start: 'top 90%' } })
      })
    }, el)
    return () => ctx.revert()
  }, [])

  // Floating preview follows the pointer over the list (desktop only).
  useEffect(() => {
    const f = follower.current
    const el = root.current
    if (!f || !el || !window.matchMedia('(pointer: fine)').matches) return
    const xTo = gsap.quickTo(f, 'x', { duration: 0.7, ease: 'power3.out' })
    const yTo = gsap.quickTo(f, 'y', { duration: 0.7, ease: 'power3.out' })
    const rTo = gsap.quickTo(f, 'rotation', { duration: 0.9, ease: 'power3.out' })
    let lastX = 0
    const move = (e: PointerEvent) => {
      xTo(e.clientX)
      yTo(e.clientY)
      rTo(gsap.utils.clamp(-8, 8, (e.clientX - lastX) * 0.4))
      lastX = e.clientX
    }
    el.addEventListener('pointermove', move)
    return () => el.removeEventListener('pointermove', move)
  }, [])

  return (
    <section ref={root} id="occasions" className="occ section" aria-labelledby="occ-title">
      <div className="occ__head">
        <div className="section__label">
          <span>III</span> Occasions
        </div>
        <h2 id="occ-title" className="display">
          Every story <em>has its night</em>
        </h2>
      </div>

      <ul className="occ__list" onMouseLeave={() => setActive(null)}>
        {OCCASIONS.map((o, i) => (
          <li
            key={o.title}
            className={`occ__row ${active === i ? 'is-active' : ''} ${active !== null && active !== i ? 'is-dim' : ''}`}
            onPointerEnter={(e) => e.pointerType === 'mouse' && setActive(i)}
            onClick={() => pickOccasion(o.book)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), pickOccasion(o.book))}
            tabIndex={0}
            role="button"
            aria-label={`${o.title}: reserve this occasion`}
            data-cursor-label="Reserve"
          >
            <span className="occ__rule" aria-hidden="true" />
            <div className="occ__num">0{i + 1}</div>
            <h3 className="occ__title">
              <span className="occ__title-inner">
                <span className="occ__title-text">{o.title}</span>
              </span>
            </h3>
            <div className="occ__meta">
              <p>{o.line}</p>
              <span className="occ__book">Reserve this →</span>
            </div>
            <div className="occ__inline">
              <Media item={o.media} />
            </div>
          </li>
        ))}
      </ul>

      <div ref={follower} className={`occ__follower ${active !== null ? 'is-on' : ''}`} aria-hidden="true">
        {OCCASIONS.map((o, i) => (
          <div key={o.title} className={`occ__follower-item ${active === i ? 'is-active' : ''}`}>
            <Media item={o.media} />
          </div>
        ))}
      </div>
    </section>
  )
}
