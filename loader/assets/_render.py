from playwright.sync_api import sync_playwright
html = """
<html><body style="margin:0;background:#000;display:flex;gap:24px;padding:30px;align-items:center;justify-content:center">
<img src="doors.svg" style="height:300px">
<img src="community.svg" style="height:240px">
<img src="kid.svg" style="height:300px">
</body></html>
"""
open("_preview.html","w").write(html)
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width":1100,"height":420})
    pg.goto("file://"+__import__("os").path.abspath("_preview.html"))
    pg.wait_for_timeout(300)
    pg.screenshot(path="check-all.png")
    b.close()
print("done")
