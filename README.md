# ByteSizedMe.github.io

An investigation-board portfolio: a dark "case wall" of pinned cards joined by red strings.
Vanilla HTML, CSS and JavaScript. No framework, no build step, no dependencies.

- Pan and zoom the board, click a card to open its case file, drag cards around.
- A plain **LIST VIEW** (top-right switch) shows the same cards as a simple vertical stack.
- Works on phones (touch pan and pinch), with keyboard only, and with reduced motion.

## Run it locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000. Useful URL options:

| URL | Does |
| --- | --- |
| `?intro=1` | replay the intro |
| `?intro=0` | skip the intro |
| `?view=list` | open in list view (`?view=board` for the board) |

## Put it on GitHub Pages

This repository is named `ByteSizedMe.github.io`, so GitHub serves it as your user site
at **https://bytesizedme.github.io/** with no build step.

1. Push your changes to the `main` branch.
2. On GitHub open **Settings, then Pages**.
3. Under **Build and deployment** choose **Deploy from a branch**, pick branch **`main`** and
   folder **`/ (root)`**, and save.
4. Wait a minute or two. The site appears at the address above (the Pages settings page shows it).

All asset paths are relative, so the same files also work under a `/repo-name` subpath
(for a project site) or on a custom domain (Settings, Pages, Custom domain).

## Edit the content

**Everything lives in `js/content.js`.** You should never need to touch another file to
change what the site says. Anything you have not filled in yet is marked `TODO` and shows up
in italics with a dashed outline, so it is easy to spot.

### Change a card

Each entry in `cards` looks like this (see the comment at the top of the file for every field):

```js
{
  id: 'vault',                  // unique name, used in connections and the tour
  type: 'polaroid',             // dossier | index | polaroid | sticky | folder
  label: 'EXHIBIT A',           // small line above the title
  icon: 'shield',               // a key of `icons`
  title: 'Singularity Vault',
  summary: 'One line shown at mid zoom and read out by screen readers.',
  tags: ['ANDROID', 'SECURITY'],            // chips at mid zoom
  preview: [['PLATFORM', 'Android']],       // 3-5 rows shown at near zoom
  x: 1950, y: 430, w: 400, h: 540, rot: -3, // centre position, size, tilt (world is 3000 x 2000)
  fixture: 'tape', pin: { x: 0.5, y: 0.03 },// pin or tape, and where the string attaches
  zoomFocus: 1.4,               // zoom used when the camera flies to it
  detail: { sections: [ { heading: 'OVERVIEW', text: '...' } ] },  // the case file
  links: [ { label: 'Google Play', url: 'TODO', kind: 'play' } ]   // buttons in the case file
}
```

- **Fill in a placeholder:** replace the `TODO` text. A link with `url: 'TODO'` shows as a dashed,
  non-clickable chip until you give it a real address.
- **Resume:** replace `assets/resume.pdf` with a newer PDF when you have one.
- **Add a project:** copy a card, give it a new `id`, pick a position, add its `id` to `tour`
  (see below), and add `connections` entries so strings reach it.
- **Order of PREVIOUS / NEXT FILE:** the `tour` list near the top, e.g.
  `tour: ['profile', 'tech', 'vault', ...]`. It is a straight line through every card, so the first
  file has no previous and the last has no next. The list view uses the same order.
- **Strings:** `connections: [{ from: 'profile', to: 'tech' }, ...]`.
- **Wall decoration:** `atmosphere.backdrop` holds the hanging banners and faded papers at the
  sides (the concrete panels are drawn behind them). Move or remove entries, or delete `backdrop`
  for a plain wall. It is not drawn on phone-width screens.
- **Zoom levels, sun circle and petals:** `zoomLevels` and `atmosphere` near the top
  (set `atmosphere.petals.count` to `0` to turn the petals off).

### Social preview image (optional)

Link previews need a picture at an **absolute** URL. Add an image (about 1200x630) at
`assets/og-image.png`, then add this to the `<head>` of `index.html` (there is a TODO there):

```html
<meta property="og:image" content="https://bytesizedme.github.io/assets/og-image.png">
<meta name="twitter:image" content="https://bytesizedme.github.io/assets/og-image.png">
```

## Using the site

| Input | Does |
| --- | --- |
| Drag the wall / one finger | pan |
| Wheel, trackpad pinch, two fingers | zoom |
| Arrow keys, `+` / `-`, `0` | pan, zoom, fit everything |
| Click or Enter on a card | fly to it and open its case file |
| Touch: tap a card | fly to it; tap again or press **OPEN FILE** to open the case file |
| Drag a card (mouse or pen) | move it; strings follow (positions reset on reload) |
| **VIEW CARD FRONT** in a case file (board view) | show the card's front side for as long as you like; **READ THE FILE**, a click outside, or Esc brings the file back |
| Arrow left / right in a case file | previous / next file, in `tour` order |
| Esc | close the case file, or skip the intro |
| Tab | moves through the controls and then the cards; focusing a card pans to it |

On a phone the board opens zoomed out to show the whole wall; pinch to zoom or tap a card to read it,
and FIT ALL brings the whole board back.

## Accessibility

- Every control is a real button or link with a visible focus ring; the case file is a dialog with a
  focus trap and returns focus when closed.
- Cards are named by their own visible text and described by their summary.
- Text is checked against WCAG AA on the dark surfaces; automated checks (axe-core, Lighthouse)
  report no accessibility issues.
- `prefers-reduced-motion` turns off the intro, camera animation, inertia, tilt, string sway,
  petals, spotlight and flip transitions. List view is the lightweight, no-effects alternative.

## Performance notes

Pan and zoom only change one `transform` on the board. Things that were measured and kept cheap:

- card shadows are plain `box-shadow` (not `filter: drop-shadow`);
- the red string glow is stacked strokes (not an SVG blur filter);
- the wall decoration costs a few milliseconds per pan frame in a software-rendered test, so its
  concrete tile is a generated bitmap and it is skipped on phones;
- string sway, petals and the other effects pause when the tab is hidden, the camera is moving, or a
  case file is open.

The only SVG filters left are three tiny noise textures used as repeating card backgrounds.

## Files

```
index.html        page shell, head metadata, controls
css/style.css     all styling
js/content.js     ALL content and layout (edit this)
js/board.js       builds cards and strings, drag, hover, string motion, zoom levels
js/camera.js      pan, zoom, fly-to, minimap, HUD
js/modal.js       case file (dossier) view and touch select / open
js/list.js        list view
js/intro.js       intro sequence, stamps, spotlight, petals
assets/           favicon.svg (the site icon), icon-512.png and other PNG sizes, resume.pdf
```
