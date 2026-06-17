# Plan 003: Offline-proof the demo — self-host fonts and the CMS editor

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat <planned-at SHA>..HEAD -- mockup/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (font files are easy to get subtly wrong — verify weights/axes render)
- **Depends on**: 001 (git baseline for rollback)
- **Category**: bug (demo reliability)
- **Planned at**: commit `748317f`, 2026-06-11

## Why this matters

This prototype is the centrepiece of a live, in-room client pitch.
`pitch-script.md` has an explicit pre-flight item: *"Demo runs on the
presenting laptop"*. Today the demo has two hard network dependencies:

1. **Typography**: every page loads Bricolage Grotesque + Figtree from
   `fonts.googleapis.com`. Offline (or on hostile venue Wi-Fi), the whole
   poster-style design collapses to Trebuchet/Verdana fallbacks — the worst
   possible failure mode for a design pitch.
2. **The CMS demo** (`cms.html`): TipTap + ProseMirror load from `esm.sh`.
   Offline, the editor silently degrades to a read-only article (there is a
   fallback note, but the pitch beat is "type something, hit Publish").

After this plan, the entire prototype renders identically with networking
disabled.

## Current state

- Font loading — identical 3-line block in the `<head>` of **all 8 pages**
  (`index.html`, `about.html`, `services.html`, `shop.html`,
  `get-involved.html`, `news.html`, `contact.html` at lines 9–11;
  `cms.html` at lines 9–10 in condensed form):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Figtree:ital,wght@0,400..700;1,400..600&display=swap" rel="stylesheet">
```

  `cms.html` additionally requests `JetBrains+Mono:wght@400;500` in its
  combined css2 URL (line 10).

- Font usage — `mockup/assets/style.css:12-14`:

```css
--display:"Bricolage Grotesque","Trebuchet MS",Verdana,sans-serif;
--body:"Figtree","Segoe UI",Verdana,sans-serif;
```

  Both families are **variable fonts** used at many intermediate weights
  (e.g. `font-weight:430`, `520`, `560`, `640`, `680` appear throughout
  style.css) — so you must self-host the *variable* woff2 files, not static
  weights, or the design's weight nuances flatten.

- TipTap — `mockup/cms.html:13-25` (import map pinning `@tiptap/*@2` through
  esm.sh) and `cms.html:360-365` (module script importing `Editor`,
  `StarterKit`, `Link`, `Image`, `Placeholder`). A CDN-stall fallback note
  exists at `cms.html:293` (`#ttNote`).

- No package.json anywhere; node v24 is available (`~/.nvm/.../v24.15.0`).
  The site must keep working from `file://` as well as a local server, so
  all new asset URLs must be **relative** paths.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Download css2 with variable-font UA | `curl -sA "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36" "<css2 url>"` | CSS containing `.woff2` URLs and `font-weight: 400 800` style ranges |
| Serve site | `cd mockup && python3 -m http.server 8765` | pages served |
| Bundle TipTap | `npx esbuild ...` (step 4) | one ESM bundle file |
| Grep gates | see steps | |

## Scope

**In scope** (the only files you should modify/create):
- `mockup/assets/fonts/` (create — woff2 files + `fonts.css`)
- `mockup/assets/vendor/tiptap.js` (create — bundled editor)
- All 8 HTML files in `mockup/` (head `<link>` swap; `cms.html` also the
  import map/module script)
- A scratch directory **outside the repo** (e.g. `/tmp/tiptap-bundle`) for
  the esbuild step

**Out of scope** (do NOT touch):
- `mockup/assets/style.css` — the `--display`/`--body` font stacks already
  name the families correctly; only `@font-face` is being added, in a new file.
- `mockup-a-v1/`, `mockup-b/`, `mockup-c/` — frozen mockups keep their CDN
  fonts.
- Any behavioural change to the editor (extensions list, toolbar wiring).

## Git workflow

- Branch: `main` directly.
- Two commits: `Self-host Bricolage Grotesque, Figtree, JetBrains Mono` and
  `Vendor TipTap bundle for offline CMS demo`.

## Steps

### Step 1: Fetch the variable woff2 files

For each css2 URL below, curl it **with the Chrome UA header** (otherwise
Google serves legacy TTF/split files), extract the unique
`https://fonts.gstatic.com/...woff2` URLs, and download them into
`mockup/assets/fonts/` with the descriptive names given:

1. `https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap`
   → expect 1 latin variable file (plus possibly latin-ext; keep latin and
   latin-ext, skip other subsets) → save as
   `bricolage-grotesque-var.woff2` (+`...-latin-ext.woff2` if present).
2. `https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400..700;1,400..600&display=swap`
   → expect 2 files (normal + italic) per subset → `figtree-var.woff2`,
   `figtree-italic-var.woff2` (+latin-ext variants if present).
3. `https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap`
   → `jetbrains-mono-var.woff2` (a 400..500 range or two statics — keep
   whatever css2 returns, name accordingly).

Keep a copy of each css2 response — you need its exact `@font-face` blocks
(weight ranges, `font-stretch`, `unicode-range`) for step 2.

**Verify**: `ls mockup/assets/fonts/*.woff2 | wc -l` ≥ 4, and
`file mockup/assets/fonts/*.woff2` → every line says `Web Open Font Format (Version 2)`.

### Step 2: Write `mockup/assets/fonts/fonts.css`

Reproduce the `@font-face` blocks from the saved css2 responses verbatim
(same `font-family`, `font-style`, `font-weight` ranges, `font-stretch`,
`unicode-range`), changing only:
- each `src: url(https://fonts.gstatic.com/...)` → the local relative file
  `url(<name>.woff2) format("woff2")` (the css file sits next to the fonts,
  so bare filenames work),
- ensure every block has `font-display:swap`.

Do not hand-author weight ranges from memory — copy them from the css2
response. (Bricolage also carries an `opsz` axis; the css2 response encodes
this via `font-stretch`/tech — copy whatever it emits.)

**Verify**: `grep -c "@font-face" mockup/assets/fonts/fonts.css` ≥ 4 and
`grep -c "gstatic" mockup/assets/fonts/fonts.css` → `0`.

### Step 3: Swap the `<link>` tags in all 8 pages

In each of `index.html about.html services.html shop.html get-involved.html
news.html contact.html cms.html`, replace the two `preconnect` lines and the
`fonts.googleapis.com/css2` stylesheet link with the single line:

```html
<link rel="stylesheet" href="assets/fonts/fonts.css">
```

Keep it in the same position (before `assets/style.css`).

**Verify**:
`grep -rln "fonts.googleapis\|fonts.gstatic" mockup/*.html` → no output.
Then serve the site, open index.html, and in DevTools → Network confirm
zero requests leave localhost; in the rendered page confirm the display
font is clearly Bricolage (compare the chunky hero headline against a
screenshot in `mockup/_shots/v2-hero.png`) and that intermediate weights
differ (nav links at weight 560 should look lighter than the brand name at
700 — if every weight renders identical, the variable axis didn't load:
STOP).

### Step 4: Bundle TipTap locally

In a scratch dir outside the repo:

```bash
mkdir -p /tmp/tiptap-bundle && cd /tmp/tiptap-bundle
npm init -y
npm i @tiptap/core@2 @tiptap/starter-kit@2 @tiptap/extension-link@2 @tiptap/extension-image@2 @tiptap/extension-placeholder@2
cat > entry.js <<'EOF'
export { Editor } from '@tiptap/core'
export { default as StarterKit } from '@tiptap/starter-kit'
export { default as Link } from '@tiptap/extension-link'
export { default as Image } from '@tiptap/extension-image'
export { default as Placeholder } from '@tiptap/extension-placeholder'
EOF
npx esbuild entry.js --bundle --format=esm --minify --outfile=tiptap.js
```

Copy the result to `mockup/assets/vendor/tiptap.js`.

**Verify**: `head -c 200 mockup/assets/vendor/tiptap.js` shows minified ESM;
file size roughly 300–800 KB (`du -h`). If esbuild errors on a dependency,
STOP — do not switch bundlers on your own.

### Step 5: Point `cms.html` at the bundle

1. Delete the whole `<script type="importmap">…</script>` block
   (cms.html:13-25 including the explanatory comment line 13).
2. In the module script (cms.html:360-365), replace the five import lines
   with:

```js
import { Editor, StarterKit, Link, Image, Placeholder } from './assets/vendor/tiptap.js'
```

3. Update the fallback note text at `cms.html:293` — it currently says the
   page "needs an internet connection (TipTap loads from a CDN in this
   concept build)". Change that parenthetical to "(the editor failed to
   load)" since the CDN claim is no longer true.

**Verify**: `grep -c "esm.sh" mockup/cms.html` → `0`. Serve and open
cms.html: the article body is editable (click into it, type), toolbar
buttons toggle active states, word count updates. Then re-test **offline**:
stop being the judge of "looks fine" — in DevTools set Network to
"Offline", hard-reload, and repeat the typing test.

## Test plan

No automated harness. The decisive test, performed once at the end:
1. `cd mockup && python3 -m http.server 8765`
2. In the browser, DevTools → Network → Offline (or disconnect Wi-Fi).
3. Hard-reload `index.html`, `shop.html`, `cms.html`.
4. All three must render with full typography; cms.html must be editable.
5. Also open `index.html` directly via `file://` path once — fonts must
   still load (relative paths).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -rln "fonts.googleapis\|fonts.gstatic\|esm.sh" mockup/` → no output
- [ ] `ls mockup/assets/fonts/*.woff2 | wc -l` ≥ 4; `test -f mockup/assets/vendor/tiptap.js`
- [ ] Offline reload test (test plan above) passes for index.html, shop.html, cms.html
- [ ] `git status --porcelain` shows only: 8 HTML files modified, new files under `mockup/assets/fonts/` and `mockup/assets/vendor/`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The css2 endpoint returns split static weights instead of a variable
  range even with the Chrome UA (Google changed behaviour) — report the
  response, don't improvise with a different font provider.
- Variable weights visibly don't render (step 3 check).
- esbuild cannot bundle TipTap v2 cleanly.
- You find yourself wanting to edit `style.css` or change editor behaviour.

## Maintenance notes

- The fonts are now pinned snapshots; if the design later adds a weight
  outside the downloaded ranges (e.g. Figtree 800), the css2 fetch must be
  redone with a widened range.
- `assets/vendor/tiptap.js` is a built artifact with no lockfile in-repo;
  the scratch `package-lock.json` from /tmp is intentionally not kept —
  if reproducibility matters later (real build), this moves into the
  Next.js project anyway (per the agreed stack direction).
- Reviewer should scrutinise: that `unicode-range` subsets were copied
  correctly (missing latin-ext silently breaks é/è in "Renée Sauvé" on
  cms.html — good spot-check string).
