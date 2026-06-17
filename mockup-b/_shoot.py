import sys, time
from playwright.sync_api import sync_playwright

BASE = "/home/ayub/Desktop/pulford-redesign/mockup-b"
PAGES = ["index", "about", "services", "get-involved", "contact"]

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
    for name in PAGES:
        pg.goto(f"file://{BASE}/{name}.html")
        pg.wait_for_timeout(1200)
        # force-complete reveals (smooth-scroll makes step-scrolling unreliable)
        pg.evaluate("""() => {
            document.documentElement.style.scrollBehavior = 'auto';
            document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('in'));
        }""")
        pg.wait_for_timeout(900)
        pg.screenshot(path=f"{BASE}/_shots/{name}-full.png", full_page=True)
        pg.screenshot(path=f"{BASE}/_shots/{name}-hero.png")
    b.close()
print("done")
