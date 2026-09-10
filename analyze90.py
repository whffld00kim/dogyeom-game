# -*- coding: utf-8 -*-
import os, sys
from PIL import Image, ImageDraw, ImageFont
sys.stdout.reconfigure(errors="replace")

PUB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")
files = sorted(f for f in os.listdir(PUB) if f.startswith("Gemini_Generated_Image") and f.lower().endswith(".png"))
print(f"대상 {len(files)}장")

def corners(img):
    w, h = img.size
    pts = [(2,2),(w-3,2),(2,h-3),(w-3,h-3)]
    return [img.getpixel(p) for p in pts]

cell = 300
cols, rows = 5, (len(files)+4)//5
mont = Image.new("RGB", (cols*cell, rows*cell), (40,40,48))
# 투명 영역이 보이도록 체커보드 배경
for by in range(0, mont.height, 20):
    for bx in range(0, mont.width, 20):
        if (bx//20 + by//20) % 2 == 0:
            for yy in range(by, min(by+20, mont.height)):
                for xx in range(bx, min(bx+20, mont.width)):
                    mont.putpixel((xx, yy), (70,70,80))
draw = ImageDraw.Draw(mont)

for i, f in enumerate(files):
    img = Image.open(os.path.join(PUB, f))
    mode = img.mode
    img2 = img.convert("RGBA")
    a = img2.getchannel("A")
    amin, amax = a.getextrema()
    transp = sum(a.histogram()[0:16]) / float(img.width*img.height)
    cc = corners(img2)
    print(f"[{i}] {f}  {img.size} mode={mode} alpha[{amin}-{amax}] 투명율={transp:.2f}")
    print(f"     코너색: {cc}")
    # 썸네일
    t = img2.copy(); t.thumbnail((cell-16, cell-40))
    cx, cy = (i%cols)*cell, (i//cols)*cell
    mont.paste(t.convert("RGB"), (cx+8, cy+8), t)
    draw.rectangle([cx+2, cy+2, cx+cell-2, cy+cell-2], outline=(255,220,90), width=2)
    draw.text((cx+8, cy+cell-28), f"[{i}]", fill=(255,255,120))

out = os.path.join(PUB, "_montage90.png")
mont.save(out)
print("몽타주:", out)
