# -*- coding: utf-8 -*-
"""화면비 적응 검증: 지역선택+타이틀을 폴드 메인(1.11)/커버(2.52)/탭 16:10(1.6) 논리 해상도로
새 앵커 공식 그대로 렌더 → 레터박스 없이 꽉 차는지 확인. 출력 미리보기_화면비.png"""
import os, sys
from PIL import Image, ImageDraw
import ui_previews as U

try:
    sys.stdout.reconfigure(errors="replace")
except Exception:
    pass
ROOT = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(ROOT, "public")
DESK = os.path.join(os.path.expanduser("~"), "Desktop")
DARK = (43, 58, 103)
C_BLUE, C_GREEN, C_TILE = (108, 140, 255), (124, 198, 62), (255, 167, 38)


def design_for(aspect):
    """theme.ts 와 동일한 논리 해상도 산출"""
    if aspect >= 1280 / 720:
        return min(1880, round(720 * aspect / 2) * 2), 720
    return 1280, min(1300, round(1280 / aspect / 2) * 2)


def render_region(W, H):
    img = U.cover(os.path.join(PUB, "bg", "regions.webp"), W, H).convert("RGBA")
    d = ImageDraw.Draw(img)
    U.btn(img, 110, 56, 150, 58, C_BLUE, "◀ 뒤로", 26)
    U.btn(img, 272, 56, 134, 56, C_GREEN, "📕 도감", 24)
    U.btn(img, 416, 56, 134, 56, C_TILE, "🛍 상점", 24)
    d.text((W / 2, 56), "지역 선택", font=U.font(38), fill=(255, 255, 255, 255), anchor="mm",
           stroke_width=6, stroke_fill=DARK + (255,))
    U.draw_emoji(img, "🪙", W - 40 - 74, 46, 28)
    d.text((W - 40, 46), "56", font=U.font(28), fill=(58, 72, 96, 255), anchor="rm",
           stroke_width=3, stroke_fill=(255, 255, 255, 255))
    U.draw_gear_hollow(img, W - 45, H - 38, 26 * 0.6)
    # 지역 카드 3×3 — StageMapScene 과 동일 공식(OFFY 세로 중앙)
    OFFY = (H - 720) // 2
    startX, startY = W / 2 - 366, 210 + OFFY
    names = ["관동", "성도", "호연", "신오", "하나", "칼로스", "알로라", "가라르", "팔데아"]
    for i, nm in enumerate(names):
        x = startX + (i % 3) * 366
        y = startY + (i // 3) * 170
        try:
            card = U.cover(os.path.join(PUB, "bg", f"r{i}.webp"), 322, 96)
            mask = Image.new("L", (322, 96), 0)
            ImageDraw.Draw(mask).rounded_rectangle((0, 0, 321, 95), 18, fill=255)
            img.paste(card, (int(x - 161), int(y - 48)), mask)
        except Exception:
            pass
        ov = Image.new("RGBA", (322, 96), (0, 0, 0, 0))
        od = ImageDraw.Draw(ov)
        od.rounded_rectangle((0, 0, 321, 95), 18, fill=(16, 21, 31, 102))
        od.rounded_rectangle((0, 0, 321, 95), 18, outline=(255, 255, 255, 242), width=4)
        img.alpha_composite(ov, (int(x - 161), int(y - 48)))
        d.text((x, y), f"{nm} 지역", font=U.font(34), fill=(255, 255, 255, 255), anchor="mm",
               stroke_width=6, stroke_fill=(26, 34, 56, 255))
        d.text((x, y + 66), "0 / 100 마리", font=U.font(21), fill=(255, 255, 255, 255), anchor="mm",
               stroke_width=5, stroke_fill=DARK + (255,))
    return img


def render_title(W, H):
    img = U.cover(os.path.join(PUB, "bg", "main.webp"), W, H).convert("RGBA")
    d = ImageDraw.Draw(img)
    ash = Image.open(os.path.join(PUB, "ash.png")).convert("RGBA")
    s = 280 / max(ash.size)
    a2 = ash.resize((int(ash.width * s), int(ash.height * s)), Image.LANCZOS)
    img.alpha_composite(a2, (int(W / 2 - a2.width / 2), int(H - 340 - a2.height / 2)))
    d.text((W / 2, 120), "도겸이의", font=U.font(40), fill=DARK + (255,), anchor="mm")
    d.text((W / 2, 192), "포켓몬 수학모험", font=U.font(76), fill=DARK + (255,), anchor="mm")
    U.btn(img, W / 2, H - 140, 340, 96, C_GREEN, "▶ 시작하기", 40)
    U.btn(img, W / 2, H - 50, 240, 64, C_BLUE, "설정", 30, icon="gear")
    d.text((18, H - 16), "v62", font=U.font(22), fill=DARK + (200,), anchor="lm")
    return img


def main():
    cases = [("폴드 펼침 (1.11:1)", 2184 / 1968), ("탭 16:10", 1.6), ("폴드 커버 (21:9)", 2.52)]
    panels = []
    for label, a in cases:
        W, H = design_for(a)
        for name, fn in [("지역선택", render_region), ("타이틀", render_title)]:
            im = fn(W, H).convert("RGB")
            sc = 500 / W
            panels.append((f"{label} · {name} · {W}x{H}", im.resize((int(W * sc), int(H * sc)), Image.LANCZOS)))
    colW = max(p[1].width for p in panels) + 20
    rowH = [max(panels[i][1].height, panels[i + 1][1].height) + 46 for i in range(0, 6, 2)]
    canvas = Image.new("RGB", (colW * 2, sum(rowH) + 10), (240, 243, 248))
    d = ImageDraw.Draw(canvas)
    y = 0
    for r in range(3):
        for c in range(2):
            lbl, im = panels[r * 2 + c]
            x = c * colW + 10
            d.text((x + im.width / 2, y + 18), lbl, font=U.font(20), fill=(43, 58, 103), anchor="mm")
            canvas.paste(im, (x, y + 36))
        y += rowH[r]
    canvas.save(os.path.join(ROOT, "_aspect.png"))
    try:
        canvas.save(os.path.join(DESK, "미리보기_화면비.png"))
    except Exception as e:
        print("desk skip", e)
    print("저장: 미리보기_화면비.png")


if __name__ == "__main__":
    main()
