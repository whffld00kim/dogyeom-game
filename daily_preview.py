# -*- coding: utf-8 -*-
"""포켓몬 기록(날짜별 포획 수) 페이지 미리보기 — DailyScene 실제 좌표 그대로. 출력 미리보기_기록.png"""
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
W, H = 1280, 720
DARK = (43, 58, 103)
PANEL = (108, 140, 255)
GREEN_T = (46, 158, 79)
GRAY_T = (154, 166, 184)
C_BLUE, C_GRAY = (108, 140, 255), (185, 194, 208)


def rr(img, x, y, w, h, rad, fill=None, outline=None, width=1):
    ov = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    d.rounded_rectangle((x, y, x + w, y + h), rad, fill=fill, outline=outline, width=width)
    img.alpha_composite(ov)


def main():
    img = U.cover(os.path.join(PUB, "bg", "regions.webp"), W, H).convert("RGBA")
    d = ImageDraw.Draw(img)
    U.btn(img, 110, 56, 150, 58, C_BLUE, "◀ 뒤로", 26)
    d.text((W / 2, 56), "포켓몬 기록", font=U.font(38), fill=(255, 255, 255, 255), anchor="mm",
           stroke_width=6, stroke_fill=DARK + (255,))

    # 오늘 카드
    rr(img, W / 2 - 310, 106, 620, 186, 26, fill=(30, 58, 102, 36))
    rr(img, W / 2 - 310, 102, 620, 186, 26, fill=(255, 255, 255, 245), outline=PANEL + (255,), width=4)
    d.text((W / 2, 136), "오늘 잡은 포켓몬", font=U.font(24), fill=(90, 107, 140, 255), anchor="mm")
    d.text((W / 2, 192), "7마리", font=U.font(62), fill=DARK + (255,), anchor="mm")
    d.text((W / 2, 252), "🎮 로블록스 7분!", font=U.font(26), fill=GREEN_T + (255,), anchor="mm")

    # 날짜별 기록 7행 (1마리 = 1분)
    rows = [("8월 3일 (월) · 오늘", 7, 7, True), ("8월 2일 (일)", 12, 12, False), ("8월 1일 (토)", 4, 4, False),
            ("7월 31일 (금)", 10, 10, False), ("7월 30일 (목)", 0, 0, False), ("7월 29일 (수)", 6, 6, False),
            ("7월 28일 (화)", 2, 2, False)]
    rowW, y0, pitch = 780, 330, 46
    for i, (label, n, m, today) in enumerate(rows):
        y = y0 + i * pitch
        rr(img, W / 2 - rowW / 2, y - 19, rowW, 40, 12,
           fill=(255, 255, 255, 242 if today else 184),
           outline=((255, 167, 38, 255) if today else (188, 212, 239, 255)), width=2)
        d.text((W / 2 - rowW / 2 + 26, y), label, font=U.font(22), fill=DARK + (255,), anchor="lm")
        d.text((W / 2 + 120, y), f"{n}마리", font=U.font(22),
               fill=(DARK if n > 0 else GRAY_T) + (255,), anchor="rm")
        d.text((W / 2 + rowW / 2 - 26, y), (f"🎮 {m}분" if m > 0 else "0분"), font=U.font(22),
               fill=(GREEN_T if m > 0 else GRAY_T) + (255,), anchor="rm")

    # 페이지(예시 2주 이상일 때)
    U.btn(img, W / 2 - 150, H - 40, 92, 52, C_BLUE, "◀", 26)
    U.btn(img, W / 2 + 150, H - 40, 92, 52, C_GRAY, "▶", 26)
    d.text((W / 2, H - 40), "1 / 2 주", font=U.font(20), fill=(255, 255, 255, 255), anchor="mm",
           stroke_width=4, stroke_fill=(22, 35, 63, 255))

    out = img.convert("RGB")
    out.save(os.path.join(ROOT, "_daily.png"))
    try:
        out.save(os.path.join(DESK, "미리보기_기록.png"))
    except Exception as e:
        print("desk skip", e)
    print("저장: 미리보기_기록.png")


if __name__ == "__main__":
    main()
