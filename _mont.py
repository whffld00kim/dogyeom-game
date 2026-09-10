import os, sys
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.abspath(__file__))
pid = sys.argv[1] if len(sys.argv) > 1 else "359"
d = os.path.join(ROOT, "public", "items", pid)
files = sorted([f for f in os.listdir(d) if f.endswith(".webp")], key=lambda x: int(x.split(".")[0]))
per, th = 4, 240
rows = (len(files) + per - 1) // per
mont = Image.new("RGB", (per * th, rows * th), (235, 235, 235))
dr = ImageDraw.Draw(mont)
for i, f in enumerate(files):
    im = Image.open(os.path.join(d, f)).convert("RGBA").resize((th, th), Image.LANCZOS)
    cell = Image.new("RGB", (th, th), (255, 255, 255))
    cell.paste(im, (0, 0), im)
    x, y = (i % per) * th, (i // per) * th
    mont.paste(cell, (x, y))
    n = f.split(".")[0]
    dr.rectangle([x, y, x + 24, y + 18], fill=(0, 0, 0))
    dr.text((x + 4, y + 4), n, fill=(255, 255, 0))
out = os.path.join(ROOT, f"_m_{pid}.png")
mont.save(out)
print(out, len(files), "cells")
