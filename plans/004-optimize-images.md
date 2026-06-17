# Plan 004: Shrink the photo payload and lazy-load below-the-fold images

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat <planned-at SHA>..HEAD -- mockup/assets/photos mockup/*.html`
> If any in-scope file changed since this plan was written, compare the
> "Current state" facts against the live tree before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (lossy re-encode of the only local copies — git history from plan 001 is the undo path)
- **Depends on**: **001 (hard requirement — do not run on an uncommitted tree)**
- **Category**: perf
- **Planned at**: commit `748317f`, 2026-06-11

## Why this matters

The prototype ships ~8.2 MB of photos. The client will open this on phones
and venue Wi-Fi; the home page alone loads a dozen photos with **no
`loading="lazy"`** (only shop.html has it), so everything downloads up
front. Several files are grossly oversized for their largest rendered size
(~500–760 CSS px): `family.jpg` is 3292×2346 / 837 KB, `land.jpg` 948 KB.
Worse, four "jpg" files are actually **PNG** (photographic content in the
wrong codec): `dog.jpg` is 309 KB for a 368×326 image. Target: cut total
photo weight by well over half with no visible quality loss, and stop
loading below-fold images eagerly.

## Current state

- `mockup/assets/photos/` — 30 page photos (~8.2 MB) + `shop/` subdirectory
  (18 product/room photos, ~2 MB). Verified facts:
  - PNG data with `.jpg` extension (browsers content-sniff, so they render):
    `dog.jpg` (368×326, 309 KB), `forage.jpg` (355×404, 394 KB),
    `family-support.jpg` (435 KB), `guitar.jpg` (188 KB).
  - `keys.jpg` is actually WebP (RIFF) — renders fine, leave its codec, but
    it can go through the same resize path.
  - Oversized: `family.jpg` 3292×2346/837 KB, `land.jpg` 960×640/948 KB
    (huge for its pixel count — encoded near-lossless), `work.jpg`
    1500×1001/356 KB.
- Largest rendered sizes (from `mockup/assets/style.css`): hero/feature
  arches max ~500–760 CSS px wide (`.hero-door{width:min(100%,500px)}`,
  `.feat-media` inside a 1280px grid), gallery tiles ≤ ~620 px, `.photo-band
  img` full wrap width ~1150 px. At 2× DPR a **1600 px longest-side cap**
  covers every use.
- Lazy-loading: `grep -c 'loading="lazy"' mockup/*.html` today →
  shop.html: 16, every other page: 0.
- `<img>` markup style (match it):
  `<figure class="ga"><img src="assets/photos/winnipeg.jpg" alt="Winnipeg glowing at night, seen from above"></figure>`
- CLS is already handled by CSS (`aspect-ratio` on `.feat-media`/`.game-tile`,
  fixed `grid-auto-rows` on `.gallery`, fixed height on `.photo-band img`)
  — do NOT add width/height attributes; it's noise here.
- Tooling on this machine: no ImageMagick, no PIL, no cwebp. **node v24 is
  available** — use `sharp` from a scratch directory.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Baseline size | `du -sh mockup/assets/photos` | ~8.2M before |
| Install sharp (scratch) | `mkdir -p /tmp/imgopt && cd /tmp/imgopt && npm init -y && npm i sharp` | exit 0 |
| Run script | `node /tmp/imgopt/optimize.mjs` | per-file log, exit 0 |
| Codec check | `file mockup/assets/photos/*.jpg \| grep -c PNG` | 0 after |
| Serve | `cd mockup && python3 -m http.server 8765` | site up |

## Scope

**In scope**:
- Every file under `mockup/assets/photos/` (including `shop/`)
- `<img>` tags referencing `assets/photos/` in: `index.html`, `about.html`,
  `services.html`, `get-involved.html`, `contact.html` (adding
  `loading="lazy"` only)
- `/tmp/imgopt/` scratch directory (outside the repo)

**Out of scope** (do NOT touch):
- `mockup/assets/art/` — logo/SVG/PNG artwork at intentional sizes.
- `news.html` (its only photo-free `<img>`s are none — verify, then skip)
  and `shop.html` (already lazy; its photos still get re-encoded by the
  script, which is fine — just don't edit its HTML).
- `cms.html` `<img>` tags — the editor canvas demo; re-encoded files are
  picked up automatically, no markup change.
- `mockup/_shots/` — screenshots, not page assets.
- Any `src` path or `alt` text — only the codec/bytes and the `loading`
  attribute change.

## Git workflow

- Branch: `main` directly (repo from plan 001).
- Two commits: `Re-encode photos: cap 1600px, JPEG q80, fix PNG-as-jpg` then
  `Lazy-load below-the-fold photos`.

## Steps

### Step 0: Confirm the safety net

`git -C /home/ayub/Desktop/pulford-redesign status --porcelain` → must be
empty, and `git log --oneline | head -1` → a commit exists. If not, STOP
(plan 001 hasn't run; these are the only copies of the photos).

### Step 1: Write and run the re-encode script

Create `/tmp/imgopt/optimize.mjs`:

```js
import sharp from 'sharp'
import { readdirSync, statSync, renameSync } from 'fs'
import { join } from 'path'

const ROOT = '/home/ayub/Desktop/pulford-redesign/mockup/assets/photos'
const files = []
const walk = d => readdirSync(d).forEach(f => {
  const p = join(d, f)
  statSync(p).isDirectory() ? walk(p) : /\.jpe?g$/i.test(f) && files.push(p)
})
walk(ROOT)

let before = 0, after = 0
for (const p of files) {
  const orig = statSync(p).size
  before += orig
  const tmp = p + '.tmp'
  // resize to max 1600px longest side, never enlarge; emit real JPEG
  // (fixes the PNG/WebP-disguised-as-.jpg files in the same pass)
  await sharp(p).rotate() // bake EXIF orientation
    .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(tmp)
  const next = statSync(tmp).size
  if (next < orig) { renameSync(tmp, p); after += next }
  else { renameSync(tmp, p + '.discard'); after += orig } // keep original if no win
  console.log(p.replace(ROOT + '/', ''), (orig/1024|0) + 'KB ->', (Math.min(next,orig)/1024|0) + 'KB')
}
console.log('TOTAL', (before/1048576).toFixed(1) + 'MB ->', (after/1048576).toFixed(1) + 'MB')
```

Run it, then delete any `*.discard` files it left:
`find mockup/assets/photos -name '*.discard' -delete`

**Verify**: script exit 0; final `TOTAL` line shows ≤ 4.0MB after;
`file mockup/assets/photos/*.jpg mockup/assets/photos/shop/*.jpg | grep -cv JPEG` → `0`
(every .jpg is now real JPEG).

### Step 2: Visual spot-check the re-encode

Serve the site and eyeball, in both themes: index.html hero + gallery,
services.html feature arches, about.html `.photo-band` (the widest render —
`land.jpg`), shop.html grid. Look for banding in skies and over-compression
on faces. If any single image looks degraded, restore just that file with
`git checkout -- <path>` and re-run the script for it with `quality: 88`
hardcoded; if it still looks bad, keep the original and note it.

**Verify**: `du -sh mockup/assets/photos` ≤ 4.0M and no image looks visibly
worse at normal viewing distance.

### Step 3: Add `loading="lazy"` to below-the-fold photos

Add ` loading="lazy"` to `<img>` tags referencing `assets/photos/` as
follows (attribute placed after the `alt`, matching shop.html's existing
style):

- `index.html`: ALL photo imgs except none are above the fold (the hero is
  SVG/canvas) — but the first feat image (`forage.jpg`, line ~200) sits just
  below the fold; lazy-load everything (`forage.jpg`, `dog.jpg`, the 8
  gallery images).
- `services.html`: all 4 feat images EXCEPT the first (`care.jpg` — leave it
  eager), plus the 7 gallery images.
- `about.html`: `land.jpg` (photo-band).
- `get-involved.html`: the 3 `.path` images (`hero-home.jpg`, `desk.jpg`,
  `family.jpg`) — these are below the page-head, lazy is fine.
- `contact.html`: `street-sign.jpg`.
- Do not touch shop.html (already done) or cms.html.

**Verify**: `grep -c 'loading="lazy"' mockup/index.html` → `10`;
`grep -c 'loading="lazy"' mockup/services.html` → `10`;
`grep -c 'loading="lazy"' mockup/about.html mockup/contact.html` → 1 each;
`grep -c 'loading="lazy"' mockup/get-involved.html` → `3`.
(If your counts differ by ±1 because the advisor miscounted images on a
page, recount the page's `assets/photos/` imgs yourself and apply the rule
"first visible photo eager, rest lazy" — that rule wins over the literal
numbers.)

## Test plan

No automated harness. Final acceptance:
1. DevTools → Network, disable cache, reload index.html: total transferred
   should be well under 2 MB (was ~4+ MB of images alone), and gallery
   images should load as you scroll.
2. Repeat once on shop.html (re-encoded product shots render fine).
3. Both themes, one mobile-emulation pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `du -s mockup/assets/photos | cut -f1` ≤ 4096 (KB blocks, i.e. ≤ ~4.0 MB)
- [ ] `file mockup/assets/photos/*.jpg mockup/assets/photos/shop/*.jpg | grep -vc JPEG` → 0
- [ ] `find mockup/assets/photos -name '*.tmp' -o -name '*.discard' | wc -l` → 0
- [ ] Lazy-loading greps in step 3 pass (or the recount rule applied and documented in the commit message)
- [ ] `git status --porcelain` touches only `mockup/assets/photos/**` and the 5 HTML files listed
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Step 0 fails (no git safety net).
- `npm i sharp` fails to build/install on this machine.
- The TOTAL after re-encode is barely smaller (< 25% reduction) — the
  assumptions about oversizing would be wrong; report instead of cranking
  quality down.
- More than 2 images fail the visual spot-check even at quality 88.

## Maintenance notes

- New photos added later should follow the same recipe (≤1600px, JPEG q80) —
  consider noting this in the repo README when it next gets edited.
- If the prototype is later deployed publicly (hosting was raised as a
  direction finding), revisit with WebP/AVIF + `srcset`; deliberately out of
  scope here to keep the no-build constraint.
- Reviewer: diff the rendered pages, not the bytes — the only acceptable
  visual change is imperceptible compression.
