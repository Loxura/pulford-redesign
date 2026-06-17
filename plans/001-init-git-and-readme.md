# Plan 001: Put the redesign under git and document the repo layout

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: there is no git history yet (that is what this
> plan creates). Instead verify: `git -C /home/ayub/Desktop/pulford-redesign rev-parse --git-dir 2>/dev/null`
> must print nothing (exit non-zero). If a `.git` directory already exists,
> this plan is already done or half-done — STOP and report what you find.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: no git repo existed at planning time; planned 2026-06-11

## Why this matters

`/home/ayub/Desktop/pulford-redesign` holds an actively-iterated client pitch
prototype (a static multi-page website mockup) with **no version control at
all**. Versioning is currently done by copying whole directories
(`mockup-a-v1/`, `mockup-b/`, `mockup-c/` are frozen earlier directions;
`mockup/` is the live one). There is no way to diff, no rollback if an edit
breaks the demo before the pitch, and no commit SHA for other plans in this
directory to stamp for drift detection. Plans 004 and 005 modify images and
the design system; they are only safe to execute with git history as the
undo path, so this plan must land first.

## Current state

- `/home/ayub/Desktop/pulford-redesign/` — repo root, NOT a git repository.
  Contents (verified 2026-06-11):
  - `mockup/` — **the canonical prototype** ("Direction A·redux — Daylight,
    through the door"): 8 HTML pages, `assets/style.css`, `assets/app.js`,
    `assets/photos/` (~8.2 MB), `assets/art/`, `mockup/_shots/` (~47
    screenshot PNGs used as a design record).
  - `mockup-a-v1/`, `mockup-b/`, `mockup-c/` — frozen earlier design
    directions, kept for the client pitch ("which feels more like you?").
  - `loader/` — a shelved door-opening loader experiment (abandoned).
  - `logo/` — logo remaster working files.
  - `sitemap/` — planning material.
  - `pitch-script.md` — the 10-minute client pitch script.
  - `plans/` — these plan files.
- No `README.md`, no `.gitignore`, no `package.json` anywhere. There is no
  build system; pages are opened directly (file:// or any static server).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Confirm no repo | `git -C /home/ayub/Desktop/pulford-redesign rev-parse --git-dir` | non-zero exit, error message |
| Serve a page (manual check) | `cd /home/ayub/Desktop/pulford-redesign/mockup && python3 -m http.server 8765` | site at http://localhost:8765 |

There are no build/test/lint commands in this repo — verification is git
status output and opening pages in a browser.

## Scope

**In scope** (the only files you should create/modify):
- `.git/` (created by `git init`)
- `/home/ayub/Desktop/pulford-redesign/.gitignore` (create)
- `/home/ayub/Desktop/pulford-redesign/README.md` (create)

**Out of scope** (do NOT touch):
- Any file inside `mockup/`, `mockup-a-v1/`, `mockup-b/`, `mockup-c/`,
  `loader/`, `logo/`, `sitemap/` — this plan adds version control, it does
  not change the prototype.
- `pitch-script.md`.

## Git workflow

This plan creates the repo. Work directly on the default branch (`main`) —
there is nothing to branch from yet. Two commits, messages given in the steps.

## Steps

### Step 1: Initialize the repository

```bash
cd /home/ayub/Desktop/pulford-redesign
git init -b main
```

**Verify**: `git rev-parse --abbrev-ref HEAD` → prints `main`.

### Step 2: Create `.gitignore`

Create `/home/ayub/Desktop/pulford-redesign/.gitignore` with exactly:

```
# OS noise
.DS_Store
Thumbs.db

# editor
*.swp
.idea/
.vscode/

# scratch node installs (used by image-optimization tooling, plan 004)
node_modules/
package-lock.json
```

Note: `mockup/_shots/` (screenshots) IS tracked deliberately — it is the
design record and has no other backup. Do not ignore it.

**Verify**: `git check-ignore -q node_modules && echo ignored` → prints `ignored`.

### Step 3: Create `README.md`

Create `/home/ayub/Desktop/pulford-redesign/README.md` with this content
(adjust nothing else):

```markdown
# Pulford Redesign

Design prototypes for the Pulford Community Living Services website redesign
(pulford.ca). Static HTML/CSS/JS — no build step. Open any page directly or
serve with `python3 -m http.server` from a mockup directory.

## Layout

| Path | What it is |
|---|---|
| `mockup/` | **Canonical prototype** — Direction A·redux, "Daylight, through the door". This is what gets pitched and iterated. |
| `mockup/cms.html` | Concept CMS ("Pulford Studio") — TipTap editor loaded from esm.sh CDN. |
| `mockup/_shots/` | Screenshot record of design iterations. |
| `mockup-a-v1/`, `mockup-b/`, `mockup-c/` | Frozen earlier directions, kept for the pitch comparison. Do not edit. |
| `loader/` | Shelved door-opening loader experiment. Do not revive without asking. |
| `logo/` | Logo remaster working files. |
| `sitemap/` | IA planning material. |
| `pitch-script.md` | The 10-minute client pitch script. |
| `plans/` | Implementation plans for agents (see `plans/README.md`). |

## Conventions

- Theme: light/dark ("Daylight/Dusk") via `data-theme` on `<html>`, persisted
  in `localStorage('pf-theme')`, applied by an inline head script on every page.
- All styling lives in `mockup/assets/style.css` (design tokens at the top);
  shared behaviour in `mockup/assets/app.js`; page-specific scripts inline.
- The header/footer markup is duplicated in all 8 pages — a change to either
  must be applied to every page.
```

**Verify**: `test -s README.md && head -1 README.md` → prints `# Pulford Redesign`.

### Step 4: Initial commit

```bash
cd /home/ayub/Desktop/pulford-redesign
git add -A
git commit -m "Initial commit: Pulford redesign prototypes and plans"
```

**Verify**: `git status --porcelain` → empty output; `git log --oneline` →
exactly one commit.

### Step 5: Stamp the other plans

Replace the placeholder planned-at line in each other plan file under
`plans/` — the line beginning `- **Planned at**:` — so it reads:

```
- **Planned at**: commit `<short SHA of the initial commit>`, 2026-06-11
```

Get the SHA with `git rev-parse --short HEAD`. Then commit:

```bash
git add plans && git commit -m "Stamp plans with baseline commit"
```

**Verify**: `grep -L "Planned at\*\*: commit" plans/0*.md` → prints nothing
(every plan file now has a commit stamp).

## Test plan

No automated tests exist or are needed. Verification is the git commands
above plus one manual check: open `mockup/index.html` in a browser and
confirm the site still renders (this plan must not have touched it).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git -C /home/ayub/Desktop/pulford-redesign log --oneline | wc -l` ≥ 2
- [ ] `git status --porcelain` → empty
- [ ] `test -f README.md && test -f .gitignore` → exit 0
- [ ] `git diff HEAD~1 --stat -- mockup/ mockup-b/ mockup-c/ mockup-a-v1/` between the two commits shows no prototype files changed
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- A `.git` directory already exists anywhere under `/home/ayub/Desktop/pulford-redesign`.
- `git add -A` stages more than ~250 files or > 100 MB total — the directory
  may contain something large/unexpected the advisor didn't inventory.
- Any step's verification fails twice.

## Maintenance notes

- Future plans (004, 005) rely on git history as the undo mechanism for
  image re-encoding and palette changes — never run them on an uncommitted tree.
- If the user later wants a remote (GitHub), that is a separate decision —
  do not push anywhere.
