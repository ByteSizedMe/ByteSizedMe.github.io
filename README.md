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

## Status

Batch 1 of 7 (scaffold, dark theme, static board). See `SPEC.md` for the plan.
