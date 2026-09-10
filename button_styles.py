# -*- coding: utf-8 -*-
"""버튼 스타일 4종 비교: 광택 / 반투명채움 / 단색+테두리 / 은은한그라데이션. 같은 배경(타이틀)에서 버튼부만 크롭해 세로 비교.
출력 미리보기_버튼스타일.png"""
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
GREEN, BLUE = (124, 198, 62), (108, 140, 255)


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


def rmask(w, h, r):
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), r, fill=255)
    return m


def draw_gear(d, cx, cy, R, hole):
    n = 32
    pts = [(cx + math.cos(i / n * 2 * math.pi) * (R if i % 4 < 2 else R * 0.72),
            cy + math.sin(i / n * 2 * math.pi) * (R if i % 4 < 2 else R * 0.72)) for i in range(n)]
    d.polygon(pts, fill=(255, 255, 255, 255))
    d.ellipse((cx - R * 0.4, cy - R * 0.4, cx + R * 0.4, cy + R * 0.4), fill=hole + (255,))


def btn(img, cx, cy, w, h, color, text, fs, style, icon=None):
    radius = min(h // 2, 28)
    pad = 4
    lay = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    ox = oy = pad
    mask = rmask(w, h, radius)
    if style == "trans":                      # ② 반투명 채움(82%)
        lay.paste(Image.new("RGBA", (w, h), color + (209,)), (ox, oy), mask)
    elif style == "solid":                    # ③ 옅은 단색
        lay.paste(Image.new("RGBA", (w, h), lighten(color, 1.10) + (255,)), (ox, oy), mask)
    elif style == "grad":                     # ④ 은은한 그라데이션
        lay.paste(vgrad(w, h, lighten(color, 1.14), darken(color, 0.92)), (ox, oy), mask)
    else:                                     # ① 현재(광택)
        lay.paste(Image.new("RGBA", (w, h), color + (255,)), (ox, oy), mask)
        gl = Image.new("RGBA", (w - 10, int(h * 0.44)), (255, 255, 255, 76))
        gm = rmask(w - 10, int(h * 0.44), max(2, radius - 4))
        lay.paste(gl, (ox + 5, oy + 4), gm)
    d.rounded_rectangle((ox, oy, ox + w - 1, oy + h - 1), radius, outline=(255, 255, 255, 235), width=3)
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


def row(style):
    bg = Image.open(os.path.join(PUB, "bg", "main.webp")).convert("RGB").resize((W, H), Image.LANCZOS).convert("RGBA")
    btn(bg, W / 2, 580, 340, 96, GREEN, "▶  시작하기", 40, style)
    btn(bg, W / 2, 670, 240, 64, BLUE, "설정", 30, style, icon="gear")
    return bg.convert("RGB").crop(BOX)


def main():
    SC = 1.35
    rows = [("① 현재 (광택)", "gloss"),
            ("② 반투명 채움 (제안하신 방식)", "trans"),
            ("③ 단색(옅게) + 흰 테두리", "solid"),
            ("④ 은은한 그라데이션 + 테두리", "grad")]
    imgs = [(lbl, row(st).resize((int((BOX[2] - BOX[0]) * SC), int((BOX[3] - BOX[1]) * SC)), Image.LANCZOS)) for lbl, st in rows]
    Wd = imgs[0][1].width
    BAR = 48
    rh = imgs[0][1].height
    canvas = Image.new("RGB", (Wd, len(imgs) * (BAR + rh) + 8), (240, 243, 248))
    d = ImageDraw.Draw(canvas)
    y = 0
    for lbl, im in imgs:
        d.text((Wd / 2, y + BAR / 2), lbl, font=font(28), fill=(43, 58, 103), anchor="mm")
        canvas.paste(im, (0, y + BAR))
        y += BAR + rh
    canvas.save(os.path.join(ROOT, "_button_styles.png"))
    for p in (os.path.join(DESK, "미리보기_버튼스타일.png"), os.path.join(APK, "button_styles.png")):
        try:
            canvas.save(p)
        except Exception as e:
            print("save skip", p, e)
    print("저장: 미리보기_버튼스타일.png")


if __name__ == "__main__":
    main()
