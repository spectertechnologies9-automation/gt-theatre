import { useEffect, useRef, useState } from 'react'

export type MediaItem =
  | { kind: 'image'; src: string; alt: string; w: number; h: number }
  | { kind: 'video'; src: string; poster: string; alt: string }

// Muted, looping video that only loads once near the viewport and only plays
// while visible. Falls back to its poster for reduced motion.
export function LazyVideo({ src, poster, alt, className = '', eager = false }: { src: string; poster: string; alt: string; className?: string; eager?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [load, setLoad] = useState(eager)
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    const v = ref.current
    if (!v || reduced) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setLoad(true)
          v.play().catch(() => {})
        } else v.pause()
      },
      { rootMargin: '200px 0px' },
    )
    io.observe(v)
    return () => io.disconnect()
  }, [reduced])

  return (
    <video
      ref={ref}
      className={className}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-label={alt}
      src={load && !reduced ? src : undefined}
    />
  )
}

export function Media({ item, className = '', eager = false }: { item: MediaItem; className?: string; eager?: boolean }) {
  if (item.kind === 'video') return <LazyVideo src={item.src} poster={item.poster} alt={item.alt} className={className} eager={eager} />
  const webp = item.src.replace(/\.jpg$/, '.webp')
  return (
    <picture>
      <source srcSet={webp} type="image/webp" />
      <img className={className} src={item.src} alt={item.alt} width={item.w} height={item.h} loading={eager ? 'eager' : 'lazy'} decoding="async" />
    </picture>
  )
}
