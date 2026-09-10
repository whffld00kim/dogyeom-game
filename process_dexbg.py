# 도감 배경: public/도감.png → public/bg/dex.webp (WebP 압축). 원본은 bg_src/로 이동.
import os
import shutil
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(ROOT, "public")
BG = os.path.join(PUB, "bg")
SRC = os.path.join(ROOT, "bg_src")
os.makedirs(BG, exist_ok=True)
os.makedirs(SRC, exist_ok=True)

src = None
for ext in ['.png', '.jpg', '.jpeg', '.webp']:
    p = os.path.join(PUB, '도감' + ext)
    if os.path.exists(p):
        src = p
        break
if not src:
    print('도감 파일 없음')
else:
    im = Image.open(src).convert("RGB")
    out = os.path.join(BG, "dex.webp")
    im.save(out, "WEBP", quality=85, method=6)
    shutil.move(src, os.path.join(SRC, os.path.basename(src)))
    print(f"도감({im.width}x{im.height}) -> bg/dex.webp  {os.path.getsize(out)//1024}KB  (원본 이동)")
