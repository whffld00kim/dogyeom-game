# -*- coding: utf-8 -*-
"""메인 화면에 청키 글로시 3D 알약 버튼(시작하기/설정)을 입힌 미리보기. 전체 + 버튼 확대.
출력 미리보기_3D버튼.png / 미리보기_3D버튼_확대.png"""
import os, sys, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter
try:
    sys.stdout.reconfigure(errors="replace")
except Exception:
    pass
ROOT = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(ROOT, "public")
DESK = os.path.join(os.path.expanduser("~"), "Desktop")
APK = r"C:\Users\Public\apkserve"
W, H = 1280, 720
DARK = (43, 58, 103)


def font(sz):
    for p in (os.path.join(PUB, "fonts", "Jua-Regular.ttf"), "C:/Windows/Fonts/malgunbd.ttf"):
        try:
            return ImageFont.truetype(p, sz)
        except Exception:
            continue
    return ImageFont.load_default()


def efont(sz):
    return ImageFont.truetype("C:/Windows/Fonts/seguiemj.ttf", sz)


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


def vfade(w, h, top_a, bot_a, color, radius):
    a = Image.new("L", (1, h))
    for y in range(h):
        t = y / max(1, h - 1)
        a.putpixel((0, y), int(top_a + (bot_a - top_a) * t))
    a = a.resize((w, h))
    img = Image.new("RGBA", (w, h), color + (0,))
    img.putalpha(Image.composite(a, Image.new("L", (w, h), 0), rmask(w, h, radius)))
    return img


def draw_gear(d, cx, cy, R, hole):
    n = 32
    pts = [(cx + math.cos(i / n * 2 * math.pi) * (R if i % 4 < 2 else R * 0.72),
            cy + math.sin(i / n * 2 * math.pi) * (R if i % 4 < 2 else R * 0.72)) for i in range(n)]
    d.polygon(pts, fill=(255, 255, 255, 255))
    d.ellipse((cx - R * 0.4, cy - R * 0.4, cx + R * 0.4, cy + R * 0.4), fill=hole + (255,))


def glossy3d(img, cx, cy, w, h, top_c, bot_c, text, fs, icon):
    radius = h // 2
    lip_c = darken(bot_c, 0.72)        # 바닥 입술(0 8px 0 진한색)
    bord_c = darken(bot_c, 0.60)       # 진한 테두리
    PX, PT, PB = 30, 26, 44
    lay = Image.new("RGBA", (w + PX * 2, h + PT + PB), (0, 0, 0, 0))
    ox, oy = PX, PT
    # 1) 부드러운 드롭섀도 (0 12px 20px rgba(0,0,0,.25))
    sh = Image.new("RGBA", lay.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((ox, oy + 13, ox + w, oy + 13 + h), radius, fill=(0, 0, 0, 72))
    lay.alpha_composite(sh.filter(ImageFilter.GaussianBlur(9)))
    d = ImageDraw.Draw(lay)
    # 2) 바닥 입술
    d.rounded_rectangle((ox, oy + 8, ox + w, oy + 8 + h), radius, fill=lip_c + (255,))
    # 3) 본체 그라데이션
    lay.paste(vgrad(w, h, top_c, bot_c), (ox, oy), rmask(w, h, radius))
    # 4) 윗부분 광택(::before)
    gh = int(h * 0.52)
    lay.alpha_composite(vfade(w - 16, gh, 170, 0, (255, 255, 255), max(2, radius - 7)), (ox + 8, oy + 5))
    # 5) 안쪽 바닥 음영(inset 느낌)
    bh = int(h * 0.30)
    lay.alpha_composite(vfade(w - 14, bh, 0, 45, (0, 0, 0), max(2, radius - 6)), (ox + 7, oy + h - bh - 3))
    # 6) 진한 테두리(살짝 안쪽)
    d.rounded_rectangle((ox + 1, oy + 1, ox + w - 2, oy + h - 2), radius - 1, outline=bord_c + (235,), width=3)
    # 7) 아이콘 + 텍스트(가로 배치) — 흰색 + 다크 그림자
    f = font(fs)
    tw = d.textlength(text, font=f)
    iconW = fs * 1.05
    gap = fs * 0.34
    total = iconW + gap + tw
    sx = ox + w / 2 - total / 2
    cyb = oy + h / 2
    icx = sx + iconW / 2
    if icon == "play":
        s = fs * 0.92
        d.polygon([(icx - s * 0.36, cyb - s * 0.58), (icx - s * 0.36, cyb + s * 0.58), (icx + s * 0.62, cyb)],
                  fill=(255, 255, 255, 255))
    elif icon == "gear":
        draw_gear(d, icx, cyb, fs * 0.62, bot_c)
    tx = sx + iconW + gap
    d.text((tx, cyb + 2), text, font=f, fill=darken(bot_c, 0.45) + (190,), anchor="lm")  # 다크 그림자
    d.text((tx, cyb), text, font=f, fill=(255, 255, 255, 255), anchor="lm")
    img.alpha_composite(lay, (int(cx - w / 2 - PX), int(cy - h / 2 - PT)))


def coin(img, xr, y):
    ov = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(ov).rounded_rectangle((xr - 100, y - 27, xr + 16, y + 27), 27, fill=(0, 0, 0, 107))
    img.alpha_composite(ov)
    try:
        ImageDraw.Draw(img).text((xr - 96, y), "🪙", font=efont(28), embedded_color=True, anchor="lm")
    except Exception:
        pass
    ImageDraw.Draw(img).text((xr, y), "71", font=font(28), fill=(255, 233, 168, 255), anchor="rm",
                             stroke_width=4, stroke_fill=(43, 32, 24, 255))


def main():
    bg = Image.open(os.path.join(PUB, "bg", "main.webp")).convert("RGB").resize((W, H), Image.LANCZOS).convert("RGBA")
    ash = Image.open(os.path.join(PUB, "ash.png")).convert("RGBA")
    s = 280 / max(ash.size)
    ash2 = ash.resize((int(ash.width * s), int(ash.height * s)), Image.LANCZOS)
    bg.alpha_composite(ash2, (640 - ash2.width // 2, 380 - ash2.height // 2))
    d = ImageDraw.Draw(bg)
    d.text((W / 2, 120), "도겸이의", font=font(40), fill=DARK + (255,), anchor="mm")
    d.text((W / 2, 192), "포켓몬 수학모험", font=font(76), fill=DARK + (255,), anchor="mm")
    coin(bg, 1240, 46)
    # 청키 3D 버튼
    glossy3d(bg, W / 2, 576, 372, 100, (143, 214, 74), (95, 181, 46), "시작하기", 42, "play")
    glossy3d(bg, W / 2, 676, 240, 70, (111, 184, 245), (63, 143, 224), "설정", 30, "gear")
    out = bg.convert("RGB")
    out.save(os.path.join(ROOT, "_glossy3d.png"))
    crop = out.crop((360, 505, 920, 720)).resize((560 * 2, 215 * 2), Image.LANCZOS)
    crop.save(os.path.join(ROOT, "_glossy3d_zoom.png"))
    for nm, im in [("미리보기_3D버튼.png", out), ("미리보기_3D버튼_확대.png", crop)]:
        try:
            im.save(os.path.join(DESK, nm))
        except Exception as e:
            print("save skip", nm, e)
    try:
        out.save(os.path.join(APK, "glossy3d.png"))
        crop.save(os.path.join(APK, "glossy3d_zoom.png"))
    except Exception as e:
        print("apk skip", e)
    print("저장: 미리보기_3D버튼.png / _확대.png")


if __name__ == "__main__":
    main()
