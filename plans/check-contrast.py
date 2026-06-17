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
             sky='#A7CCE8', clay='#DC6B3F', clay_deep='#A8431F', moss='#8FB47C',
             cream='#FAF3E4', spruce='#22372E')
DARK  = dict(paper='#121E18', ink='#F1E9D6', marigold='#E8A23B',
             sky='#8FB8DA', clay='#D2693F', clay_deep='#9E3F1E', moss='#8FB47C',
             cream='#FAF3E4', spruce='#22372E')

# (name, fg_token, fg_alpha, bg_token, min_ratio) — alpha blends fg into bg
PAIRS = [
    ('cta body (cream on clay-deep)',   'cream',  0.88, 'clay_deep', 4.5),
    ('door-card.d-clay p',              'cream',  0.92, 'clay_deep', 4.5),
    ('door-card p on moss',             'spruce', 0.92, 'moss',     4.5),
    ('room-card p on moss',             'spruce', 0.92, 'moss',     4.5),
    ('stat label on marigold',          'spruce', 0.92, 'marigold', 4.5),
    ('promo-kicker on marigold',        'spruce', 0.92, 'marigold', 4.5),
    ('promo-sub on marigold',           'spruce', 0.92, 'marigold', 4.5),
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
