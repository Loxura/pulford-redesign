# Plan 002: Make the donate CTA buttons visible on touch devices

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
> treat it as a STOP condition. (If no git repo exists yet, plan 001 has not
> run — compare excerpts manually.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (001 recommended first for rollback safety)
- **Category**: bug
- **Planned at**: commit `<filled by plan 001 step 5>`, 2026-06-11

## Why this matters

The big "Open a door" CTA poster (used on the home page and on the donate
section of Get Involved) hides its **Donate** and **Get involved** buttons
behind a hover interaction: the buttons sit at `opacity:0` inside an
illustrated doorway and only fade in on `.cta:hover` or `:focus-within`.
Touch devices have no hover — on a phone or tablet the primary conversion
buttons of the prototype are invisible, and (because they keep default
pointer-events while transparent) can also be tapped blindly. This is the
exact flow the client pitch demonstrates ("Your gift helps someone walk
through a new door"), and the client will almost certainly open the
prototype on a phone. Keyboard users are fine (`:focus-within` reveals);
touch users are not.

## Current state

- `mockup/assets/style.css` — the only stylesheet; all pages share it.
  The CTA "stage" rules are at lines 339–356. Relevant excerpts as of
  planning (line numbers approximate within ±3):

```css
/* style.css:339-348 */
.cta-stage{position:relative;justify-self:center;width:min(100%,400px)}
.cta-doors{width:100%;aspect-ratio:260/296;position:relative;z-index:2;transform-origin:50% 90%;
  color:#3A2417;--leaf:#E7B493;--mg:#F2A93B;pointer-events:none;animation:ctaKnock 5s var(--ease) infinite}
.cta:hover .cta-doors,.cta:focus-within .cta-doors{animation:none}
.cta-doors svg{width:100%;height:100%;display:block}
.cta-actions{display:flex;gap:14px;flex-wrap:wrap;justify-content:flex-end;position:relative;z-index:1}
.cta-stage .cta-actions{position:absolute;inset:10% 0 6%;flex-direction:column;flex-wrap:nowrap;gap:16px;
  align-items:center;justify-content:center;z-index:0;opacity:0;transform:translateY(12px) scale(.95);
  transition:opacity .5s var(--ease),transform .5s var(--ease)}
.cta:hover .cta-stage .cta-actions,.cta:focus-within .cta-stage .cta-actions{opacity:1;transform:none;z-index:3;transition-delay:.3s}
```

- The reduced-motion block at the end of the file (lines 735–743) already
  contains the "always visible" fallback shape this plan generalises:

```css
/* style.css:735-743 */
@media (prefers-reduced-motion:reduce){
  *{animation:none!important;transition:none!important;scroll-behavior:auto!important}
  ...
  .cta-doors{z-index:0}
  .cta-stage .cta-actions{opacity:1;transform:none;z-index:1}
}
```

- Markup using `.cta-stage` (the hover-gated variant): `mockup/index.html`
  lines ~262–303 ("CTA — the doors swing open") and
  `mockup/get-involved.html` lines ~177–218 (the `#donate` section).
  Other pages (services, news, shop, about) use `.cta-actions` WITHOUT
  `.cta-stage`, so their buttons are always visible — they must not change.

- Repo conventions: single CSS file, design tokens at the top, sections
  delimited by `/* ---- name ---- */` comments. No build step; just edit
  the file. Match the existing compact one-rule-per-line style.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Serve site | `cd /home/ayub/Desktop/pulford-redesign/mockup && python3 -m http.server 8765` | pages at http://localhost:8765 |
| Grep gate | `grep -n "hover:hover" mockup/assets/style.css` | at least 1 match after the fix |

## Scope

**In scope** (the only file you should modify):
- `mockup/assets/style.css`

**Out of scope** (do NOT touch, even though they look related):
- `mockup/index.html`, `mockup/get-involved.html` — the markup is correct;
  this is a CSS-only fix.
- The `.door-card` / `.door-ico` hover animations (door leaf swinging on
  buttons) — decorative, fine on touch, leave them.
- `mockup-a-v1/`, `mockup-b/`, `mockup-c/` — frozen earlier mockups.

## Git workflow

- Branch: work directly on `main` (solo prototype repo, no branch convention).
- One commit: `Reveal CTA stage buttons on non-hover devices`.

## Steps

### Step 1: Gate the hide-behind-hover styles to hover-capable devices

In `mockup/assets/style.css`, change the `.cta-stage .cta-actions` rules so
the hidden initial state and hover reveal only apply when the device
actually has hover. Concretely:

1. Reduce the base rule to layout only (always-visible default):

```css
.cta-stage .cta-actions{position:absolute;inset:10% 0 6%;flex-direction:column;flex-wrap:nowrap;gap:16px;
  align-items:center;justify-content:center;z-index:3}
```

2. Immediately after it, add a hover-capability block that restores the
   current animated behaviour for mouse users, including pushing the doors
   back above the buttons:

```css
@media (hover:hover) and (pointer:fine){
  .cta-stage .cta-actions{z-index:0;opacity:0;transform:translateY(12px) scale(.95);
    transition:opacity .5s var(--ease),transform .5s var(--ease)}
  .cta:hover .cta-stage .cta-actions,.cta:focus-within .cta-stage .cta-actions{opacity:1;transform:none;z-index:3;transition-delay:.3s}
}
```

3. Delete the old standalone line
   `.cta:hover .cta-stage .cta-actions,.cta:focus-within .cta-stage .cta-actions{opacity:1;transform:none;z-index:3;transition-delay:.3s}`
   (it now lives inside the media block).

4. On touch, the doors illustration would cover the now-visible buttons
   (`.cta-doors` is `z-index:2`, buttons get `z-index:3` from step 1.1 —
   buttons win, doors stay visible behind them, and `.cta-doors` already has
   `pointer-events:none`). No change to `.cta-doors` is needed — verify this
   reasoning visually in step 3.

**Verify**: `grep -c "hover:hover" mockup/assets/style.css` → `1`.

### Step 2: Keep the reduced-motion fallback consistent

In the `@media (prefers-reduced-motion:reduce)` block, the line
`.cta-stage .cta-actions{opacity:1;transform:none;z-index:1}` is now mostly
redundant but harmless on touch and still needed for hover devices with
reduced motion. Update its `z-index:1` to `z-index:3` so the stacking matches
the new base rule.

**Verify**: `grep -n "cta-stage .cta-actions{opacity:1;transform:none;z-index:3}" mockup/assets/style.css` → 1 match.

### Step 3: Visual verification

Serve the site, open http://localhost:8765/index.html and
http://localhost:8765/get-involved.html#donate in a Chromium browser:

1. Desktop (mouse): buttons hidden at rest, doors knock; hovering the CTA
   swings the doors open and fades the buttons in. Same as before.
2. DevTools → toggle device emulation (e.g. iPhone profile, which makes the
   page report no hover support): the **Donate** and **Get involved**
   buttons must be fully visible without any interaction, centred inside the
   doorway, and tappable. Reload after toggling emulation — hover-capability
   media queries are evaluated at load.
3. Check both Daylight and Dusk themes (toggle in the header).
4. Confirm the always-visible CTAs on services.html / news.html / shop.html
   are unchanged.

**Verify**: all four checks pass; take it as a STOP condition if the doors
visually cover the buttons in emulation (would mean the z-index reasoning in
step 1.4 was wrong — report, don't experiment).

## Test plan

No test infrastructure exists (static prototype). The grep gates in steps
1–2 plus the four-point visual check in step 3 are the test plan. If
Playwright happens to be available, an optional smoke check is:
`npx playwright screenshot --device="iPhone 13" http://localhost:8765/index.html /tmp/cta-touch.png`
and confirm the buttons are visible in the screenshot — but do not install
anything new just for this.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -c "hover:hover" mockup/assets/style.css` → exactly 1
- [ ] `grep -n "opacity:0" mockup/assets/style.css | grep cta` → 0 matches outside the `@media (hover:hover)` block (check by line numbers)
- [ ] Visual checks in step 3 pass (desktop hover unchanged, touch emulation shows buttons)
- [ ] `git status --porcelain` shows only `mockup/assets/style.css` modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" don't match the live file (drifted).
- In touch emulation the buttons are visible but not clickable, or the doors
  render on top of them.
- The fix appears to require editing any HTML file.

## Maintenance notes

- If a third `.cta-stage` instance is added to a new page, it inherits this
  behaviour automatically — nothing to do.
- Reviewer should scrutinise: that the desktop hover choreography (delay,
  door swing sync) is unchanged, since the rules moved into a media query.
- Deferred (recorded in plans/README.md): the same hover-only pattern exists
  in milder form on `.gallery figure:hover img` zooms etc. — purely
  decorative, no action needed.
