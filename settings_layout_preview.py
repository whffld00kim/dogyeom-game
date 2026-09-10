# -*- coding: utf-8 -*-
"""설정 레이아웃 비교: 지금(왼쪽 8줄 빽빽) vs 제안(실수 허용을 오른쪽 소리 아래 2×2로).
출력 미리보기_설정개선.png"""
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
C_BLUE, C_GREEN, C_GRAY = (108, 140, 255), (124, 198, 62), (185, 194, 208)
WT = (255, 255, 255, 255)
ST = dict(stroke_width=5, stroke_fill=(22, 35, 63, 255))


def render_proposed():
    img = U.cover(os.path.join(PUB, "bg", "settings.webp"), W, H).convert("RGBA")
    d = ImageDraw.Draw(img)
    d.text((W / 2, 50), "수학 설정", font=U.font(46), fill=WT, anchor="mm", **ST)
    for i, (lbl, en, rng) in enumerate([("덧셈", True, "1~9"), ("뺄셈", False, "1~9"),
                                        ("곱셈", False, "2~5단"), ("나눗셈", False, "2~5단")]):
        y = 130 + i * 70
        d.text((160, y), lbl, font=U.font(32), fill=WT, anchor="lm", **ST)
        U.btn(img, 400, y, 140, 56, C_GREEN if en else C_GRAY, "켜짐" if en else "꺼짐", 26)
        U.btn(img, 645, y, 210, 56, C_BLUE, rng, 26, alpha=1.0 if en else 0.35)

    def group(x, y, title, items, active):
        d.text((x, y), title, font=U.font(30), fill=WT, anchor="lm", **ST)
        for i, it in enumerate(items):
            U.btn(img, x + 240 + i * 185, y, 170, 58, C_GREEN if i == active else C_GRAY, it, 26)

    # 왼쪽: 원래의 여유 간격(68px) 복원
    group(160, 452, "모드", ["탐험(편하게)", "도전(시간)"], 0)
    group(160, 520, "답하기", ["선택", "입력"], 0)
    group(160, 588, "제한시간", ["느긋", "보통", "빠름"], 1)

    # 오른쪽: 소리 + 실수 허용(2×2, 소리와 같은 폭)
    U.label(img, 1065, 150, "🔊 소리", 30, (255, 255, 255))
    for i, t in enumerate(["끔", "작게", "보통", "크게"]):
        U.btn(img, 990 + (i % 2) * 155, 212 + (i // 2) * 72, 140, 58, C_GREEN if i == 2 else C_GRAY, t, 26)
    U.label(img, 1065, 380, "🎯 실수 허용", 30, (255, 255, 255))
    for i, t in enumerate(["1번", "2번", "3번", "5번"]):
        U.btn(img, 990 + (i % 2) * 155, 442 + (i // 2) * 72, 140, 58, C_GREEN if i == 1 else C_GRAY, t, 26)

    d.multiline_text((1065, 622), "곱셈·나눗셈은 탐험 모드로\n시간 압박 없이 연습해요!",
                     font=U.font(22), fill=(234, 241, 255, 255), anchor="mm", align="center", spacing=8,
                     stroke_width=4, stroke_fill=(22, 35, 63, 255))
    by = H - 48
    U.btn(img, 120, by, 160, 60, C_BLUE, "◀ 뒤로", 28)
    U.btn(img, 430, by, 210, 60, C_BLUE, "💾 저장(백업)", 26)
    U.btn(img, 668, by, 210, 60, C_BLUE, "📂 불러오기", 26)
    U.btn(img, 900, by, 200, 60, C_GRAY, "🛠 관리자 OFF", 24)
    U.btn(img, 1140, by, 220, 60, C_GREEN, "시작하기 ▶", 30)
    return img.convert("RGB")


def main():
    cur = Image.open(os.path.join(ROOT, "_settings_preview.png")).convert("RGB")
    prop = render_proposed()
    SC = 0.62
    cur2 = cur.resize((int(W * SC), int(H * SC)), Image.LANCZOS)
    prop2 = prop.resize((int(W * SC), int(H * SC)), Image.LANCZOS)
    BAR = 46
    canvas = Image.new("RGB", (cur2.width, (BAR + cur2.height) * 2 + 10), (240, 243, 248))
    d = ImageDraw.Draw(canvas)
    d.text((canvas.width / 2, BAR / 2), "① 지금 (왼쪽 8줄 — 답답)", font=U.font(26), fill=DARK, anchor="mm")
    canvas.paste(cur2, (0, BAR))
    y2 = BAR + cur2.height + 10
    d.text((canvas.width / 2, y2 + BAR / 2), "② 제안 (실수 허용 → 오른쪽, 왼쪽 여유 복원)", font=U.font(26), fill=DARK, anchor="mm")
    canvas.paste(prop2, (0, y2 + BAR))
    canvas.save(os.path.join(ROOT, "_settings_layout.png"))
    try:
        canvas.save(os.path.join(DESK, "미리보기_설정개선.png"))
    except Exception as e:
        print("desk skip", e)
    print("저장: 미리보기_설정개선.png")


if __name__ == "__main__":
    main()
