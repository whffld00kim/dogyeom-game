# -*- coding: utf-8 -*-
"""메인(Title) 화면 미리보기: 새 메인 배경 + 정지 주인공 + 제목 + 버튼. 출력 _title.png (1280x720)."""
import os, sys, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter
sys.stdout.reconfigure(errors="replace")
ROOT = os.path.dirname(os.path.abspath(__file__))
W, H = 1280, 720
NOGLOSS = bool(os.environ.get("NOGLOSS"))  # 환경변수로 광택 끄기(비교용)


def font(sz, bold=True):
    for p in (os.path.join(ROOT, "public/fonts/Jua-Regular.ttf"), "C:/Windows/Fonts/malgunbd.ttf"):
        try:
            return ImageFont.truetype(p, sz)
        except Exception:
            continue
    return ImageFont.load_default()


def rmask(w, h, r):
    m = Image.new("L", (w, h), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), r, fill=255); return m


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


def draw_gear(d, cx, cy, R, holecolor):
    """게임(widgets.ts drawGear)과 동일한 톱니바퀴: 톱니 8개, 흰색, 가운데 구멍은 버튼색."""
    n = 32
    pts = []
    for i in range(n):
        ang = i / n * 2 * math.pi
        rr = R if i % 4 < 2 else R * 0.72
        pts.append((cx + math.cos(ang) * rr, cy + math.sin(ang) * rr))
    d.polygon(pts, fill=(255, 255, 255, 255))
    d.ellipse((cx - R * 0.4, cy - R * 0.4, cx + R * 0.4, cy + R * 0.4), fill=holecolor + (255,))


def btn(img, cx, cy, w, h, c, label, fs, icon=False):
    """④ 은은한 세로 그라데이션 + 흰 테두리 (게임 makeButton 캔버스와 동일). ▶는 삼각형, ⚙는 톱니바퀴 벡터."""
    x0, y0 = int(cx - w / 2), int(cy - h / 2)
    r = h // 2
    img.paste(vgrad(w, h, lighten(c, 1.14), darken(c, 0.93)), (x0, y0), rmask(w, h, r))
    ov = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(ov).rounded_rectangle((0, 0, w - 1, h - 1), r, outline=(255, 255, 255, 127), width=2)
    img.alpha_composite(ov, (x0, y0))
    d = ImageDraw.Draw(img)
    text = label.replace("▶", "").strip()
    if icon:  # ⚙ + 텍스트
        iconR, gap = fs * 0.46, fs * 0.34
        tw = d.textlength(text, font=font(fs))
        tx = cx + (iconR * 2 + gap) / 2
        draw_gear(d, tx - tw / 2 - gap - iconR, cy, iconR, c)
        d.text((tx, cy), text, font=font(fs), fill=(255, 255, 255, 255), anchor="mm")
    elif "▶" in label:  # ▶ 삼각형 + 텍스트
        s = fs * 0.9
        triW, gap = s * 0.74, fs * 0.3
        tw = d.textlength(text, font=font(fs))
        sx = cx - (triW + gap + tw) / 2
        tcx = sx + triW / 2
        d.polygon([(tcx - s * 0.32, cy - s * 0.5), (tcx - s * 0.32, cy + s * 0.5), (tcx + s * 0.42, cy)], fill=(255, 255, 255, 255))
        d.text((sx + triW + gap, cy), text, font=font(fs), fill=(255, 255, 255, 255), anchor="lm")
    else:
        d.text((cx, cy), label, font=font(fs), fill=(255, 255, 255, 255), anchor="mm")


def main():
    img = Image.open(os.path.join(ROOT, "public/bg/main.webp")).convert("RGB").resize((W, H), Image.LANCZOS).convert("RGBA")
    # 주인공(정지) — public/ash.png 크롭본을 350(최대변)으로
    ash = Image.open(os.path.join(ROOT, "public/ash.png")).convert("RGBA")
    s = 280 / max(ash.size)
    ash2 = ash.resize((int(ash.width * s), int(ash.height * s)), Image.LANCZOS)
    img.paste(ash2, (640 - ash2.width // 2, 380 - ash2.height // 2), ash2)
    # 제목
    d = ImageDraw.Draw(img)
    d.text((W / 2, 120), "도겸이의", font=font(40), fill=(43, 58, 103, 255), anchor="mm")
    d.text((W / 2, 192), "포켓몬 수학모험", font=font(76), fill=(43, 58, 103, 255), anchor="mm")
    # 버튼
    btn(img, W / 2, 580, 340, 96, (124, 198, 62), "▶ 시작하기", 40)
    btn(img, W / 2, 670, 240, 64, (106, 140, 245), "설정", 30, icon=True)
    d = ImageDraw.Draw(img)
    d.text((18, H - 16), "v56", font=font(22), fill=(43, 58, 103, 200), anchor="lm")
    out = "_title_noglow.png" if NOGLOSS else "_title.png"
    img.convert("RGB").save(os.path.join(ROOT, out))
    print("저장:", out)


if __name__ == "__main__":
    main()
