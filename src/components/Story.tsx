import { useLayoutEffect, useRef } from 'react'
import { gsap, SplitText } from '../lib/motion'
import { prefersReducedMotion } from '../lib/stage'
import { asset } from '../lib/asset'

export function Story() {
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = root.current
    if (!el || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      const split = new SplitText('.story__statement', { type: 'words', wordsClass: 'w' })
      gsap.fromTo(
        split.words,
        { opacity: 0.12 },
        {
          opacity: 1,
          stagger: 0.08,
          ease: 'none',
          scrollTrigger: { trigger: '.story__statement', start: 'top 80%', end: 'bottom 45%', scrub: 1 },
        },
      )
      gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((node) => {
        const amt = Number(node.dataset.parallax) || 10
        gsap.fromTo(
          node,
          { yPercent: -amt },
          { yPercent: amt, ease: 'none', scrollTrigger: { trigger: node.parentElement, start: 'top bottom', end: 'bottom top', scrub: 1 } },
        )
      })
      gsap.utils.toArray<HTMLElement>('.story__frame').forEach((f) => {
        gsap.fromTo(
          f,
          { clipPath: 'inset(18% 12% 18% 12%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.out', scrollTrigger: { trigger: f, start: 'top 90%', end: 'top 35%', scrub: 1 } },
        )
      })
      gsap.from('.story__body > *', {
        autoAlpha: 0,
        y: 30,
        stagger: 0.12,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.story__body', start: 'top 80%' },
      })
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={root} id="story" className="story section" aria-labelledby="story-title">
      <div className="section__label">
        <span>I</span> The Concept
      </div>
      <h2 id="story-title" className="story__statement">
        Not every movie deserves an audience. <em>Some deserve an experience of their own.</em>
      </h2>

      <div className="story__grid">
        <figure className="story__frame story__frame--tall">
          <picture>
            <source srcSet={asset('media/img/velvet-tall.webp')} type="image/webp" />
            <img data-parallax="8" src={asset('media/img/velvet-tall.jpg')} alt="Folds of deep red velvet curtain in low light" loading="lazy" width="683" height="1024" />
          </picture>
          <figcaption>Velvet, waiting</figcaption>
        </figure>

        <div className="story__body">
          <p className="story__lead">
            Specter Theatres reimagines the cinema as a private room: a space held for you and the people you choose.
          </p>
          <p>
            There's no stranger in the next seat and no rush for the exit when the credits roll. There's the hush before
            the first frame, the screen, and the story, shared only with your guests.
          </p>
          <p>
            Bring someone you love, or bring everyone. Either way, the evening is shaped around you and the room belongs to your party.
          </p>
          <div className="story__sig">
            <span className="gold-rule" />
            <span>An audience of your choosing</span>
          </div>
        </div>

        <figure className="story__frame story__frame--small">
          <picture>
            <source srcSet={asset('media/img/champagne.webp')} type="image/webp" />
            <img data-parallax="12" src={asset('media/img/champagne.jpg')} alt="Two coupe glasses of champagne glowing against a dark background" loading="lazy" width="1920" height="1280" />
          </picture>
          <figcaption>Before the first frame</figcaption>
        </figure>
      </div>
    </section>
  )
}
