# ByteSizedMe.github.io

An investigation-board portfolio. Vanilla HTML/CSS/JS, no build step, no dependencies.

## Editing content

Everything lives in `js/content.js`: cards, positions, strings (`connections`) and
board stamps. To add a card, copy an entry in `cards`, give it a new `id`, and add
`connections` entries to wire it up. Values marked `TODO` are placeholders to fill in.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Deploy on GitHub Pages

Repo Settings, Pages, deploy from branch `main` at `/ (root)`. All asset paths are
relative, so it also works under a `/repo-name` subpath.

## Card content and zoom levels

Each card in `js/content.js` has a `summary`, `tags`, a near-zoom `preview`, dossier
`detail` sections, `links`, `zoomFocus` and `related` ids. `TODO` marks anything still
to fill in. The board shows cards at three zoom levels (`zoomLevels` in the same file):
far = icon + title, mid = + tags and summary, near = + content preview.

## Case files

Click (or Enter on) a card to open its dossier: the camera flies to it, strings light up,
and the card flips into the case file. `detail.sections`, `links` and `related` in
`js/content.js` fill it. Left / right arrows or the buttons move to a connected file;
Esc, the X or the backdrop closes it and the camera returns.

## Moving things around

Cards can be dragged with a mouse or pen (positions reset on reload) and the strings
follow. Hovering a card lifts and tilts it, lights its strings and outlines the cards
it connects to. Strings sway gently when the board is idle and twang when a card is
dropped; both stop under `prefers-reduced-motion`, in a hidden tab, while the camera
moves, and while a dossier is open.

## Controls

Drag the wall to pan. Wheel / trackpad pinch / touch pinch zooms. Arrow keys pan,
`+` / `-` zoom, `0` fits everything. HUD buttons and the minimap do the same.

## Status

Batch 5 of 7 (dragging, hover, string motion). See `SPEC.md` for the plan.
