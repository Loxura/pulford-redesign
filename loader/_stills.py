import os
from playwright.sync_api import sync_playwright
url = "file://"+os.path.abspath("index.html")
shots=[(600,"A-word"),(1500,"B-crack"),(2050,"C-swing"),(2600,"D-open"),(3600,"E-site")]
with sync_playwright() as p:
    b=p.chromium.launch()
    for ms,name in shots:
        pg=b.new_page(viewport={"width":1280,"height":800},device_scale_factor=2)
        pg.goto(url); pg.wait_for_timeout(ms)
        pg.screenshot(path=f"stills/{name}.png"); pg.close()
    b.close()
print("done")
