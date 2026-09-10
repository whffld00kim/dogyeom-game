# -*- coding: utf-8 -*-
"""_title.png(광택 있음) vs _title_noglow.png(광택 없음) 버튼부를 확대해 위아래로 비교. 출력 미리보기_광택비교.png"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
try:
    sys.stdout.reconfigure(errors="replace")
except Exception:
    pass
ROOT = os.path.dirname(os.path.abspath(__file__))
DESK = os.path.join(os.path.expanduser("~"), "Desktop")
APK = r"C:\Users\Public\apkserve"


def font(sz):
    try:
        return ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", sz)
    except Exception:
        return ImageFont.load_default()


BOX = (380, 525, 900, 712)   # 시작하기 + 설정 버튼 영역
SC = 1.7
BAR = 52
g = Image.open(os.path.join(ROOT, "_title.png")).convert("RGB").crop(BOX)
n = Image.open(os.path.join(ROOT, "_title_noglow.png")).convert("RGB").crop(BOX)
g = g.resize((int(g.width * SC), int(g.height * SC)), Image.LANCZOS)
n = n.resize((int(n.width * SC), int(n.height * SC)), Image.LANCZOS)
Wd = g.width
canvas = Image.new("RGB", (Wd, BAR + g.height + BAR + n.height + 8), (240, 243, 248))
d = ImageDraw.Draw(canvas)
d.text((Wd / 2, BAR / 2), "광택 있음 (지금)", font=font(30), fill=(43, 58, 103), anchor="mm")
canvas.paste(g, (0, BAR))
y2 = BAR + g.height + 8
d.text((Wd / 2, y2 + BAR / 2), "광택 없음", font=font(30), fill=(43, 58, 103), anchor="mm")
canvas.paste(n, (0, y2 + BAR))
canvas.save(os.path.join(ROOT, "_gloss_compare.png"))
for p in (os.path.join(DESK, "미리보기_광택비교.png"), os.path.join(APK, "gloss_compare.png")):
    try:
        canvas.save(p)
    except Exception as e:
        print("save skip", p, e)
print("저장: 미리보기_광택비교.png")
