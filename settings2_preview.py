# -*- coding: utf-8 -*-
"""설정 2페이지 분할 목업 — 1페이지=게임 모드(과목/연산/한글 단계/실수 허용), 2페이지=소리·모드·답하기·제한시간.
좌우 화살표+페이지 표시(기존 '좌우로 넘겨요' 패턴). 출력 미리보기_설정2페이지.png"""
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
ST4 = dict(stroke_width=4, stroke_fill=(22, 35, 63, 255))


def base(page_label):
    img = U.cover(os.path.join(PUB, "bg", "settings.webp"), W, H).convert("RGBA")
    d = ImageDraw.Draw(img)
    d.text((W / 2, 42), "게임 설정", font=U.font(44), fill=WT, anchor="mm", **ST)
    d.text((W / 2, 88), f"{page_label}  (좌우로 넘겨요)", font=U.font(20), fill=WT, anchor="mm", **ST4)
    # 하단 공통 버튼
    by = H - 48
    U.btn(img, 120, by, 160, 60, C_BLUE, "◀ 뒤로", 28)
    U.btn(img, 430, by, 210, 60, C_BLUE, "💾 저장(백업)", 26)
    U.btn(img, 668, by, 210, 60, C_BLUE, "📂 불러오기", 26)
    U.btn(img, 900, by, 200, 60, C_GRAY, "🛠 관리자 OFF", 24)
    U.btn(img, 1140, by, 220, 60, C_GREEN, "시작하기 ▶", 30)
    return img, d


def arrow(img, cx, cy, right=True):
    U.btn(img, cx, cy, 52, 72, C_BLUE, "", 24)
    d = ImageDraw.Draw(img)
    s = 14
    if right:
        d.polygon([(cx - s * 0.5, cy - s), (cx - s * 0.5, cy + s), (cx + s * 0.8, cy)], fill=WT)
    else:
        d.polygon([(cx + s * 0.5, cy - s), (cx + s * 0.5, cy + s), (cx - s * 0.8, cy)], fill=WT)


def label(d, x, y, t, fs=30):
    d.text((x, y), t, font=U.font(fs), fill=WT, anchor="lm", **ST)


def page1():
    img, d = base("1 / 2")
    # 과목
    label(d, 160, 148, "과목")
    for i, (t, on) in enumerate([("수학", True), ("한글", False), ("섞기", False)]):
        U.btn(img, 400 + i * 185, 148, 170, 58, C_GREEN if on else C_GRAY, t, 26)
    # 연산 4행 (수학)
    for i, (lbl, en, rng) in enumerate([("덧셈", True, "1~9"), ("뺄셈", False, "1~9"),
                                        ("곱셈", False, "2~5단"), ("나눗셈", False, "2~5단")]):
        y = 218 + i * 64
        label(d, 160, y, lbl, 28)
        U.btn(img, 400, y, 140, 54, C_GREEN if en else C_GRAY, "켜짐" if en else "꺼짐", 24)
        U.btn(img, 645, y, 210, 54, C_BLUE, rng, 24, alpha=1.0 if en else 0.35)
    # 한글 단계
    label(d, 160, 486, "한글 단계", 28)
    for i, t in enumerate(["글자 고르기", "맞는 글자", "한 글자 쓰기", "이름 쓰기"]):
        U.btn(img, 400 + i * 185, 486, 170, 54, C_GREEN if i == 0 else C_GRAY, t, 20)
    # 실수 허용
    label(d, 160, 552, "실수 허용", 28)
    for i, t in enumerate(["1번", "2번", "3번", "5번"]):
        U.btn(img, 400 + i * 185, 552, 170, 54, C_GREEN if i == 1 else C_GRAY, t, 24)
    # 안내
    d.text((W / 2, 608), "한글 문제는 이름을 잠깐 보여준 뒤 가려요 · 💡 힌트 / 🔊 듣기 지원",
           font=U.font(20), fill=(234, 241, 255, 255), anchor="mm", **ST4)
    arrow(img, W - 44, 360, right=True)
    return img


def page2():
    img, d = base("2 / 2")
    label(d, 160, 180, "소리")
    for i, t in enumerate(["끔", "작게", "보통", "크게"]):
        U.btn(img, 400 + i * 165, 180, 150, 58, C_GREEN if i == 2 else C_GRAY, t, 26)
    label(d, 160, 262, "모드")
    for i, t in enumerate(["탐험(편하게)", "도전(시간)"]):
        U.btn(img, 400 + i * 185, 262, 170, 58, C_GREEN if i == 0 else C_GRAY, t, 24)
    label(d, 160, 344, "답하기")
    for i, t in enumerate(["선택", "입력"]):
        U.btn(img, 400 + i * 185, 344, 170, 58, C_GREEN if i == 0 else C_GRAY, t, 26)
    label(d, 160, 426, "제한시간")
    for i, t in enumerate(["느긋", "보통", "빠름"]):
        U.btn(img, 400 + i * 185, 426, 170, 58, C_GREEN if i == 1 else C_GRAY, t, 26)
    d.multiline_text((W / 2, 530), "곱셈·나눗셈은 탐험 모드로\n시간 압박 없이 연습해요!",
                     font=U.font(24), fill=(234, 241, 255, 255), anchor="mm", align="center", spacing=8, **ST4)
    arrow(img, 44, 360, right=False)
    return img


def main():
    p1, p2 = page1(), page2()
    SC = 620 / W
    pw, ph = int(W * SC), int(H * SC)
    BAR = 44
    canvas = Image.new("RGB", (pw * 2 + 30, BAR + ph + 16), (240, 243, 248))
    d = ImageDraw.Draw(canvas)
    for i, (lbl, im) in enumerate([("1페이지 — 게임 모드 (과목·연산·한글·실수 허용)", p1),
                                   ("2페이지 — 소리 · 모드 · 답하기 · 제한시간", p2)]):
        x = 10 + i * (pw + 10)
        d.text((x + pw / 2, BAR / 2), lbl, font=U.font(22), fill=DARK, anchor="mm")
        canvas.paste(im.convert("RGB").resize((pw, ph), Image.LANCZOS), (x, BAR))
    canvas.save(os.path.join(ROOT, "_settings2.png"))
    try:
        canvas.save(os.path.join(DESK, "미리보기_설정2페이지.png"))
    except Exception as e:
        print("desk skip", e)
    print("저장: 미리보기_설정2페이지.png")


if __name__ == "__main__":
    main()
