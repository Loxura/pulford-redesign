# Plan 005: Bring body-text colour contrast up to WCAG AA

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat <planned-at SHA>..HEAD -- mockup/assets/style.css`
> If the file changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (visible palette shifts — the human owner should eyeball the result before the pitch)
- **Depends on**: 001 (rollback safety); independent of 002–004
- **Category**: bug (accessibility)
- **Planned at**: commit `748317f`, 2026-06-11

## Why this matters

This is a prototype for a **disability services organization** — if anyone
on the client side runs an accessibility checker (likely), contrast failures
on body text are an embarrassing finding for a design pitch. The advisor
computed approximate WCAG ratios and found several normal-size text styles
below the AA threshold of 4.5:1, the worst being cream body text on the clay
CTA poster at ≈ 3.0:1. The prototype otherwise has genuinely good a11y
bones (skip link, focus-visible styles, reduced-motion support) — this
closes the main gap. Note: the advisor's ratios are hand-computed
approximations; the verification script in this plan is the authority.

## Current state

All in `mockup/assets/style.css`. Light-theme tokens at lines 12–43:

```css
--paper:#FAF3E4;  --ink:#22372E;
--marigold:#F2A93B; --sky:#A7CCE8; --clay:#DC6B3F; --moss:#7FA46C;
--cream:#FAF3E4; --spruce:#22372E; --on-color:#22372E;
```

Failing / borderline sites (approximate computed ratios):

1. **Cream text on clay** ≈ 3.0:1 — fails AA for normal text:
   - `style.css:334` `.cta{...background:var(--clay);color:var(--cream);...}`
     with `.cta p{color:rgba(250,243,228,.88)...}` (line 336) — ~17 px body.
   - `style.css:268-269` `.door-card.d-clay{background:var(--clay);color:var(--cream)}`
     `.door-card.d-clay p{color:rgba(250,243,228,.85)}` — 15 px body.
2. **Spruce-mix text on moss** ≈ 4.2:1 (mix drops it below the 4.49 of full
   spruce, itself already borderline):
   - `style.css:262` `.door-card p{...color:color-mix(in srgb,var(--on-color) 78%,transparent)}`
     on `.door-card.d-moss{background:var(--moss)}` (line 275). Also applies
     on sky/marigold cards where full-opacity would pass comfortably.
   - `style.css:595` `.room-card p{...color:color-mix(in srgb,var(--on-color) 80%,transparent)}`
     on `.r-moss{background:var(--moss)}` (line 601).
3. **Translucent spruce on marigold** ≈ 4.1–4.2:1:
   - `style.css:313` `.stat .l{...color:rgba(34,55,46,.78)}` on
     `.stats-band{background:var(--marigold)}` — 15 px.
   - `style.css:538` `.promo-kicker{...color:rgba(34,55,46,.7)}` (12.5 px) and
     `style.css:541` `.promo-sub{...color:rgba(34,55,46,.75)}` (14.5 px) on
     `.promo{background:var(--marigold)}`.

Large/bold headings on these surfaces (≥ 24 px, or ≥ ~18.7 px bold) only
need 3:1 and currently pass — they are not in scope.

Dusk theme (`html[data-theme="dark"]`, lines 46–64) swaps the tokens; the
same component rules apply on dark variants (`--clay:#D2693F`,
`--moss:#769C64`, ink `#F1E9D6`). The verification script below checks both
themes.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Contrast check | `python3 plans/check-contrast.py` (created in step 1) | `ALL PASS` |
| Serve | `cd mockup && python3 -m http.server 8765` | site up |

## Scope

**In scope**:
- `mockup/assets/style.css` — token values and the specific rules quoted above
- `plans/check-contrast.py` (create — verification tool, lives with the plans)

**Out of scope** (do NOT touch):
- Any HTML file.
- Heading/`.display`/chip styles — large-text sites that already pass 3:1.
- `--marigold`, `--sky` token values — they pass with full-opacity spruce
  text; fix the *text* opacity, not these brand colours.
- Dusk-theme token values unless the script proves a failure there (check
  first, change only what fails).

## Git workflow

- Branch: `main` directly.
- One commit: `Raise body-text contrast to WCAG AA on tinted surfaces`.

## Steps

### Step 1: Create the verification script

Create `plans/check-contrast.py`:

```python
#!/usr/bin/env python3
"""WCAG contrast gate for the Pulford mockup palette.
Edit PAIRS when palette/rules change. Exit 1 on any failure."""

def lin(c):
    c /= 255
    return c/12.92 if c <= 0.03928 else ((c+0.055)/1.055)**2.4

def lum(rgb):
    r, g, b = rgb
    return 0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b)

def ratio(fg, bg):
    a, b = sorted((lum(fg), lum(bg)), reverse=True)
    return (a+0.05)/(b+0.05)

def hx(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i+2], 16) for i in (0, 2, 4))

def blend(fg, bg, alpha):
    return tuple(round(f*alpha + b*(1-alpha)) for f, b in zip(fg, bg))

# ---- palette (keep in sync with style.css tokens) ----
LIGHT = dict(paper='#FAF3E4', ink='#22372E', marigold='#F2A93B',
             sky='#A7CCE8', clay='#DC6B3F', moss='#7FA46C',
             cream='#FAF3E4', spruce='#22372E')
DARK  = dict(paper='#121E18', ink='#F1E9D6', marigold='#E8A23B',
             sky='#8FB8DA', clay='#D2693F', moss='#769C64',
             cream='#FAF3E4', spruce='#22372E')

# (name, fg_token, fg_alpha, bg_token, min_ratio) — alpha blends fg into bg
PAIRS = [
    ('cta body (cream on clay)',        'cream',  0.88, 'clay',     4.5),
    ('door-card.d-clay p',              'cream',  0.85, 'clay',     4.5),
    ('door-card p on moss',             'spruce', 0.78, 'moss',     4.5),
    ('room-card p on moss',             'spruce', 0.80, 'moss',     4.5),
    ('stat label on marigold',          'spruce', 0.78, 'marigold', 4.5),
    ('promo-kicker on marigold',        'spruce', 0.70, 'marigold', 4.5),
    ('promo-sub on marigold',           'spruce', 0.75, 'marigold', 4.5),
]

fail = 0
for theme_name, T in (('light', LIGHT), ('dark', DARK)):
    for name, fg, alpha, bg, need in PAIRS:
        f, b = hx(T[fg]), hx(T[bg])
        r = ratio(blend(f, b, alpha), b)
        ok = r >= need
        fail += not ok
        print(f"{theme_name:5} {name:32} {r:4.2f}  {'PASS' if ok else 'FAIL'} (need {need})")
print('ALL PASS' if not fail else f'{fail} FAILURES')
raise SystemExit(1 if fail else 0)
```

Run it once **before changing anything**: it must report failures matching
the "Current state" list (within rounding). If it reports everything
passing, the advisor's analysis was wrong — STOP and report.

**Verify**: `python3 plans/check-contrast.py; echo exit=$?` → `exit=1` with
FAIL lines for the clay and translucent pairs.

### Step 2: Fix the clay surfaces

Clay's problem is the background, not the text — no near-white text passes
4.5:1 on `#DC6B3F`. Add a darker companion token and use it for surfaces
that carry body text:

1. In `:root` (after line 25 `--clay:#DC6B3F;`) add:
   `--clay-deep:#A8431F;  /* clay dark enough for AA body text */`
2. In `html[data-theme="dark"]` (after `--clay:#D2693F;`) add:
   `--clay-deep:#9E3F1E;`
3. `style.css:334` `.cta{...background:var(--clay);...}` →
   `background:var(--clay-deep);`
4. `style.css:268` `.door-card.d-clay{background:var(--clay);...}` →
   `background:var(--clay-deep);`
5. Update the script's PAIRS: change the two clay rows' `bg` token to a new
   `clay_deep` entry added to both palette dicts.

Chips, dots, borders and the `--dot:var(--clay)` accents elsewhere keep the
original clay — only these two body-text surfaces change.

**Verify**: `python3 plans/check-contrast.py` → the two clay rows PASS in
both themes.

### Step 3: Fix the translucent-text sites

Raise text alphas to full or near-full (the tinted backgrounds already make
the hierarchy read; the transparency is what kills the ratio):

1. `style.css:262` `.door-card p` → `color:color-mix(in srgb,var(--on-color) 92%,transparent)`
2. `style.css:595` `.room-card p` → same 92% mix.
3. `style.css:313` `.stat .l` → `color:rgba(34,55,46,.92)`
4. `style.css:538` `.promo-kicker` → `color:rgba(34,55,46,.92)`
5. `style.css:541` `.promo-sub` → `color:rgba(34,55,46,.92)`
6. Update PAIRS alphas to 0.92 accordingly.
7. Re-run the script. **If the moss rows still fail** at alpha 0.92 (full
   spruce on moss is borderline ≈ 4.5), lighten the moss token slightly:
   `--moss:#7FA46C` → `--moss:#85AA72` (light theme only; re-check dark),
   and update the script palette. This is the only token change permitted
   beyond clay-deep.

**Verify**: `python3 plans/check-contrast.py; echo exit=$?` → `ALL PASS`,
`exit=0` for both themes.

### Step 4: Visual review

Serve the site; in both themes review: index.html (door cards, stats band,
promo band, clay CTA), shop.html (room cards, closing CTA), news.html and
get-involved.html (clay CTAs). The clay CTA will be noticeably deeper/
richer — that is expected. Capture before/after screenshots of index.html
full page into `mockup/_shots/` named `aa-before.png` / `aa-after.png` if a
screenshot tool is available; otherwise note in the commit message that the
human should review.

**Verify**: nothing looks broken (text invisible, borders vanished); the
overall poster feel is intact.

## Test plan

`plans/check-contrast.py` is the regression test — it encodes every
fg/bg/alpha pair touched by this plan, both themes, and exits non-zero on
failure. Run it as the final gate. Manual visual pass per step 4.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `python3 plans/check-contrast.py` → prints `ALL PASS`, exit 0
- [ ] `grep -c "clay-deep" mockup/assets/style.css` → 4 (2 token defs + 2 uses)
- [ ] `grep -n "rgba(34,55,46,.7" mockup/assets/style.css` → no matches (old alphas gone)
- [ ] `git status --porcelain` shows only `mockup/assets/style.css` and `plans/` files
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The pre-change script run (step 1) shows everything already passing.
- After steps 2–3 any pair still fails and the moss adjustment in step 3.7
  doesn't resolve it — do not start inventing new palette values; report
  the failing pair and its ratio.
- The visual review shows the clay change clashing badly (e.g. against the
  `.cta-doors` illustration colours `#3A2417`/`#E7B493` at style.css:341) —
  report with a screenshot rather than tuning illustration colours.

## Maintenance notes

- Any future tinted surface that carries body text should get a row in
  `plans/check-contrast.py` PAIRS — the script is the cheap gate.
- The dusk-theme `--clay-deep` value was chosen analytically, not visually;
  the design owner may want to tune it (keeping the script passing).
- Deliberately NOT addressed (recorded in plans/README.md): icon/decorative
  contrast, focus-ring contrast on tinted surfaces (currently fine), and
  the `.hl` marigold highlighter behind display text (large text, passes).
