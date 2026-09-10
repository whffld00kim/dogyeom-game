# -*- coding: utf-8 -*-
"""입체(젤리/캔디) 버튼 예상 효과 미리보기: 세로 그라데이션 본체 + 흐려지는 광택 + 아랫면 반사 + 흰테두리.
지금(광택) vs 제안(입체) 버튼부를 위아래로 비교. 출력 미리보기_입체버튼비교.png"""
import os, sys, math
from PIL import Image, ImageDraw, ImageFont
try:
    sys.stdout.reconfigure(errors="replace")
except Exception:
    pass
ROOT = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(ROOT, "public")
DESK = os.path.join(os.path.expanduser("~"), "Desktop")
APK = r"C:\Users\Public\apkserve"
W, H = 1280, 720
BOX = (380, 525, 900, 712)


def font(sz):
    try:
        return ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", sz)
    except Exception:
        return ImageFont.load_default()


def lighten(c, f):
    return tuple(min(255, int(c[i] * f)) for i in range(3))


def darken(c, f):
    return tuple(int(c[i] * f) for i in range(3))


def vgrad(w, h, top, bottom):
    g = Image.new("RGB", (1, h))
    for y in range(h):
        t = y / max(1, h - 1)
        g.putpixel((0, y), tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return g.resize((w, h)).convert("RGBA")


def vwhite(w, h, top_a, bot_a, radius):
    """위→아래 알파가 변하는 흰색 레이어(둥근 마스크 적용)."""
    a = Image.new("L", (1, h))
    for y in range(h):
        t = y / max(1, h - 1)
        a.putpixel((0, y), int(top_a + (bot_a - top_a) * t))
    a = a.resize((w, h))
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), radius, fill=255)
    img = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    img.putalpha(Image.composite(a, Image.new("L", (w, h), 0), m))
    return img


def draw_gear(d, cx, cy, R, hole):
    n = 32
    pts = [(cx + math.cos(i / n * 2 * math.pi) * (R if i % 4 < 2 else R * 0.72),
            cy + math.sin(i / n * 2 * math.pi) * (R if i % 4 < 2 else R * 0.72)) for i in range(n)]
    d.polygon(pts, fill=(255, 255, 255, 255))
    d.ellipse((cx - R * 0.4, cy - R * 0.4, cx + R * 0.4, cy + R * 0.4), fill=hole + (255,))


def candy_btn(img, cx, cy, w, h, color, text, fs, icon=None):
    radius = min(h // 2, 28)
    pad = 4
    lay = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    ox = oy = pad
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), radius, fill=255)
    # 1) 본체 세로 그라데이션(위 밝게 → 아래 진하게)
    lay.paste(vgrad(w, h, lighten(color, 1.16), darken(color, 0.80)), (ox, oy), mask)
    # 2) 윗부분 광택(위 강 → 아래로 사라짐)
    gh = int(h * 0.55)
    lay.alpha_composite(vwhite(w - 12, gh, 165, 0, max(2, radius - 5)), (ox + 6, oy + 3))
    # 3) 아랫면 반사광(맨 아래로 갈수록 밝게)
    rh = int(h * 0.30)
    lay.alpha_composite(vwhite(w - 16, rh, 0, 80, max(2, radius - 7)), (ox + 8, oy + h - rh - 3))
    # 4) 흰 테두리
    d.rounded_rectangle((ox, oy, ox + w - 1, oy + h - 1), radius, outline=(255, 255, 255, 225), width=3)
    # 텍스트 / 기어
    cxl, cyl = ox + w / 2, oy + h / 2
    if icon == "gear":
        iconR, gap = fs * 0.46, fs * 0.34
        tw = d.textlength(text, font=font(fs))
        tx = cxl + (iconR * 2 + gap) / 2
        draw_gear(d, tx - tw / 2 - gap - iconR, cyl, iconR, color)
        d.text((tx, cyl), text, font=font(fs), fill=(255, 255, 255, 255), anchor="mm")
    else:
        d.text((cxl, cyl), text, font=font(fs), fill=(255, 255, 255, 255), anchor="mm")
    img.alpha_composite(lay, (int(cx - w / 2 - pad), int(cy - h / 2 - pad)))


def main():
    # 후보(입체) 버튼을 메인 배경에 그려서 버튼부만 크롭
    bg = Image.open(os.path.join(PUB, "bg", "main.webp")).convert("RGB").resize((W, H), Image.LANCZOS).convert("RGBA")
    candy_btn(bg, W / 2, 580, 340, 96, (124, 198, 62), "▶  시작하기", 40)
    candy_btn(bg, W / 2, 670, 240, 64, (108, 140, 255), "설정", 30, icon="gear")
    cand = bg.convert("RGB").crop(BOX)
    cur = Image.open(os.path.join(ROOT, "_title.png")).convert("RGB").crop(BOX)
    SC = 1.7
    cur = cur.resize((int(cur.width * SC), int(cur.height * SC)), Image.LANCZOS)
    cand = cand.resize((int(cand.width * SC), int(cand.height * SC)), Image.LANCZOS)
    Wd, BAR = cur.width, 52
    canvas = Image.new("RGB", (Wd, BAR + cur.height + BAR + cand.height + 8), (240, 243, 248))
    d = ImageDraw.Draw(canvas)
    d.text((Wd / 2, BAR / 2), "지금 (납작한 광택)", font=font(30), fill=(43, 58, 103), anchor="mm")
    canvas.paste(cur, (0, BAR))
    y2 = BAR + cur.height + 8
    d.text((Wd / 2, y2 + BAR / 2), "제안 (입체 젤리 버튼)", font=font(30), fill=(43, 58, 103), anchor="mm")
    canvas.paste(cand, (0, y2 + BAR))
    canvas.save(os.path.join(ROOT, "_candy_compare.png"))
    for p in (os.path.join(DESK, "미리보기_입체버튼비교.png"), os.path.join(APK, "candy_compare.png")):
        try:
            canvas.save(p)
        except Exception as e:
            print("save skip", p, e)
    print("저장: 미리보기_입체버튼비교.png")


if __name__ == "__main__":
    main()
