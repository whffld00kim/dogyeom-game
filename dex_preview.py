# -*- coding: utf-8 -*-
"""도감 배경 후보를 실제 도감 UI 목업과 합성해 '가상 적용' 미리보기 생성.
사용: python dex_preview.py   (dexA/dexB/dexC/current 합성 → _dexcmp.png 한 장)
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
sys.stdout.reconfigure(errors="replace")

ROOT = os.path.dirname(os.path.abspath(__file__))
BG = os.path.join(ROOT, "public", "bg")
SPR = os.path.join(ROOT, "public", "sprites")
FONTP = "C:/Windows/Fonts/malgun.ttf"
W, H = 1280, 720


def font(sz):
    try:
        return ImageFont.truetype(FONTP, sz)
    except Exception:
        return ImageFont.load_default()


def cover(im):
    s = max(W / im.width, H / im.height)
    im = im.resize((int(im.width * s) + 1, int(im.height * s) + 1), Image.LANCZOS)
    x = (im.width - W) // 2
    y = (im.height - H) // 2
    return im.crop((x, y, x + W, y + H))


def txt(d, xy, s, sz, fill, sw=0, anchor="mm"):
    d.text(xy, s, font=font(sz), fill=fill, stroke_fill=(255, 255, 255, 255), stroke_width=sw, anchor=anchor)


def build(bgpath):
    img = cover(Image.open(bgpath).convert("RGB")).convert("RGBA")
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    # 뒤로 버튼 + 탭(관동 초록/나머지 다크글래스)
    d.rounded_rectangle((26, 24, 166, 80), 12, fill=(16, 21, 31, 110))
    names = ["관동", "성도", "호연", "신오", "하나", "칼로스", "알로라", "가라르", "팔데아"]
    n = len(names); tabW = min(150, 1180 // n - 8); pitch = tabW + 8; startX = W / 2 - ((n - 1) * pitch) / 2
    for i, nm in enumerate(names):
        cx = startX + i * pitch
        d.rounded_rectangle((cx - tabW / 2, 103, cx + tabW / 2, 153), 12,
                            fill=(46, 158, 79, 255) if i == 0 else (16, 21, 31, 110))
    # 미포획 ❓ 카드(반투명 어두운 슬롯) — 2행
    topY = 236; cellW = 196; cellH = 110; COLS = 6; startGX = W / 2 - ((COLS - 1) * cellW) / 2
    for col in range(COLS):
        x = startGX + col * cellW; y = topY + cellH
        d.rounded_rectangle((x - 34, y - 34, x + 34, y + 34), 16, fill=(43, 58, 103, 102), outline=(255, 255, 255, 166), width=2)
    img = Image.alpha_composite(img, ov)
    # 잡은 포켓몬 스프라이트(1행)
    caught = [(1, "이상해씨"), (4, "파이리"), (7, "꼬부기"), (25, "피카츄"), (133, "이브이"), (52, "나옹")]
    for col, (pid, _nm) in enumerate(caught):
        x = startGX + col * cellW; y = topY
        p = os.path.join(SPR, f"{pid}.webp")
        if os.path.exists(p):
            sp = Image.open(p).convert("RGBA"); sp.thumbnail((78, 78))
            img.paste(sp, (int(x - sp.width / 2), int(y - sp.height / 2)), sp)
    # 글자(맨 위)
    d2 = ImageDraw.Draw(img)
    txt(d2, (W / 2, 40), "포켓몬 도감", 40, (43, 58, 103, 255), 5)
    txt(d2, (96, 52), "◀ 뒤로", 23, (255, 255, 255, 255), 0)
    for i, nm in enumerate(names):
        cx = startX + i * pitch
        txt(d2, (cx, 128), nm, 21, (255, 255, 255, 255), 0)
    txt(d2, (W / 2, 178), "관동 지역 · 9 / 151 마리", 26, (43, 58, 103, 255), 4)
    for col, (pid, nm) in enumerate(caught):
        x = startGX + col * cellW; y = topY
        txt(d2, (x, y + 46), nm, 18, (43, 58, 103, 255), 3)
    for col in range(COLS):
        x = startGX + col * cellW; y = topY + cellH
        txt(d2, (x, y), "?", 40, (255, 255, 255, 255), 0)
        txt(d2, (x, y + 46), "???", 18, (90, 107, 140, 255), 3)
    return img.convert("RGB")


def main():
    cands = [("dexA", "_new_dexA.webp"), ("dexB", "_new_dexB.webp"), ("dexC", "_new_dexC.webp"), ("현재(dex)", "dex.webp")]
    rw, rh = 600, 338
    out = Image.new("RGB", (rw, (rh + 26) * len(cands)), (30, 30, 36))
    dr = ImageDraw.Draw(out)
    for i, (label, fn) in enumerate(cands):
        p = os.path.join(BG, fn)
        if not os.path.exists(p):
            continue
        comp = build(p).resize((rw, rh), Image.LANCZOS)
        y = i * (rh + 26)
        dr.text((6, y + 4), label, font=font(20), fill=(255, 255, 120))
        out.paste(comp, (0, y + 26))
    out.save(os.path.join(ROOT, "_dexcmp.png"))
    print("저장: _dexcmp.png")


if __name__ == "__main__":
    main()
