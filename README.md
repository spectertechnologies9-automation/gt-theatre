# Specter Theatres

A website for Specter Theatres, a private cinema experience. It opens with a live 3D theatre entrance whose velvet curtains part to reveal the screen, followed by the brand story, a five-act tour of the evening, an occasions gallery, a horizontal gallery, a booking enquiry form and a closing call to action.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173  (enquiry API included)
npm run build        # type-check and build to dist/
npm start            # production server for dist/ + enquiry API, http://localhost:4173 (PORT to override)
```

`npm run preview` also serves the enquiry API.

To generate `sitemap.xml` (it needs your real domain), build with the domain set:

```bash
SITE_URL=https://your-domain.example npm run build
```

Without `SITE_URL`, only `robots.txt` is emitted.

## GitHub Pages

`.github/workflows/pages.yml` builds and deploys every push to `main`, with `BASE_PATH=/<repo>/` and `VITE_STATIC=1`. Pages is static hosting with no server, so in that build the booking form validates the enquiry and then says plainly that it was **not sent**. To accept real enquiries, host with `npm start` (or connect a form service) instead.

## Booking enquiries

The form posts to `POST /api/enquiries`. The server validates the request again and appends it to `data/enquiries.json` with a reference ID such as `ST-1A2B3C4D`. Writes are serialised and atomic, and a honeypot field filters simple bots.

**Nothing is emailed or sent to an external service.** Someone has to read `data/enquiries.json`, or you have to connect a delivery channel (email, CRM or WhatsApp Business) in `server/enquiries.mjs`, before customers can actually be contacted. `data/` is git-ignored because it contains customer details.

## Architecture

| Area | Implementation |
| --- | --- |
| Framework | Vite 8 + React 19 + TypeScript |
| 3D opening | React Three Fiber + drei, lazy-loaded (the initial JS is about 134 KB gzipped; the 3D chunk is about 272 KB gzipped and loads in parallel with the wordmark intro) |
| Curtains | `src/three/Curtain.tsx`: procedural velvet. Each frame re-folds the vertices: fold depth grows as the cloth gathers, the hem trails the rail, and the cloth sways with the speed of the move. Occlusion is baked into vertex colours and a `MeshPhysicalMaterial` sheen lobe gives the velvet rim light. |
| Scene | `src/three/TheatreScene.tsx`: proscenium with gold mouldings, scalloped valance, shader-driven screen, instanced recliners, sconces, dust particles, reflective floor and volumetric projector beam (desktop), additive glow sprites |
| Motion | GSAP (timelines, ScrollTrigger, SplitText) + Lenis smooth scroll on a single shared ticker. No second animation engine. |
| Intro logic | `src/components/Hero.tsx`: wordmark, then lit room, then curtains open, then title. It waits for the first 3D frame before the curtain moment. Skip button provided; returning visitors in the same session get a 2-second version (`sessionStorage`). |
| Fallbacks | Mobile and low-power devices get fewer curtain segments, no reflections and no volumetric beam. Without WebGL, CSS curtains run the same timeline. With reduced motion there is no intro, no smooth scroll and no pinning, and the layout is static. |

## Installed dependencies

Runtime: `react`, `react-dom`, `three`, `@react-three/fiber`, `@react-three/drei`, `gsap`, `lenis`, `@fontsource-variable/cormorant-garamond`, `@fontsource-variable/manrope`.
Dev: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/*`, `oxlint` (from the Vite template).

`@react-three/postprocessing` was tried and then removed. Its mipmap bloom pass rendered a black frame in testing, so additive glow sprites replace it.

## Assets and licences

All media is self-hosted under `public/media/`. Full attributions are on `/credits.html`, which is linked from the footer.

- **Photography (10 files, CC0 1.0):** rawpixel (Markus Spiske's velvet curtains, cinema seats, theatre aisle, red stage, red curtain, projector, popcorn) and Wikimedia Commons (champagne glasses, Myriam Zilles). Re-encoded to WebP + JPEG.
- **Footage (6 clips, Mixkit Stock Video Free License, commercial use allowed):** #28422, #38817, #28417, #100293 (4K source), #100279 (4K source), #33312. Re-encoded to 1920 px H.264 (CRF 27, no audio, faststart), 0.8–2.4 MB each, with poster frames.
- **Generated in-project:** the 3D theatre, favicon, `og-image.jpg` and `apple-touch-icon.png`.
- **Fonts:** Cormorant Garamond and Manrope (SIL OFL 1.1).

## Gemini prompts for bespoke imagery

Image generation could not run in this build: the only connected image generator had 0 credits, and no Gemini API key is configured. The stock photos above are good placeholders, but the strongest upgrade is a consistent original set. Generate each at 16:9 (and 4:5 for the arched frames), then drop them into `public/media/img/` under the same file names.

Shared style suffix: *photorealistic editorial interior photography, deep burgundy #39070E and blood red velvet, champagne-gold #C9A45C metal accents, black marble, warm low tungsten light, architectural symmetry, cinematic depth of field, subtle film grain, no people, no text, no logos.*

1. `aisle`: The entrance to an intimate private cinema seen from the doorway: a short aisle of black marble between a few velvet recliners, gold wall sconces and a glowing screen at the end. + style
2. `velvet-wide` / `velvet-tall`: Close-up of heavy deep-red velvet theatre curtains with deep folds, a gold fringe and a light rake from below. + style
3. `seats-close`: Two rows of plush burgundy velvet private-cinema recliners with slim gold trims, side table and soft pin-spot light. + style
4. `stage-glow`: A private screening room with gold-leaf fluted pilasters, coffered black ceiling and a gilded proscenium frame. + style
5. Ambient: A dimmed private cinema with warm cove lighting tracing the walls and haze in the projector beam. + style
6. `popcorn`: A movie-night still life of popcorn in a crystal bowl and a velvet armrest, with the screen glow behind. + style
7. Romantic: Two champagne coupes on a marble side table between two recliners, facing a softly lit screen. + style
8. `curtain-stage`: A symmetrical editorial wide shot of a luxury private theatre with the curtains half drawn, framed by gold architecture. + style

## Requested tools: findings

| Tool | Finding | Used? |
| --- | --- | --- |
| GSAP + ScrollTrigger + SplitText | Free (SplitText included since 3.13), fits the stack | Yes, the single motion engine |
| Lenis | Smooth scroll, driven by GSAP's ticker | Yes |
| Three.js / R3F / drei | Fit the stack | Yes |
| Framer Motion | Would duplicate GSAP | No, deliberately |
| Theatre.js | Keyframe studio; GSAP timelines already cover the intro | No |
| GLSL libraries | A small custom shader (screen) was enough | Custom shader instead |
| Magic UI | Free components are MIT (Pro is paid). Built for shadcn/Tailwind, which this project doesn't use | No; equivalents (magnetic button, shine) were hand-built |
| Interfaces / Dither / Ultramock / Jitter / Animos / Pryzm / Origin Kit / Background Supply / Getlayers | Identity not confirmed as an npm/React library, or they are design/mockup SaaS tools without a code integration | Not installed (nothing installed on a name match alone) |

## Not yet done

- Real business details (phone, email, address, social accounts, hours). None were available, so none are shown and the structured data contains only the name and description.
- Delivering enquiries to a person (see above).
- Original Gemini imagery (prompts above).
- A Lighthouse run on real hardware. Testing used headless Chrome with software WebGL.
