import { useLayoutEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '../lib/motion'
import { prefersReducedMotion } from '../lib/stage'
import { Media, type MediaItem } from './Media'
import { asset } from '../lib/asset'

const CHAPTERS: { no: string; title: string; line: string; body: string; media: MediaItem }[] = [
  {
    no: '01',
    title: 'The Arrival',
    line: 'The doors close behind you.',
    body: 'Step out of the evening and into a room that has been waiting for your party alone.',
    media: { kind: 'image', src: asset('media/img/aisle.jpg'), alt: 'A dim aisle of steps leading between rows of red seats', w: 1024, h: 683 },
  },
  {
    no: '02',
    title: 'The Seat',
    line: 'Reserved for your party.',
    body: 'Every seat in the room belongs to someone you invited, so there are no strangers and nobody to share an armrest with.',
    media: { kind: 'image', src: asset('media/img/seats-close.jpg'), alt: 'Close view of crimson cinema seats in soft light', w: 1024, h: 683 },
  },
  {
    no: '03',
    title: 'The Screen',
    line: 'One screen. One story.',
    body: 'The light leaves the projector and becomes the only thing in the world for the next two hours.',
    media: { kind: 'video', src: asset('media/video/projector.mp4'), poster: asset('media/video/projector-poster.jpg'), alt: 'A vintage film projector running in a warm, dark room' },
  },
  {
    no: '04',
    title: 'The Light',
    line: 'Dimmed slowly, the way it should be.',
    body: 'Warm light settles across the room and then fades away for the opening frame.',
    media: { kind: 'image', src: asset('media/img/stage-glow.jpg'), alt: 'A stage bathed in deep red light with a single seat in silhouette', w: 1024, h: 683 },
  },
  {
    no: '05',
    title: 'The Hour',
    line: 'Time moves at the pace of the film.',
    body: 'Nobody is waiting for the next showing, so you can stay and talk once the credits roll.',
    media: { kind: 'video', src: asset('media/video/film-reel.mp4'), poster: asset('media/video/film-reel-poster.jpg'), alt: 'Close-up of a vintage film reel turning' },
  },
]

export function Experience() {
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const mm = gsap.matchMedia()
    mm.add({ desktop: '(min-width: 900px)', reduce: '(prefers-reduced-motion: reduce)' }, (c) => {
      const { desktop, reduce } = c.conditions as { desktop: boolean; reduce: boolean }
      if (!desktop || reduce || prefersReducedMotion()) {
        el.classList.add('xp--static')
        if (reduce || prefersReducedMotion()) return () => el.classList.remove('xp--static')
        gsap.utils.toArray<HTMLElement>('.xp__chapter', el).forEach((ch) => {
          gsap.from(ch, { autoAlpha: 0, y: 40, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: ch, start: 'top 85%' } })
        })
        return () => el.classList.remove('xp--static')
      }
      const medias = gsap.utils.toArray<HTMLElement>('.xp__media', el)
      const texts = gsap.utils.toArray<HTMLElement>('.xp__text', el)
      const ticks = gsap.utils.toArray<HTMLElement>('.xp__tick', el)
      gsap.set(medias.slice(1), { clipPath: 'inset(100% 0% 0% 0%)' })
      gsap.set(texts.slice(1), { autoAlpha: 0, y: 60 })
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el.querySelector('.xp__pin'),
          start: 'top top',
          end: () => '+=' + window.innerHeight * (CHAPTERS.length - 0.4),
          scrub: 1.2,
          pin: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            const idx = Math.min(CHAPTERS.length - 1, Math.floor(self.progress * CHAPTERS.length * 0.999))
            ticks.forEach((t, i) => t.classList.toggle('is-active', i === idx))
          },
        },
      })
      medias.forEach((m, i) => {
        const img = m.querySelector('img, video')
        tl.fromTo(img, { scale: 1.18 }, { scale: 1, ease: 'none', duration: 1 }, i)
        if (i === 0) return
        tl.to(m, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut', duration: 0.6 }, i - 0.3)
          .to(texts[i - 1], { autoAlpha: 0, y: -60, duration: 0.35, ease: 'power2.in' }, i - 0.3)
          .to(texts[i], { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' }, i - 0.05)
      })
      ScrollTrigger.refresh()
    })
    return () => mm.revert()
  }, [])

  return (
    <section ref={root} id="experience" className="xp" aria-labelledby="xp-title">
      <div className="xp__intro section">
        <div className="section__label">
          <span>II</span> The Theatre Experience
        </div>
        <h2 id="xp-title" className="display">
          An evening in <em>five</em> acts
        </h2>
      </div>
      <div className="xp__pin">
        <div className="xp__medias">
          {CHAPTERS.map((c, i) => (
            <div className="xp__media" key={c.no} style={{ zIndex: i + 1 }}>
              <Media item={c.media} />
            </div>
          ))}
          <div className="xp__veil" aria-hidden="true" />
        </div>
        <div className="xp__texts">
          {CHAPTERS.map((c) => (
            <article className="xp__text xp__chapter" key={c.no}>
              <div className="xp__chapter-media">
                <Media item={c.media} />
              </div>
              <span className="xp__no">Act {c.no}</span>
              <h3>{c.title}</h3>
              <p className="xp__line">{c.line}</p>
              <p className="xp__body">{c.body}</p>
            </article>
          ))}
        </div>
        <ol className="xp__ticks" aria-hidden="true">
          {CHAPTERS.map((c, i) => (
            <li key={c.no} className={`xp__tick ${i === 0 ? 'is-active' : ''}`}>
              <span>{c.no}</span>
              {c.title}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
