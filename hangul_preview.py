# -*- coding: utf-8 -*-
"""한글 쓰기 게임모드 4종 예시 미리보기 — 실제 GameScene 배틀 레이아웃(배너/타일/키패드 좌표) 그대로 목업.
출력: 미리보기_한글모드.png (2×2 몽타주)"""
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
GROUND_Y = 533
DARK = (43, 58, 103)
PANEL = (108, 140, 255)
C_GREEN, C_RED = (124, 198, 62), (255, 107, 107)
WHITE = (255, 255, 255, 255)


def rr(img, x, y, w, h, rad, fill=None, outline=None, width=1):
    ov = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    d.rounded_rectangle((x, y, x + w, y + h), rad, fill=fill, outline=outline, width=width)
    img.alpha_composite(ov)


def battle_base(region_bg, enemy_id, enemy_name, stage_label, progress=0.3):
    img = U.cover(os.path.join(PUB, "bg", region_bg), W, H).convert("RGBA")
    d = ImageDraw.Draw(img)
    # ⏸ (다크 글래스 + 흰 두 줄)
    rr(img, 15, 27, 110, 58, 26, fill=(16, 21, 31, 107), outline=(255, 255, 255, 127), width=2)
    d.rectangle((58, 42, 66, 70), fill=WHITE)
    d.rectangle((74, 42, 82, 70), fill=WHITE)
    # 헤더 + 코인
    d.text((W / 2, 22), stage_label, font=U.font(30), fill=WHITE, anchor="ma",
           stroke_width=5, stroke_fill=(22, 35, 63, 255))
    U.draw_emoji(img, "🪙", W - 40 - 74, 46, 28)
    d.text((W - 40, 46), "99949", font=U.font(28), fill=(58, 72, 96, 255), anchor="rm",
           stroke_width=3, stroke_fill=WHITE)
    # 지우 + 적 포켓몬(이름)
    try:
        ash = Image.open(os.path.join(PUB, "ash.png")).convert("RGBA")
        s = 118 / max(ash.size)
        a2 = ash.resize((int(ash.width * s), int(ash.height * s)), Image.LANCZOS)
        img.alpha_composite(a2, (260 - a2.width // 2, GROUND_Y - 48 - a2.height // 2))
    except Exception as e:
        print("ash skip", e)
    U.sprite(img, os.path.join(PUB, "sprites", f"{enemy_id}.webp"), 900, GROUND_Y - 70, 150)
    d.text((900, GROUND_Y + 22), enemy_name, font=U.font(24), fill=WHITE, anchor="mm",
           stroke_width=5, stroke_fill=(22, 35, 63, 255))
    # 진행 바
    rr(img, W / 2 - 450, H - 22 - 9, 900, 18, 9, fill=(0, 0, 0, 38))
    rr(img, W / 2 - 450, H - 22 - 9, int(900 * progress), 18, 9, fill=C_GREEN + (255,))
    return img, d


def banner_box(img):
    rr(img, W / 2 - 235, 56, 470, 86, 24, fill=(255, 255, 255, 242), outline=PANEL + (255,), width=3)


def tile(img, cx, cy, label, fs=34, w=170, h=84):
    rr(img, cx - w / 2, cy - h / 2, w, h, 18, fill=(255, 255, 255, 245), outline=PANEL + (255,), width=3)
    ImageDraw.Draw(img).text((cx, cy), label, font=U.font(fs), fill=DARK + (255,), anchor="mm")


def key(img, cx, cy, label, color=PANEL, fs=30):
    U.btn(img, cx, cy, 96, 54, color, label, fs)


def draw_back_key(img, cx, cy):  # ⌫ 벡터
    U.btn(img, cx, cy, 96, 54, C_RED, "", 30)
    d = ImageDraw.Draw(img)
    d.polygon([(cx - 22, cy), (cx - 8, cy - 12), (cx - 8, cy + 12)], fill=WHITE)
    d.rectangle((cx - 8, cy - 12, cx + 20, cy + 12), fill=WHITE)
    d.line([(cx - 1, cy - 7), (cx + 13, cy + 7)], fill=C_RED + (255,), width=4)
    d.line([(cx - 1, cy + 7), (cx + 13, cy - 7)], fill=C_RED + (255,), width=4)


def draw_ok_key(img, cx, cy):  # ✓ 벡터
    U.btn(img, cx, cy, 96, 54, C_GREEN, "", 30)
    ImageDraw.Draw(img).line([(cx - 16, cy + 1), (cx - 5, cy + 12), (cx + 17, cy - 11)], fill=WHITE, width=7, joint="curve")


# ── ① 글자 고르기 (빈칸 4지선다) ──
def mode1():
    img, d = battle_base("r0.webp", 25, "피카츄", "한글 모험 · 글자 고르기")
    banner_box(img)
    t = "피카"
    tw = d.textlength(t, font=U.font(52))
    bx = W / 2 - (tw + 64) / 2
    d.text((bx, 99), t, font=U.font(52), fill=DARK + (255,), anchor="lm")
    rr(img, bx + tw + 12, 99 - 26, 52, 52, 10, fill=(255, 244, 214, 255), outline=(255, 167, 38, 255), width=3)
    d.text((bx + tw + 38, 101), "?", font=U.font(34), fill=(255, 167, 38, 255), anchor="mm")
    d.text((W / 2, 190), "그림의 이름을 완성해 보자!", font=U.font(26), fill=WHITE, anchor="mm",
           stroke_width=4, stroke_fill=(22, 35, 63, 255))
    for cx, lab in zip([340, 540, 740, 940], ["츄", "추", "쥬", "치"]):
        tile(img, cx, H - 84, lab, 40)
    return img


# ── ② 맞는 글자 찾기 (맞춤법) ──
def mode2():
    img, d = battle_base("r0.webp", 1, "이상해씨", "한글 모험 · 맞는 이름 찾기")
    banner_box(img)
    d.text((W / 2, 99), "바르게 쓴 이름은?", font=U.font(44), fill=DARK + (255,), anchor="mm")
    d.text((W / 2, 190), "받침과 모음을 잘 살펴봐!", font=U.font(26), fill=WHITE, anchor="mm",
           stroke_width=4, stroke_fill=(22, 35, 63, 255))
    for cx, lab in zip([340, 540, 740, 940], ["이상해씨", "이상해시", "이상헤씨", "이상해씌"]):
        tile(img, cx, H - 84, lab, 27, w=184)
    return img


# ── ③ 자모 조립 쓰기 (한글 키패드) ──
def mode3():
    img, d = battle_base("r1.webp", 4, "파이리", "한글 모험 · 이름 쓰기")
    banner_box(img)
    d.text((W / 2, 99), "이름을 써 보자!", font=U.font(44), fill=DARK + (255,), anchor="mm")
    # 입력 표시창 (조립 중: "파이" + 커서)
    rr(img, W / 2 - 140, 300 - 38, 280, 76, 16, fill=(255, 255, 255, 245), outline=PANEL + (255,), width=3)
    d.text((W / 2 - 20, 300), "파이", font=U.font(46), fill=DARK + (255,), anchor="mm")
    d.rectangle((W / 2 + 42, 300 - 24, W / 2 + 46, 300 + 24), fill=(255, 167, 38, 255))
    # 자모 키패드(쉬움: 정답 자모 포함 8개) + ⌫/✓ — 5열×2행
    jam = [["ㅍ", "ㅏ", "ㅇ", "ㅣ"], ["ㄹ", "ㅊ", "ㅁ", "ㅜ"]]
    for r in range(2):
        for c in range(4):
            key(img, W / 2 + (c - 2) * 110, 410 + r * 64, jam[r][c])
    draw_back_key(img, W / 2 + 2 * 110, 410)
    draw_ok_key(img, W / 2 + 2 * 110, 474)
    d.text((W / 2, 560), "자음·모음을 눌러 글자를 만들어요  (ㄹ + ㅣ → 리)", font=U.font(22), fill=WHITE,
           anchor="mm", stroke_width=4, stroke_fill=(22, 35, 63, 255))
    return img


# ── ④ 손글씨 따라 쓰기 (트레이싱) ──
def mode4():
    img, d = battle_base("r2.webp", 5, "리자드", "한글 모험 · 따라 쓰기")
    banner_box(img)
    # 배너: 리(강조) 자드
    t1, t2 = "리", "자드"
    w1 = d.textlength(t1, font=U.font(52))
    w2 = d.textlength(t2, font=U.font(52))
    bx = W / 2 - (w1 + w2 + 8) / 2
    d.text((bx, 99), t1, font=U.font(52), fill=(255, 137, 38, 255), anchor="lm")
    d.text((bx + w1 + 8, 99), t2, font=U.font(52), fill=(178, 190, 214, 255), anchor="lm")
    # 쓰기 패널 + 연한 글자 + 크레용 획 + 획순 번호
    px, py, ps = W / 2 - 160, 210, 400
    rr(img, px, py, ps, ps, 28, fill=(255, 255, 255, 235), outline=PANEL + (255,), width=4)
    d.text((px + ps / 2, py + ps / 2), "리", font=U.font(300), fill=(214, 224, 240, 255), anchor="mm")
    # ㄹ 첫 획(위 가로선) 크레용 느낌 — 주황 굵은 선
    sx, sy = px + 75, py + 92
    d.line([(sx, sy), (sx + 118, sy + 2)], fill=(255, 137, 38, 235), width=16)
    d.ellipse((sx - 8, sy - 8, sx + 8, sy + 8), fill=(255, 137, 38, 235))
    # 획순 번호 ①
    d.ellipse((sx - 34, sy - 34, sx - 6, sy - 6), fill=(255, 137, 38, 255))
    d.text(((sx - 20), (sy - 20)), "1", font=U.font(20), fill=WHITE, anchor="mm")
    U.draw_emoji(img, "👆", sx + 122, sy + 26, 40)
    d.text((W / 2 + 40, 650), "손가락으로 따라 써 보자!", font=U.font(26), fill=WHITE, anchor="mm",
           stroke_width=4, stroke_fill=(22, 35, 63, 255))
    return img


def main():
    panels = [
        ("① 글자 고르기 — 빈칸 4지선다 (기존 타일 UI 그대로)", mode1()),
        ("② 맞는 글자 찾기 — 맞춤법 구분", mode2()),
        ("③ 자모 조립 쓰기 — 한글 키패드로 직접 조립", mode3()),
        ("④ 손글씨 따라 쓰기 — 획순 트레이싱", mode4()),
    ]
    SC = 620 / W
    BAR = 44
    pw, ph = int(W * SC), int(H * SC)
    canvas = Image.new("RGB", (pw * 2 + 30, (BAR + ph + 12) * 2 + 8), (240, 243, 248))
    d = ImageDraw.Draw(canvas)
    for i, (lbl, im) in enumerate(panels):
        col, row = i % 2, i // 2
        x = 10 + col * (pw + 10)
        y = 8 + row * (BAR + ph + 12)
        d.text((x + pw / 2, y + BAR / 2), lbl, font=U.font(22), fill=DARK, anchor="mm")
        canvas.paste(im.convert("RGB").resize((pw, ph), Image.LANCZOS), (x, y + BAR))
    canvas.save(os.path.join(ROOT, "_hangul.png"))
    try:
        canvas.save(os.path.join(DESK, "미리보기_한글모드.png"))
    except Exception as e:
        print("desk skip", e)
    print("저장: 미리보기_한글모드.png")


if __name__ == "__main__":
    main()
