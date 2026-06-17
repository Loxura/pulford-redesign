# Pulford Redesign

Design prototypes for the Pulford Community Living Services website redesign
(pulford.ca). Static HTML/CSS/JS — no build step. Open any page directly or
serve with `python3 -m http.server` from a mockup directory.

## Layout

| Path | What it is |
|---|---|
| `mockup/` | **Canonical prototype** — Direction A·redux, "Daylight, through the door". This is what gets pitched and iterated. 11 HTML pages. |
| `mockup/index.html` `about.html` `services.html` `news.html` `contact.html` `get-involved.html` | Core public site. |
| `mockup/shop.html` `product.html` `rentals.html` | Concept ecommerce/rentals storefront (product detail + rentals listing). |
| `mockup/article.html` | Public article page — the story the CMS demo publishes (closes the publish→live pitch loop). |
| `mockup/cms.html` | Concept CMS ("Pulford Studio") — TipTap editor, vendored locally (see plan 003). |
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
- Fonts are self-hosted under `mockup/assets/fonts/` and the CMS editor is
  vendored at `mockup/assets/vendor/tiptap.js` — the demo runs fully offline.
- The header/footer markup is duplicated in all 11 pages — a change to either
  must be applied to every page.
- Photos under `mockup/assets/photos/` follow a ≤1600px longest-side, JPEG q80
  recipe; below-the-fold images use `loading="lazy"`.
