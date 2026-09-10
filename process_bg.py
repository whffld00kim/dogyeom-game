# 지역 배틀 배경: public/{지역}.png → public/bg/r{지역인덱스}.webp (WebP 압축, ASCII 파일명).
# 원본 PNG는 public 밖(bg_src/)으로 이동(번들 제외). 표시는 게임에서 cover-fit.
import os
import shutil
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(ROOT, "public")
BG = os.path.join(PUB, "bg")
SRC = os.path.join(ROOT, "bg_src")  # 원본 보관(번들X, gitignore)

REGIONS = ['관동', '성도', '호연', '신오', '하나', '칼로스', '알로라', '가라르', '팔데아']

os.makedirs(BG, exist_ok=True)
os.makedirs(SRC, exist_ok=True)

for i, name in enumerate(REGIONS):
    src = None
    for ext in ['.png', '.jpg', '.jpeg', '.webp']:
        p = os.path.join(PUB, name + ext)
        if os.path.exists(p):
            src = p
            break
    if not src:
        print(f"{name}: NOT FOUND (건너뜀)")
        continue
    im = Image.open(src).convert("RGB")
    out = os.path.join(BG, f"r{i}.webp")
    im.save(out, "WEBP", quality=85, method=6)
    shutil.move(src, os.path.join(SRC, os.path.basename(src)))
    print(f"{name}({im.width}x{im.height}) -> bg/r{i}.webp  {os.path.getsize(out)//1024}KB  (원본 이동)")

print("done")
