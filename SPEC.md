Build a static portfolio site for GitHub Pages. Vanilla HTML/CSS/JS only: no framework, no build step, no npm dependencies, so it deploys by just pushing to main. All asset paths must be relative so it works at a root domain or a /repo-name subpath.

## Concept
An investigation / evidence board. A dark corkboard-or-concrete-wall surface with "evidence" cards pinned to it, connected by red strings that overlap and cross, like a detective or FBI case wall. Style: classified military/federal case file. Layer a subtle Japan theme over it without breaking the core concept.

## Visual design
- Board: dark textured wall or cork (CSS/SVG noise only, no heavy images), vignette, faint grid or scanline overlay
- Cards: mix of polaroid photos, paper dossier sheets, index cards, and sticky notes. Each slightly rotated (-4° to 4°), with a pin or tape strip, drop shadow, and paper texture
- Strings: red SVG lines/curves running between pin points, with slight sag, drawn behind cards. Strings must follow the cards: recompute endpoints on resize and on card drag. Animate string drawing on page load (stroke-dashoffset)
- Typography: typewriter font for body (Special Elite or Courier Prime), stencil/military font for headers (Black Ops One or Stardos Stencil), handwritten font for notes (Caveat). Load via Google Fonts with fallbacks
- Stamps: "CLASSIFIED", "TOP SECRET", "CASE FILE No. 001", "DECLASSIFIED" in rotated red/black ink-stamp style; some redaction bars (black blocks) over decorative text
- Japan touches: 機密 (confidential) and 事件ファイル (case file) stamps, a red hanko/inkan seal on cards, a faint red rising-sun circle behind the board center, vertical Japanese text labels on some card edges, subtle sakura petals drifting slowly (canvas or CSS, low opacity, pauses with prefers-reduced-motion), washi-paper texture on a couple of cards. Keep the palette: charcoal, off-white paper, evidence red, a touch of aged yellow
- Header: a "case file" title card in the center with my name "Byte" and the tagline "Software Engineer: Application Security & Mobile"

## Cards (each clickable)
1. **Profile / Resume** (center card, "SUBJECT FILE"): BTech CS student at Manipal Institute of Technology Bangalore, graduating May 2028. Detail view shows summary, education, skills overview, and a download link to resume.pdf (placeholder path: assets/resume.pdf)
2. **Tech Stack**: grouped (Languages, Mobile, Security, Backend, Tools). Use TODO placeholders for anything you're unsure of. Don't invent skills
3. **Singularity Vault**: Android security app, published on Google Play, built under my venture Rift Labs. Links: Play Store (TODO url), GitHub (TODO url)
4. **PhishGuard**: project card (TODO: description + links; I'll fill in)
5. **Sentinel**: Go RBAC authorization microservice. Style as "PENDING / UPCOMING" with a redacted-looking overlay and "CLASSIFIED: IN DEVELOPMENT" stamp. Planned for Jan 2027
6. **Japanese**: JLPT status (TODO: level/date) and general study progress. This card gets the strongest Japan styling (hanko seal, vertical text). Mention the goal of working in Japan combining software engineering and cybersecurity
7. **Contact / Links**: GitHub, LinkedIn, email (all TODO placeholders)

String connections (logical): Profile ↔ Tech Stack, Profile ↔ Japanese, Tech Stack ↔ each project, Singularity Vault ↔ Sentinel (security thread), Japanese ↔ Contact. Strings should overlap and cross like a real board.

## Interaction
- Hover: card lifts, string touching it brightens
- Click: card expands into a modal "case file" view (smooth transition from the card's position), with full details, tags, and external link buttons (GitHub, Play Store, etc.). Close via X, Esc, or backdrop click. Trap focus in the modal
- Cards are draggable on desktop (pointer events), and strings follow. Positions reset on reload (no localStorage needed)
- Subtle sound or flashlight effects: skip, not needed

## Content structure
Put ALL content in one data file (js/content.js) as a plain JS object/array: cards, positions, connections, details, links. I should be able to add a new project by editing only that file. Every unknown value is a clearly marked `TODO` placeholder.

## Responsive and accessibility
- Desktop: full board layout. Mobile (<768px): switch to a vertical stack of cards with short string segments between them, no dragging, same modal behavior
- Cards are real <button> or <a> elements, keyboard focusable with visible focus rings, aria-labels, and modal uses role="dialog"
- Respect prefers-reduced-motion (disable petals, string animation, transitions)
- Good contrast on text over paper cards; Lighthouse accessibility target 90+
- Add basic meta tags, OG tags, and a favicon (simple SVG)

## File structure
index.html, css/style.css, js/content.js, js/board.js (layout + strings + drag), js/modal.js, assets/ (resume placeholder, icons). Add a short README explaining how to edit content.js and enable GitHub Pages.

## Workflow rules
- Work in small batches. After each batch, stop and wait for my review
- Do NOT open PRs and do NOT make the final commits yourself. At the end of each batch, give me a commit plan: suggested commit messages and the exact `git add` paths for each. I will make the commits and PRs under my own name
- Don't push anything to the remote
- Before starting, give me a short plan of the batches (e.g. 1: scaffold + board + strings, 2: cards + content, 3: modal + drag, 4: Japan theme polish, 5: mobile + a11y), then begin batch 1

## ADDENDUM: overrides earlier sections where they conflict

### Theme: dark first
- Base the whole site on a near-black palette: wall #0b0c0e to #14161a, vignette pushing edges to almost pure black. Light is the exception, not the default.
- Paper cards are aged and dimmed, not bright white: dark manila, slate dossier sheets, tea-stained off-white (#c9c2b0 at most), a few near-black "evidence folder" cards with light text. No large bright surfaces anywhere.
- Evidence red strings get a faint red glow (SVG filter or drop-shadow) so they read against the dark wall. Aged yellow only as small accents (tape, sticky notes, stamps).
- A soft cursor-following spotlight over the board (radial gradient mask, ~400px, low intensity) so the wall feels dim and the cards near the cursor are lit. Disable under prefers-reduced-motion and on touch.
- Japan layer stays an accent: dim red sun circle behind the board center, hanko seals, 機密 / 事件ファイル stamps, petals at very low opacity.
- Modal/dossier view is also dark: dark paper panel, light typewriter text, red accents.

### Camera system (pan + zoom)
Treat the board as a large "world" (e.g. 3000x2000 logical units) inside a viewport. Cards and the SVG string layer live in the SAME transformed container, so strings scale and pan with the cards automatically and only need recomputing when a card is dragged.
- Zoom: mouse wheel / trackpad pinch zooms toward the cursor, touch pinch zooms toward the midpoint. Clamp scale to 0.3 to 2.5.
- Pan: drag on empty wall to pan (grab cursor), with slight inertia on release. Arrow keys pan, +/- zoom, 0 = fit all.
- On-screen controls (bottom corner, styled like a surveillance HUD): zoom in, zoom out, "FIT ALL" (full overview), reset. Show the current zoom % in monospace.
- Minimap (bottom corner, small): shows all cards as dots plus the current viewport rectangle; clicking it moves the camera. Hide on mobile.
- Use transform: translate() scale() only, with will-change: transform. Keep pan/zoom at 60fps. Do not re-render strings while panning or zooming.
- Card dragging must account for current scale (divide pointer deltas by zoom). Dragging a card must not pan the board.
- Semantic zoom: when zoomed out far, cards show only a title label and icon. As you zoom in, more detail fades in (tags, summary line). At close zoom a card shows a preview of its content. Implement by toggling data-zoom-level="far|mid|near" on the board and styling with CSS.

### Transitions and animation (make it feel alive)
- Camera moves are animated with eased tweens (custom rAF tween or Web Animations API, ease-in-out cubic, 600 to 900ms). Never snap.
- Intro sequence: start zoomed in tight on the center "case file" title card, stamp slams down (scale + slight shake), then the camera pulls back to the full board while strings draw in one by one (stroke-dashoffset) and cards drop onto the wall with a stagger and slight bounce. Include a "SKIP INTRO" button; skip automatically on repeat visits within the session.
- Click a card: the camera flies to center and zoom that card, the card lifts, then unfolds/flips into its dossier detail view (3D flip or paper-unfold). The strings connected to it brighten and pulse, and unrelated cards dim slightly. Closing reverses the animation and the camera returns to the previous view.
- Detail view has a "next / previous file" control that flies the camera along the string to a connected card.
- Hover: card lifts with a slight 3D tilt following the cursor (max ~6deg), its strings brighten, connected cards get a subtle highlight outline.
- Strings have a slight idle sway (very small sine motion on the sag control point), and a quick tension "twang" when a card is dropped after dragging.
- Stamps animate in (scale from 1.6 to 1 with opacity) when a card first enters the viewport at near zoom.
- Subtle film-grain and scanline overlay on top, very low opacity.
- All motion respects prefers-reduced-motion: camera moves become short fades or instant, no sway, no tilt, no petals, no spotlight, no intro.

### Mobile (replaces the earlier vertical-stack rule)
- Keep the same board on mobile with touch pan and pinch zoom, starting fit-to-width and centered on the title card.
- Add a "LIST VIEW" toggle that switches to a simple vertical stack of the same cards (accessibility fallback and for slow devices). Same modal behavior in both.
- Tap a card to fly to it, tap again or press "open" to expand the dossier.

### Accessibility additions
- Camera controls are real buttons with aria-labels. Cards remain focusable in logical order; focusing a card with the keyboard pans the camera to it.
- Announce the open dossier with role="dialog", and keep focus trapped.
- Keep text contrast at WCAG AA on dark surfaces (check light text on dark paper and red on near-black).

### Code structure additions
- js/camera.js: pan, zoom, tweens, fit-all, fly-to, minimap, inertia
- js/board.js: layout, strings, card drag (scale-aware), semantic zoom levels
- js/intro.js: intro sequence and skip logic
- Keep all content in js/content.js. Each card gets a `zoomFocus` value (the scale to use when flying to it) and optional `related` ids for the next/previous navigation along strings.

### Updated batch plan
1. Scaffold, dark theme, world container, cards, static strings
2. Camera system: pan, zoom, controls, fit-all, minimap
3. Card content from content.js, semantic zoom levels
4. Dossier view, fly-to, flip/unfold transitions, string highlight
5. Card dragging (scale-aware), hover tilt, string sway/twang
6. Intro sequence, stamps, Japan touches, spotlight, grain
7. Mobile touch + list view, reduced motion, accessibility pass, perf check
Keep the earlier workflow rules: small batches, stop after each for my review, no PRs, no final commits by you, and end each batch with a commit plan (messages + exact git add paths).
