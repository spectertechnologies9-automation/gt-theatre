import { useEffect } from 'react'
import { initSmoothScroll, ScrollTrigger } from './lib/motion'
import { Nav } from './components/Nav'
import { Cursor } from './components/Cursor'
import { Hero } from './components/Hero'
import { Story } from './components/Story'
import { Experience } from './components/Experience'
import { Occasions } from './components/Occasions'
import { Gallery } from './components/Gallery'
import { Booking } from './components/Booking'
import { Finale, Footer } from './components/Finale'
import { Interactions } from './components/Interactions'
import { Marquee } from './components/Marquee'
import { Spotlight } from './components/Spotlight'

export default function App() {
  useEffect(() => {
    initSmoothScroll()
    // Recalculate trigger positions once fonts and media have settled.
    const refresh = () => ScrollTrigger.refresh()
    document.fonts?.ready.then(refresh)
    window.addEventListener('load', refresh)
    return () => window.removeEventListener('load', refresh)
  }, [])

  return (
    <>
      <Nav />
      <Cursor />
      <Interactions />
      <div className="grain" aria-hidden="true" />
      <main id="main">
        <Hero />
        <Story />
        <Marquee />
        <Experience />
        <Occasions />
        <Spotlight />
        <Gallery />
        <Booking />
        <Finale />
      </main>
      <Footer />
    </>
  )
}
