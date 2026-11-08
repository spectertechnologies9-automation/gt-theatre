import { useLayoutEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger, scrollToTarget } from '../lib/motion'
import { prefersReducedMotion } from '../lib/stage'
import { MagneticButton } from './MagneticButton'
import { asset } from '../lib/asset'

// Set when building for static hosting (GitHub Pages), where the enquiry API does not exist.
const STATIC_PREVIEW = import.meta.env.VITE_STATIC === '1'

const OCCASIONS = [
  'Private movie night',
  "Couples' experience",
  'Birthday celebration',
  'Anniversary celebration',
  'Family screening',
  'Friends & exclusive gathering',
  'Something else',
]

type Fields = { name: string; phone: string; date: string; time: string; guests: string; occasion: string; notes: string; company: string }
type Errors = Partial<Record<keyof Fields, string>>

const empty: Fields = { name: '', phone: '', date: '', time: '', guests: '2', occasion: '', notes: '', company: '' }

function todayISO() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

// Mirrors server/enquiries.mjs so visitors get instant feedback; the server
// validates again and is the source of truth.
function validate(f: Fields): Errors {
  const e: Errors = {}
  if (f.name.trim().length < 2) e.name = 'Please share your name.'
  const digits = f.phone.replace(/\D/g, '')
  if (!/^[+\d][\d\s\-().]*$/.test(f.phone.trim()) || digits.length < 7 || digits.length > 15) e.phone = 'Please enter a valid contact number.'
  if (!f.date) e.date = 'Please choose a preferred date.'
  else if (f.date < todayISO()) e.date = 'Please choose a date from today onwards.'
  if (!f.time) e.time = 'Please choose a preferred time.'
  const g = Number.parseInt(f.guests, 10)
  if (!Number.isFinite(g) || g < 1 || g > 50) e.guests = 'Please enter the number of guests (1–50).'
  if (!f.occasion) e.occasion = 'Please select an occasion.'
  if (f.notes.length > 1000) e.notes = 'Please keep this under 1000 characters.'
  return e
}

export function Booking() {
  const root = useRef<HTMLElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [f, setF] = useState<Fields>(empty)
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState<Partial<Record<keyof Fields, boolean>>>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [serverMsg, setServerMsg] = useState('')
  const [ref, setRef] = useState('')

  useLayoutEffect(() => {
    const el = root.current
    if (!el || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.from('.book__head > *', { autoAlpha: 0, y: 40, stagger: 0.1, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 70%' } })
      gsap.from('.book__form .field, .book__form .book__submit', {
        autoAlpha: 0,
        y: 30,
        stagger: 0.06,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.book__form', start: 'top 80%' },
      })
    }, el)
    return () => ctx.revert()
  }, [])

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const next = { ...f, [k]: e.target.value }
    setF(next)
    if (touched[k]) setErrors(validate(next))
  }
  const blur = (k: keyof Fields) => () => {
    setTouched((t) => ({ ...t, [k]: true }))
    setErrors(validate(f))
  }
  const err = (k: keyof Fields) => (touched[k] ? errors[k] : undefined)

  const stepGuests = (d: number) => {
    const g = Math.min(50, Math.max(1, (Number.parseInt(f.guests, 10) || 0) + d))
    const next = { ...f, guests: String(g) }
    setF(next)
    if (touched.guests) setErrors(validate(next))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const v = validate(f)
    setErrors(v)
    setTouched({ name: true, phone: true, date: true, time: true, guests: true, occasion: true, notes: true })
    const order: (keyof Fields)[] = ['name', 'phone', 'date', 'time', 'guests', 'occasion', 'notes']
    const firstBad = order.find((k) => v[k])
    if (firstBad) {
      const target =
        firstBad === 'occasion'
          ? (formRef.current?.querySelector('input[name="occasion"]') as HTMLElement | null)
          : (document.getElementById('f-' + firstBad) as HTMLElement | null)
      target?.focus()
      return
    }
    setStatus('sending')
    setServerMsg('')
    if (STATIC_PREVIEW) {
      // GitHub Pages has no server: be explicit that nothing was sent.
      setRef('')
      setStatus('done')
      requestAnimationFrame(() => {
        ScrollTrigger.refresh()
        scrollToTarget('#reserve')
        const s = root.current?.querySelector('.book__success') as HTMLElement | null
        s?.focus({ preventScroll: true })
        if (s && !prefersReducedMotion()) {
          gsap.fromTo(s.querySelectorAll('.reveal'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, stagger: 0.12, duration: 1, ease: 'power3.out' })
          gsap.fromTo(s.querySelector('.book__seal'), { scale: 0.6, rotate: -30, autoAlpha: 0 }, { scale: 1, rotate: 0, autoAlpha: 1, duration: 1.4, ease: 'expo.out' })
        }
      })
      return
    }
    try {
      const res = await fetch(asset('api/enquiries'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, guests: Number.parseInt(f.guests, 10) }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (json.fields) setErrors(json.fields)
        setServerMsg(json.error || 'We could not save your enquiry. Please try again.')
        setStatus('error')
        return
      }
      setRef(json.id)
      setStatus('done')
      requestAnimationFrame(() => {
        ScrollTrigger.refresh()
        scrollToTarget('#reserve')
        const s = root.current?.querySelector('.book__success') as HTMLElement | null
        s?.focus({ preventScroll: true })
        if (s && !prefersReducedMotion()) {
          gsap.fromTo(s.querySelectorAll('.reveal'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, stagger: 0.12, duration: 1, ease: 'power3.out' })
          gsap.fromTo(s.querySelector('.book__seal'), { scale: 0.6, rotate: -30, autoAlpha: 0 }, { scale: 1, rotate: 0, autoAlpha: 1, duration: 1.4, ease: 'expo.out' })
        }
      })
    } catch {
      setServerMsg('We could not reach the enquiry service. Please check your connection and try again.')
      setStatus('error')
    }
  }

  const reset = () => {
    setF(empty)
    setErrors({})
    setTouched({})
    setStatus('idle')
    setRef('')
    requestAnimationFrame(() => ScrollTrigger.refresh())
  }

  return (
    <section ref={root} id="reserve" className="book section" aria-labelledby="book-title">
      <div className="book__bg" aria-hidden="true" />
      <div className="book__inner">
        <div className="book__head">
          <div className="section__label">
            <span>V</span> The Booking Experience
          </div>
          <h2 id="book-title" className="display">
            Request your <em>private screening</em>
          </h2>
          <p>
            {STATIC_PREVIEW
              ? 'Tell us about the evening you have in mind. This preview site is not yet connected to the Specter Theatres team, so enquiries are checked here but not sent.'
              : "Tell us about the evening you have in mind. We'll save your enquiry for the Specter Theatres team to review."}
          </p>
          <p className="book__small">This is an enquiry, not a confirmed booking. Availability is only confirmed when the team gets back to you.</p>
        </div>

        <div className="book__panel">
          {status === 'done' ? (
            <div className="book__success" tabIndex={-1} role="status" aria-live="polite">
              <div className="book__seal" aria-hidden="true">
                <svg viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="0.8" />
                  <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 4" />
                  <text x="60" y="70" textAnchor="middle" fontSize="34" fill="currentColor" fontFamily="Cormorant Garamond Variable, serif">
                    S
                  </text>
                </svg>
              </div>
              <p className="reveal book__success-eyebrow">{STATIC_PREVIEW ? 'Preview only, not sent' : 'Enquiry received'}</p>
              <h3 className="reveal">Thank you, {f.name.split(' ')[0]}.</h3>
              <p className="reveal">
                Your enquiry for <strong>{f.occasion.toLowerCase()}</strong> on{' '}
                <strong>
                  {new Date(f.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </strong>{' '}
                at <strong>{f.time}</strong> for <strong>{f.guests}</strong> {f.guests === '1' ? 'guest' : 'guests'}{' '}
                {STATIC_PREVIEW ? 'is complete, but it has not been sent to anyone.' : 'has been recorded.'}
              </p>
              {STATIC_PREVIEW ? (
                <p className="reveal book__small">This preview site is not connected to the Specter Theatres team yet, so nobody will contact you about this enquiry.</p>
              ) : (
                <>
                  <p className="reveal book__ref">
                    Reference <span>{ref}</span>
                  </p>
                  <p className="reveal book__small">Keep this reference handy. The team will contact you on the number you gave us.</p>
                </>
              )}
              <button className="reveal text-link" onClick={reset} data-cursor="hover">
                Make another enquiry
              </button>
            </div>
          ) : (
            <form ref={formRef} className="book__form" onSubmit={submit} noValidate aria-describedby="form-status">
              <div className={`field ${err('name') ? 'has-error' : ''}`}>
                <input id="f-name" name="name" autoComplete="name" placeholder=" " value={f.name} onChange={set('name')} onBlur={blur('name')} aria-invalid={!!err('name')} aria-describedby={err('name') ? 'e-name' : undefined} maxLength={80} required />
                <label htmlFor="f-name">Your name</label>
                {err('name') && <span className="field__error" id="e-name">{err('name')}</span>}
              </div>
              <div className={`field ${err('phone') ? 'has-error' : ''}`}>
                <input id="f-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder=" " value={f.phone} onChange={set('phone')} onBlur={blur('phone')} aria-invalid={!!err('phone')} aria-describedby={err('phone') ? 'e-phone' : undefined} maxLength={24} required />
                <label htmlFor="f-phone">Contact number</label>
                {err('phone') && <span className="field__error" id="e-phone">{err('phone')}</span>}
              </div>
              <div className="field-row">
                <div className={`field field--fixed ${err('date') ? 'has-error' : ''}`}>
                  <input id="f-date" name="date" type="date" min={todayISO()} value={f.date} onChange={set('date')} onBlur={blur('date')} aria-invalid={!!err('date')} aria-describedby={err('date') ? 'e-date' : undefined} required />
                  <label htmlFor="f-date">Preferred date</label>
                  {err('date') && <span className="field__error" id="e-date">{err('date')}</span>}
                </div>
                <div className={`field field--fixed ${err('time') ? 'has-error' : ''}`}>
                  <input id="f-time" name="time" type="time" step={900} value={f.time} onChange={set('time')} onBlur={blur('time')} aria-invalid={!!err('time')} aria-describedby={err('time') ? 'e-time' : undefined} required />
                  <label htmlFor="f-time">Preferred time</label>
                  {err('time') && <span className="field__error" id="e-time">{err('time')}</span>}
                </div>
              </div>
              <div className={`field field--fixed field--guests ${err('guests') ? 'has-error' : ''}`}>
                <label htmlFor="f-guests">Number of guests</label>
                <div className="stepper">
                  <button type="button" onClick={() => stepGuests(-1)} aria-label="Fewer guests" data-cursor="hover">
                    −
                  </button>
                  <input id="f-guests" name="guests" type="number" inputMode="numeric" min={1} max={50} value={f.guests} onChange={set('guests')} onBlur={blur('guests')} aria-invalid={!!err('guests')} aria-describedby={err('guests') ? 'e-guests' : undefined} required />
                  <button type="button" onClick={() => stepGuests(1)} aria-label="More guests" data-cursor="hover">
                    +
                  </button>
                </div>
                {err('guests') && <span className="field__error" id="e-guests">{err('guests')}</span>}
              </div>
              <fieldset className={`field field--chips ${err('occasion') ? 'has-error' : ''}`} aria-invalid={!!err('occasion')} aria-describedby={err('occasion') ? 'e-occasion' : undefined}>
                <legend>Occasion</legend>
                <div className="chips">
                  {OCCASIONS.map((o) => (
                    <label key={o} className={`chip ${f.occasion === o ? 'is-on' : ''}`} data-cursor="hover">
                      <input type="radio" name="occasion" value={o} checked={f.occasion === o} onChange={set('occasion')} onBlur={blur('occasion')} />
                      <span>{o}</span>
                    </label>
                  ))}
                </div>
                {err('occasion') && <span className="field__error" id="e-occasion">{err('occasion')}</span>}
              </fieldset>
              <div className={`field ${err('notes') ? 'has-error' : ''}`}>
                <textarea id="f-notes" name="notes" rows={3} placeholder=" " value={f.notes} onChange={set('notes')} onBlur={blur('notes')} maxLength={1000} aria-invalid={!!err('notes')} aria-describedby={err('notes') ? 'e-notes' : undefined} />
                <label htmlFor="f-notes">Additional requirements (optional)</label>
                <span className="field__count" aria-hidden="true">{f.notes.length}/1000</span>
                {err('notes') && <span className="field__error" id="e-notes">{err('notes')}</span>}
              </div>
              {/* honeypot */}
              <div className="hp" aria-hidden="true">
                <label htmlFor="f-company">Company</label>
                <input id="f-company" name="company" tabIndex={-1} autoComplete="off" value={f.company} onChange={set('company')} />
              </div>
              <div className="book__submit">
                <MagneticButton type="submit" variant="gold" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending…' : 'Send enquiry'}
                </MagneticButton>
                <p id="form-status" className="book__status" role="alert" aria-live="assertive">
                  {status === 'error' ? serverMsg : ''}
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
