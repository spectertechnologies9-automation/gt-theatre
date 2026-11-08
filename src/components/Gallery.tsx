import { useLayoutEffect, useRef } from 'react'
import { gsap } from '../lib/motion'
import { prefersReducedMotion } from '../lib/stage'
import { Media, type MediaItem } from './Media'
import { asset } from '../lib/asset'

const FRAMES: { cap: string; note: string; size: 'l' | 'm' | 's' | 't'; media: MediaItem }[] = [
  { cap: 'Velvet, at rest', note: 'Before the curtain', size: 'l', media: { kind: 'image', src: asset('media/img/velvet-wide.jpg'), alt: 'Red velvet curtain folds in darkness', w: 1024, h: 683 } },
  { cap: 'The quiet rows', note: 'Waiting for you', size: 't', media: { kind: 'image', src: asset('media/img/aisle.jpg'), alt: 'Steps descending between dim rows of red seats', w: 1024, h: 683 } },
  { cap: 'A beam of light', note: 'The first frame', size: 'm', media: { kind: 'image', src: asset('media/img/projector-beam.jpg'), alt: 'A projector casting a beam through haze', w: 1024, h: 683 } },
  { cap: 'The mechanism', note: 'Film, turning', size: 's', media: { kind: 'video', src: asset('media/video/projector-detail.mp4'), poster: asset('media/video/projector-detail-poster.jpg'), alt: 'Close-up of a film projector mechanism in motion' } },
  { cap: 'Crimson hour', note: 'House lights low', size: 'l', media: { kind: 'image', src: asset('media/img/stage-glow.jpg'), alt: 'A stage washed in red light', w: 1024, h: 683 } },
  { cap: 'A toast', note: 'Before the opening scene', size: 't', media: { kind: 'image', src: asset('media/img/champagne.jpg'), alt: 'Two coupes of champagne', w: 1920, h: 1280 } },
  { cap: 'Curtain call', note: 'Until next time', size: 'm', media: { kind: 'image', src: asset('media/img/curtain-stage.jpg'), alt: 'A glowing red stage curtain', w: 1024, h: 683 } },
]

export function Gallery() {
  const root = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = root.current
    const tr = track.current
    if (!el || !tr) return
    const mm = gsap.matchMedia()
    mm.add('(min-width: 900px) and (prefers-reduced-motion: reduce)', () => {
      el.classList.add('gal--static')
      return () => el.classList.remove('gal--static')
    })
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      if (prefersReducedMotion()) return
      const distance = () => tr.scrollWidth - window.innerWidth
      const scrollTween = gsap.to(tr, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: el.querySelector('.gal__pin'),
          start: 'top top',
          end: () => '+=' + distance(),
          pin: true,
          scrub: 1.1,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            el.style.setProperty('--gal-progress', String(self.progress))
          },
        },
      })
      gsap.utils.toArray<HTMLElement>('.gal__frame', tr).forEach((frame) => {
        const inner = frame.querySelector('img, video')
        gsap.fromTo(
          inner,
          { xPercent: -10, scale: 1.2 },
          {
            xPercent: 10,
            scale: 1.2,
            ease: 'none',
            scrollTrigger: { trigger: frame, containerAnimation: scrollTween, start: 'left right', end: 'right left', scrub: true },
          },
        )
        gsap.fromTo(
          frame.querySelector('.gal__mask'),
          { clipPath: 'inset(0% 0% 0% 100%)' },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            ease: 'power2.out',
            scrollTrigger: { trigger: frame, containerAnimation: scrollTween, start: 'left 95%', end: 'left 55%', scrub: true },
          },
        )
        gsap.from(frame.querySelectorAll('figcaption > *'), {
          autoAlpha: 0,
          y: 20,
          stagger: 0.08,
          scrollTrigger: { trigger: frame, containerAnimation: scrollTween, start: 'left 70%' },
        })
      })
    })
    return () => mm.revert()
  }, [])

  return (
    <section ref={root} id="gallery" className="gal" aria-labelledby="gal-title">
      <div className="gal__pin">
        <div className="gal__track" ref={track}>
          <div className="gal__intro">
            <div className="section__label">
              <span>IV</span> The Gallery
            </div>
            <h2 id="gal-title" className="display">
              Frames <em>from the dark</em>
            </h2>
            <p>A few frames that set the mood before you arrive.</p>
            <span className="gal__hint" aria-hidden="true">
              Scroll <i />
            </span>
          </div>
          {FRAMES.map((f, i) => (
            <figure key={f.cap} className={`gal__frame gal__frame--${f.size}`}>
              <div className="gal__mask">
                <Media item={f.media} />
              </div>
              <figcaption>
                <span className="gal__fig">Fig. {String(i + 1).padStart(2, '0')}</span>
                <span className="gal__cap">{f.cap}</span>
                <span className="gal__note">{f.note}</span>
              </figcaption>
            </figure>
          ))}
          <div className="gal__end" aria-hidden="true">
            <span>Fin.</span>
          </div>
        </div>
        <div className="gal__progress" aria-hidden="true">
          <i />
        </div>
      </div>
    </section>
  )
}
