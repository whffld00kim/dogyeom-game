# -*- coding: utf-8 -*-
"""새 도감 UI 미리보기 (실제 DexScene 좌표에 정확히 정렬).
탭폭123/pitch131/startX116, 헤더y178, 그리드 topY236 cellW196 cellH110 startX150 스프라이트72. 출력 _newui.png."""
import os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
sys.stdout.reconfigure(errors="replace")

ROOT = os.path.dirname(os.path.abspath(__file__))
SPR = os.path.join(ROOT, "public", "sprites")
BGSRC = r"C:\Users\김민성\Downloads\Gemini_Generated_Image_bkz9ltbkz9ltbkz9.png"
W, H = 1280, 720


def font(sz, bold=True):
    try:
        return ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf" if bold else "C:/Windows/Fonts/malgun.ttf", sz)
    except Exception:
        return ImageFont.load_default()


def vgrad(w, h, c1, c2):
    g = Image.new("RGB", (w, h)); d = ImageDraw.Draw(g)
    for y in range(h):
        t = y / max(1, h - 1)
        d.line([(0, y), (w, y)], fill=tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3)))
    return g


def rmask(w, h, r):
    m = Image.new("L", (w, h), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), r, fill=255); return m


def shadow(img, box, r, blur=7, alpha=55, dy=3):
    x0, y0, x1, y1 = [int(v) for v in box]; w, h = x1 - x0, y1 - y0
    sh = Image.new("RGBA", (w + 40, h + 40), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((20, 20, 20 + w, 20 + h), r, fill=(30, 45, 80, alpha))
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    img.alpha_composite(sh, (x0 - 20, y0 - 20 + dy))


def pill(img, cx, cy, w, h, c1, c2, r=None, border=None, gloss=0.32, sh=True):
    r = r if r is not None else h // 2
    x0, y0 = int(cx - w / 2), int(cy - h / 2); box = (x0, y0, x0 + w, y0 + h)
    if sh:
        shadow(img, box, r)
    img.paste(vgrad(w, h, c1, c2), (x0, y0), rmask(w, h, r))
    if gloss:
        gl = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(gl).rounded_rectangle((5, 4, w - 6, int(h * 0.46)), max(2, r - 4), fill=(255, 255, 255, int(255 * gloss)))
        img.paste(gl, (x0, y0), gl)
    if border:
        ImageDraw.Draw(img).rounded_rectangle(box, r, outline=border, width=2)


def glassbox(img, cx, cy, w, h, r=24):
    x0, y0 = int(cx - w / 2), int(cy - h / 2); box = (x0, y0, x0 + w, y0 + h)
    shadow(img, box, r, blur=8, alpha=52, dy=4)
    # 또렷한 프스티드 글래스: 흰→연하늘 그라데이션, ~78% 불투명(입체감)
    grad = vgrad(w, h, (255, 255, 255), (226, 235, 248)).convert("RGBA")
    grad.putalpha(Image.composite(Image.new("L", (w, h), 198), Image.new("L", (w, h), 0), rmask(w, h, r)))
    img.alpha_composite(grad, (x0, y0))
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    d.rounded_rectangle((x0 + 6, y0 + 5, x0 + w - 6, y0 + int(h * 0.44)), max(4, r - 5), fill=(255, 255, 255, 95))  # 상단 광택
    d.rounded_rectangle(box, r, outline=(255, 255, 255, 238), width=2)  # 또렷한 라이트 테두리
    d.line((x0 + 12, y0 + h - 4, x0 + w - 12, y0 + h - 4), fill=(150, 165, 195, 70), width=2)  # 하단 음영(입체)
    img.alpha_composite(ov)


def txt(d, xy, s, fnt, fill, sw=0, scol=(255, 255, 255, 235), anchor="mm"):
    d.text(xy, s, font=fnt, fill=fill, stroke_fill=scol, stroke_width=sw, anchor=anchor)


def main():
    img = Image.open(BGSRC).convert("RGB").resize((W, H), Image.LANCZOS).convert("RGBA")
    NAVY = (40, 54, 96, 255)
    # 뒤로(블루→인디고). 코인은 도형(알약) 없이 코인+숫자만.
    pill(img, 96, 52, 150, 58, (124, 152, 250), (92, 112, 224), r=29, border=(255, 255, 255, 120))
    # 탭(실제 좌표) — 9개 딱 맞음
    names = ["관동", "성도", "호연", "신오", "하나", "칼로스", "알로라", "가라르", "팔데아"]
    n = len(names); tabW = 123; pitch = 131; sx = 116
    for i, nm in enumerate(names):
        cx = sx + i * pitch
        if i == 0:
            pill(img, cx, 128, tabW, 50, (192, 196, 247), (150, 156, 232), r=25, border=(255, 255, 255, 160))
        else:
            pill(img, cx, 128, tabW, 50, (255, 255, 255), (235, 241, 250), r=25, border=(198, 210, 230, 235))
    # 그리드(실제 좌표)
    COLS, CW, CH, TOPY = 6, 196, 110, 236
    STARTX = W // 2 - (COLS - 1) * CW // 2  # 150
    caught = {0: (1, "이상해씨"), 1: (2, "이상해풀"), 2: (3, "이상해꽃"), 3: (4, "파이리"), 4: (5, "리자드"), 5: (6, "리자몽"),
              6: (7, "꼬부기"), 7: (8, "어니부기"), 8: (9, "거북왕"), 9: (10, "캐티피"), 10: (11, "단데기"), 16: (17, "피죤")}
    nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 35, 21, 66, 35, 24]
    for k in range(24):
        c = k % COLS; r = k // COLS; x = STARTX + c * CW; y = TOPY + r * CH
        if k not in caught:
            glassbox(img, x, y, 47, 47, r=12)  # 포켓몬 크기의 60%
    for k, (pid, _nm) in caught.items():
        c = k % COLS; r = k // COLS; x = STARTX + c * CW; y = TOPY + r * CH
        p = os.path.join(SPR, f"{pid}.webp")
        if os.path.exists(p):
            sp = Image.open(p).convert("RGBA"); sp.thumbnail((72, 72))
            img.paste(sp, (int(x - sp.width / 2), int(y - sp.height / 2)), sp)
    # 페이지 펄
    pill(img, W / 2 - 150, 680, 92, 52, (236, 241, 250), (208, 218, 236), r=26, border=(198, 210, 230, 235))
    pill(img, W / 2 + 150, 680, 92, 52, (124, 152, 250), (92, 112, 224), r=26, border=(255, 255, 255, 120))

    d = ImageDraw.Draw(img)
    txt(d, (W / 2, 40), "포켓몬 도감", font(40), NAVY, 3)
    txt(d, (96, 52), "◀ 뒤로", font(27), (255, 255, 255, 255), 0)
    d.ellipse((W - 150, 38, W - 122, 66), fill=(255, 205, 70), outline=(210, 160, 30), width=2)
    txt(d, (W - 98, 52), "65", font(30), (52, 64, 96, 255), 3)  # 도형 없이 — 가독성 위해 흰 외곽선
    for i, nm in enumerate(names):
        cx = sx + i * pitch
        txt(d, (cx, 128), nm, font(22), (255, 255, 255, 255) if i == 0 else (62, 76, 112, 255), 0)
    txt(d, (W / 2, 178), "관동 지역 · 13 / 151 마리", font(27), NAVY, 3)
    for k in range(24):
        c = k % COLS; r = k // COLS; x = STARTX + c * CW; y = TOPY + r * CH
        if k in caught:
            txt(d, (x, y + 44), caught[k][1], font(19), NAVY, 3)
        else:
            txt(d, (x, y), "?", font(20), (120, 140, 175, 255), 0)        # 박스 안 중앙(60% 크기)
            txt(d, (x, y + 44), "???", font(18), (110, 125, 155, 255), 2)  # 박스 아래(잡은 포켓몬 이름 위치)
        txt(d, (x, y + 64), f"#{nums[k]}", font(14), (95, 110, 140, 255), 0)
    txt(d, (W / 2, 680), "1 / 7 (좌우로 넘겨요)", font(20), (55, 68, 100, 255), 3)
    txt(d, (W / 2 - 150, 680), "◀", font(25), (90, 105, 140, 255), 0)
    txt(d, (W / 2 + 150, 680), "▶", font(25), (255, 255, 255, 255), 0)

    img.convert("RGB").save(os.path.join(ROOT, "_newui.png"))
    print("저장: _newui.png")


if __name__ == "__main__":
    main()
