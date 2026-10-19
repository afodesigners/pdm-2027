# PDM 2027 – Homepage

Static HTML + CSS + GSAP. No build step.

```
index.html        markup (all copy lives here)
css/styles.css    tokens (:root), layout, responsive (1024 / 820 / 520)
js/main.js        animation engine + per-section code
assets/           logo + images
```

## Run
Serve over http (the glitch logo uses a CSS mask, which browsers block on file://):

    cd pdm-2027 && python3 -m http.server 8000

## Maintaining GSAP: the data-attribute system
Most animation needs **no JavaScript**. Add an attribute in the HTML.

| Attribute | Effect |
|---|---|
| `data-reveal="fade\|up\|left\|right\|clip\|line"` | scroll-triggered reveal |
| `data-stagger` (on a parent) | children reveal in sequence |
| `data-split="words"` | word-mask headline reveal; add `data-scrub` to tie it to scroll |
| `data-speed="0.15"` | parallax on a figure |
| `data-split="lines"` | line-by-line text reveal (body copy) |
| `data-float="-1\|1"` | figure drifts up/down in opposite directions on scroll |
| `data-count="12"` | odometer (rolling digits) number |
| `data-cursor="Label"` | custom cursor grows and shows the label on hover |
| `data-magnetic` | element follows the cursor slightly |
| `data-glitch` | RGB-split glitch burst (every 5–8 s + hover/focus) |
| `data-section="name"` | runs `SECTIONS.name` in main.js for custom choreography |

Global feel (easing, duration, stagger, trigger point, glitch interval) is in `CFG` at the top of `js/main.js`.

### Add a new animation style
Add one entry to the `REVEALS` object in main.js, then use `data-reveal="yourname"`.

### Add a new section
1. Add `<section data-section="foo">` in index.html with `data-reveal` attributes.
2. Only if it needs a custom timeline (pin, scrub, etc.), add `SECTIONS.foo = (el) => { ... }` in main.js.

## Nick Ho-style layer (what was added in v2)
- **Statement section** (`#approach`): big scrubbed text, cyan highlight words are `<em>`, two floating driver images (`data-float`).
- **Media** is now an agenda list: rows with hover preview that follows the cursor (`initAgenda`).
- **Lenis smooth scroll** (`initSmoothScroll`), **page loader** (`initLoader`, hero plays after it), **custom cursor** (`initCursor`).
- Each can be removed by deleting its call in the Boot section of main.js.

## Accessibility / fallbacks
- `prefers-reduced-motion`: all motion is skipped, content is shown as-is.
- If GSAP fails to load, the `js` class is removed and content shows unanimated.
- Desktop-only effects are gated with `gsap.matchMedia`.

## TODOs before launch
- **Form**: `SECTIONS.contact` fakes the submit (search `TODO`). Connect to Elementor Forms / your endpoint.
- **Images**: current photos are low-res crops from the Figma file. Replace the files in `assets/img/` with originals, keeping the filenames.
- **Hero captions** for cards 3 and 5 ("The lap / On track", "The podium / Team moment") are placeholders, not Figma copy.
- Self-host the fonts (Anton, Inter, JetBrains Mono) if you need to avoid Google Fonts.
