# -*- coding: utf-8 -*-
"""설정/상점/지역선택 화면 미리보기. 게임 widgets.makeButton(광택+그림자+흰테두리+벡터기어)을 재현.
출력: 바탕화면 미리보기_설정/상점/지역선택.png + apkserve/*_preview.png"""
import os, sys, math
from PIL import Image, ImageDraw, ImageFont
try:
    sys.stdout.reconfigure(errors="replace")
except Exception:
    pass

ROOT = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(ROOT, "public")
W, H = 1280, 720
DARK = (43, 58, 103)
C_BLUE = (108, 140, 255)      # btn
C_GREEN = (124, 198, 62)      # btnGreen
C_GRAY = (185, 194, 208)      # btnGray
C_TILE = (255, 167, 38)       # tile(주황)
EMOJI = set("💾📂🔊🛠📕🛍🪙🎀🎨")

DESK = os.path.join(os.path.expanduser("~"), "Desktop")
APK = r"C:\Users\Public\apkserve"
NOGLOSS = bool(os.environ.get("NOGLOSS"))  # 환경변수로 광택 끄기(비교용)


def font(sz):
    for p in (os.path.join(PUB, "fonts", "Jua-Regular.ttf"), "C:/Windows/Fonts/malgunbd.ttf"):
        try:
            return ImageFont.truetype(p, sz)
        except Exception:
            continue
    return ImageFont.load_default()


def efont(sz):
    return ImageFont.truetype("C:/Windows/Fonts/seguiemj.ttf", sz)


def emoji_w(ch, sz):
    try:
        return ImageDraw.Draw(Image.new("RGBA", (4, 4))).textlength(ch, font=efont(sz))
    except Exception:
        return sz


def draw_emoji(img, ch, x, y, sz):
    """이모지 1글자를 (x=왼쪽, y=중앙)에 컬러로. 실패 시 무시."""
    try:
        ImageDraw.Draw(img).text((x, y), ch, font=efont(sz), embedded_color=True, anchor="lm")
        return True
    except Exception:
        return False


def label(img, cx, cy, text, sz, color):
    """가운데 정렬 라벨. 맨 앞 이모지는 컬러폰트로, 나머지는 맑은고딕."""
    d = ImageDraw.Draw(img)
    if text and text[0] in EMOJI:
        emo, rest = text[0], text[1:].lstrip()
        ew = emoji_w(emo, sz)
        tw = d.textlength(rest, font=font(sz))
        gap = sz * 0.18
        x0 = cx - (ew + gap + tw) / 2
        ok = draw_emoji(img, emo, x0, cy, sz)
        tx = x0 + (ew + gap if ok else 0)
        d.text((tx, cy), rest, font=font(sz), fill=color + (255,), anchor="lm")
    else:
        d.text((cx, cy), text, font=font(sz), fill=color + (255,), anchor="mm")


def draw_gear(d, cx, cy, R, hole):
    n = 32
    pts = [(cx + math.cos(i / n * 2 * math.pi) * (R if i % 4 < 2 else R * 0.72),
            cy + math.sin(i / n * 2 * math.pi) * (R if i % 4 < 2 else R * 0.72)) for i in range(n)]
    d.polygon(pts, fill=(255, 255, 255, 255))
    d.ellipse((cx - R * 0.4, cy - R * 0.4, cx + R * 0.4, cy + R * 0.4), fill=hole + (255,))


def draw_gear_hollow(img, cx, cy, R):
    """흰 톱니 + 가운데 진짜 투명 구멍(뒤 배경 비침) — 게임 gearTexture와 동일."""
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(lay)
    n = 32
    pts = [(cx + math.cos(i / n * 2 * math.pi) * (R if i % 4 < 2 else R * 0.72),
            cy + math.sin(i / n * 2 * math.pi) * (R if i % 4 < 2 else R * 0.72)) for i in range(n)]
    gd.polygon(pts, fill=(255, 255, 255, 255))
    gd.ellipse((cx - R * 0.4, cy - R * 0.4, cx + R * 0.4, cy + R * 0.4), fill=(0, 0, 0, 0))  # 투명 구멍
    img.alpha_composite(lay)


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


def btn(img, cx, cy, w, h, color, text, fs, icon=None, alpha=1.0, tcolor=(255, 255, 255)):
    """widgets.makeButton 재현: ④ 은은한 세로 그라데이션 본체 + 흰 테두리 + 라벨/기어."""
    radius = min(h // 2, 26)
    pad = 8
    lay = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    ox = oy = pad
    # ④ 은은한 세로 그라데이션 본체 + 흰 테두리 (게임 makeButton 캔버스와 동일)
    lay.paste(vgrad(w, h, lighten(color, 1.14), darken(color, 0.93)), (ox, oy), rmask(w, h, radius))
    d.rounded_rectangle((ox, oy, ox + w - 1, oy + h - 1), radius, outline=(255, 255, 255, 127), width=2)     # 테두리
    cxl, cyl = ox + w / 2, oy + h / 2
    if icon == "gear":
        if text and text.strip():
            iconR, gap = fs * 0.46, fs * 0.34
            tw = d.textlength(text, font=font(fs))
            tx = cxl + (iconR * 2 + gap) / 2
            draw_gear(d, tx - tw / 2 - gap - iconR, cyl, iconR, color)
            d.text((tx, cyl), text, font=font(fs), fill=tcolor + (255,), anchor="mm")
        else:
            draw_gear(d, cxl, cyl, fs * 0.6, color)
    else:
        label(lay, cxl, cyl, text, fs, tcolor)
    if alpha < 1:
        lay.putalpha(lay.split()[3].point(lambda v: int(v * alpha)))
    img.alpha_composite(lay, (int(cx - w / 2 - pad), int(cy - h / 2 - pad)))


def base_bg(top, bottom, ground):
    """widgets.drawBackground 재현."""
    grad = Image.new("RGB", (1, H))
    for y in range(H):
        t = y / (H - 1)
        grad.putpixel((0, y), tuple(int(top[c] + (bottom[c] - top[c]) * t) for c in range(3)))
    img = grad.resize((W, H)).convert("RGBA")
    d = ImageDraw.Draw(img)
    gy = round(H * 0.74)
    d.rectangle((0, gy, W, H), fill=ground)
    d.rectangle((0, gy + 26, W, H), fill=(200, 155, 106))
    d.rectangle((0, gy, W, gy + 8), fill=(108, 174, 58))
    return img


def cover(path, w, h):
    s = Image.open(path).convert("RGBA")
    sc = max(w / s.width, h / s.height)
    s2 = s.resize((max(1, int(s.width * sc)), max(1, int(s.height * sc))), Image.LANCZOS)
    l, t = (s2.width - w) // 2, (s2.height - h) // 2
    return s2.crop((l, t, l + w, t + h))


def sprite(img, path, cx, cy, size):
    try:
        s = Image.open(path).convert("RGBA")
        sc = size / max(s.size)
        s2 = s.resize((max(1, int(s.width * sc)), max(1, int(s.height * sc))), Image.LANCZOS)
        img.alpha_composite(s2, (int(cx - s2.width / 2), int(cy - s2.height / 2)))
    except Exception as e:
        print("  sprite skip", os.path.basename(path), e)


def save(img, deskname, apkname):
    if NOGLOSS:
        deskname = deskname.replace(".png", "_광택없음.png")
        apkname = apkname.replace(".png", "_noglow.png")
    img.convert("RGB").save(os.path.join(ROOT, "_" + apkname))
    for d in (os.path.join(DESK, deskname), os.path.join(APK, apkname)):
        try:
            img.convert("RGB").save(d)
        except Exception as e:
            print("  save skip", d, e)
    print("저장:", deskname)


# ─────────────────────────── 설정 ───────────────────────────
def render_settings():
    img = cover(os.path.join(PUB, "bg", "settings.webp"), W, H).convert("RGBA")  # 어두운 연구실 배경
    d = ImageDraw.Draw(img)
    WT = (255, 255, 255, 255)  # 밝은 배경용 흰 글씨
    ST = dict(stroke_width=5, stroke_fill=(22, 35, 63, 255))
    d.text((W / 2, 50), "수학 설정", font=font(46), fill=WT, anchor="mm", **ST)
    for i, (lbl, en, rng) in enumerate([("덧셈", True, "1~9"), ("뺄셈", False, "1~9"),
                                        ("곱셈", False, "2~5단"), ("나눗셈", False, "2~5단")]):
        y = 130 + i * 70
        d.text((160, y), lbl, font=font(32), fill=WT, anchor="lm", **ST)
        btn(img, 400, y, 140, 56, C_GREEN if en else C_GRAY, "켜짐" if en else "꺼짐", 26)
        btn(img, 645, y, 210, 56, C_BLUE, rng, 26, alpha=1.0 if en else 0.35)

    def group(x, y, title, items, active):
        d.text((x, y), title, font=font(30), fill=WT, anchor="lm", **ST)
        for i, it in enumerate(items):
            btn(img, x + 240 + i * 185, y, 170, 58, C_GREEN if i == active else C_GRAY, it, 26)
    group(160, 452, "모드", ["탐험(편하게)", "도전(시간)"], 0)
    group(160, 520, "답하기", ["선택", "입력"], 0)
    group(160, 588, "제한시간", ["느긋", "보통", "빠름"], 1)
    # 실수 허용 — 오른쪽 소리 아래 2×2 (게임 makeMissControl과 동일 좌표)
    label(img, 1065, 380, "🎯 실수 허용", 30, (255, 255, 255))
    for i, t in enumerate(["1번", "2번", "3번", "5번"]):
        btn(img, 990 + (i % 2) * 155, 442 + (i // 2) * 72, 140, 58, C_GREEN if i == 1 else C_GRAY, t, 26)

    label(img, 1065, 150, "🔊 소리", 30, (255, 255, 255))
    for i, t in enumerate(["끔", "작게", "보통", "크게"]):
        btn(img, 990 + (i % 2) * 155, 212 + (i // 2) * 72, 140, 58, C_GREEN if i == 2 else C_GRAY, t, 26)
    d.multiline_text((1065, 588), "곱셈·나눗셈은 탐험 모드로\n시간 압박 없이 연습해요!",
                     font=font(22), fill=(234, 241, 255, 255), anchor="mm", align="center", spacing=6,
                     stroke_width=4, stroke_fill=(22, 35, 63, 255))
    btn(img, 120, 672, 160, 60, C_BLUE, "◀ 뒤로", 28)
    btn(img, 430, 672, 210, 60, C_BLUE, "💾 저장(백업)", 26)
    btn(img, 668, 672, 210, 60, C_BLUE, "📂 불러오기", 26)
    btn(img, 900, 672, 200, 60, C_GRAY, "🛠 관리자 OFF", 24)
    btn(img, 1140, 672, 220, 60, C_GREEN, "시작하기 ▶", 30)
    save(img, "미리보기_설정.png", "settings_preview.png")


# ─────────────────────────── 상점 ───────────────────────────
def render_shop():
    img = base_bg((207, 233, 255), (155, 200, 255), (216, 232, 255))
    d = ImageDraw.Draw(img)
    btn(img, 110, 56, 150, 58, C_BLUE, "◀ 뒤로", 26)
    d.text((W / 2, 30), "상점 꾸미기", font=font(36), fill=DARK + (255,), anchor="ma")
    # 코인(도감 기준 동일: 28px, 어두운 글씨 #3a4860, 흰 외곽선, 알약 없음)
    draw_emoji(img, "🪙", 1240 - 74, 46, 28)
    d.text((1240, 46), "56", font=font(28), fill=(58, 72, 96, 255), anchor="rm",
           stroke_width=3, stroke_fill=(255, 255, 255, 255))
    # (흰 패널 제거 — 배경은 원래 하늘 그라데이션 그대로)
    # 지역 탭(9개 모두 표시 — 잡은 포켓몬 없는 지역은 비활성/흐리게)
    reg_tabs = [("관동", C_GREEN, 1.0), ("성도", C_GRAY, 1.0), ("호연", C_GRAY, 0.4),
                ("신오", C_GRAY, 0.4), ("하나", C_GRAY, 0.4), ("칼로스", C_GRAY, 0.4),
                ("알로라", C_GRAY, 0.4), ("가라르", C_GRAY, 0.4), ("팔데아", C_GRAY, 0.4)]
    for k, (nm, col, a) in enumerate(reg_tabs):
        btn(img, 300 + k * 112, 108, 106, 40, col, nm, 20, alpha=a)
    # 선택 스트립(잡은 포켓몬)
    ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 16]
    names = ["이상해씨", "이상해풀", "이상해꽃", "파이리", "리자드", "리자몽",
             "꼬부기", "어니부기", "거북왕", "캐터피", "단데기", "피죤"]
    pitch = 94
    startX = W / 2 - ((12 - 1) * pitch) / 2
    cy = 222
    for i, pid in enumerate(ids):
        cx = startX + i * pitch
        if pid == 1:  # 선택 하이라이트
            ov = Image.new("RGBA", img.size, (0, 0, 0, 0))
            ImageDraw.Draw(ov).rounded_rectangle((cx - 39, cy - 39, cx + 39, cy + 39), 14, fill=C_GREEN + (255,))
            img.alpha_composite(ov)
        sprite(img, os.path.join(PUB, "sprites", f"{pid}.webp"), cx, cy - 4, 58)
        d.text((cx, cy + 34), names[i], font=font(12), fill=DARK + (255,), anchor="mm")
    btn(img, W - 44, cy, 52, 72, C_BLUE, "▶", 24)  # 다음 페이지
    d.text((W / 2, 290), "1 / 2", font=font(16), fill=(108, 122, 153) + (255,), anchor="mm")
    # 등급 탭(아래로)
    btn(img, 583, 348, 232, 42, C_GREEN, "일반", 22)
    btn(img, 835, 348, 232, 42, C_GRAY, "희귀", 22)
    btn(img, 1087, 348, 232, 42, C_GRAY, "최고", 22)
    # 좌측 미리보기(기본 이상해씨, 아래로)
    px, py = 235, 470
    d.text((px, 350), "이상해씨", font=font(26), fill=DARK + (255,), anchor="mm")
    ov = Image.new("RGBA", img.size, (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
    od.ellipse((px - 120, py + 112 - 27, px + 120, py + 112 + 27), fill=(159, 198, 224, 255))
    od.ellipse((px - 99, py + 128 - 19, px + 99, py + 128 + 19), fill=(127, 176, 208, 255))
    img.alpha_composite(ov)
    sprite(img, os.path.join(PUB, "items", "1", "1.webp"), px, py, 168)  # 코디(마법사) 착용 미리보기
    # (코디명·가격 텍스트 삭제됨) 구입 버튼만, 위로 올린 위치
    btn(img, px, 640, 232, 62, C_GREEN, "구입  10", 28)
    # 코디 그리드(아래로 + 높이 축소)
    gx0, gtop, pitchX, cellH = 430, 380, 810 / 4, 150
    centers = [(gx0 + pitchX * (c + 0.5), gtop + (i // 4) * cellH + cellH / 2) for i, c in
               [(0, 0), (1, 1), (2, 2), (3, 3), (4, 0)]]
    cw, ch = 184, 138
    for idx, (x, y) in enumerate(centers):
        none = idx == 0
        equipped = none  # 기본 적용중
        cardcol = C_GREEN if equipped else None
        sh = Image.new("RGBA", img.size, (0, 0, 0, 0)); sd = ImageDraw.Draw(sh)
        sd.rounded_rectangle((x - cw / 2, y - ch / 2 + 4, x + cw / 2, y + ch / 2 + 4), 16, fill=(0, 0, 0, 26))
        if equipped:
            sd.rounded_rectangle((x - cw / 2, y - ch / 2, x + cw / 2, y + ch / 2), 16, fill=C_GREEN + (255,))
        else:
            sd.rounded_rectangle((x - cw / 2, y - ch / 2, x + cw / 2, y + ch / 2), 16, fill=(255, 255, 255, 245))
        sd.rounded_rectangle((x - cw / 2, y - ch / 2, x + cw / 2 - 1, y + ch / 2 - 1), 16,
                             outline=(108, 140, 255, 255 if equipped else 128), width=3)
        img.alpha_composite(sh)
        if none:
            ng = Image.new("RGBA", img.size, (0, 0, 0, 0)); nd = ImageDraw.Draw(ng)
            nd.ellipse((x - 30, y - 14 - 30, x + 30, y - 14 + 30), outline=(226, 59, 59, 255), width=7)
            nd.line((x - 21, y - 35, x + 21, y + 7), fill=(226, 59, 59, 255), width=7)
            img.alpha_composite(ng)
            d.text((x, y + 40), "기본", font=font(22), fill=(255, 255, 255) + (255,), anchor="mm")
        else:
            sprite(img, os.path.join(PUB, "items", "1", f"{idx}.webp"), x, y - 22, 84)
            label(img, x, y + 52, "10 🪙", 18, DARK)
    # 선택 링(마법사 코디 셀 — 사진처럼)
    rx, ry = centers[1]
    ov = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(ov).rounded_rectangle((rx - 92, ry - 69, rx + 92, ry + 69), 16, outline=(43, 124, 255, 255), width=6)
    img.alpha_composite(ov)
    save(img, "미리보기_상점.png", "shop_preview.png")


# ─────────────────────────── 지역 선택 ───────────────────────────
def render_region():
    try:
        img = cover(os.path.join(PUB, "bg", "regions.webp"), W, H).convert("RGBA")
    except Exception:
        img = base_bg((207, 233, 255), (155, 200, 255), (216, 232, 255))
    d = ImageDraw.Draw(img)
    btn(img, 110, 56, 150, 58, C_BLUE, "◀ 뒤로", 26)
    d.text((W / 2, 56), "지역 선택", font=font(38), fill=(255, 255, 255, 255),
           anchor="mm", stroke_width=6, stroke_fill=DARK + (255,))
    # 도감/상점은 뒤로 옆(좌측), 코인은 도감과 동일하게 우측 끝, 설정(⚙)은 우측 하단
    btn(img, 272, 56, 134, 56, C_GREEN, "📕 도감", 24)
    btn(img, 416, 56, 134, 56, C_TILE, "🛍 상점", 24)
    # 코인: 도감과 동일 위치(우측 끝, y46)
    draw_emoji(img, "🪙", 1240 - 74, 46, 28)
    d.text((1240, 46), "56", font=font(28), fill=(58, 72, 96, 255), anchor="rm",
           stroke_width=3, stroke_fill=(255, 255, 255, 255))
    # 설정(⚙): 우측 하단 구석, 도형 투명(흰 톱니바퀴만)
    draw_gear_hollow(img, 1235, 682, 26 * 0.6)
    # 지역 카드
    regions = [("관동", "13 / 151"), ("성도", "2 / 100"), ("호연", "0 / 135"),
               ("신오", "0 / 107"), ("하나", "0 / 156"), ("칼로스", "0 / 72"),
               ("알로라", "0 / 88"), ("가라르", "0 / 96"), ("팔데아", "0 / 120")]
    cellW, cellH, sx, sy = 366, 170, 274, 210
    cw, ch, rad = 322, 96, 18
    for i, (nm, cnt) in enumerate(regions):
        x = sx + (i % 3) * cellW
        y = sy + (i // 3) * cellH
        try:
            card = cover(os.path.join(PUB, "bg", f"r{i}.webp"), cw, ch)
            mask = Image.new("L", (cw, ch), 0)
            ImageDraw.Draw(mask).rounded_rectangle((0, 0, cw - 1, ch - 1), rad, fill=255)
            img.paste(card, (int(x - cw / 2), int(y - ch / 2)), mask)
        except Exception as e:
            print("  region img skip", i, e)
        ov = Image.new("RGBA", (cw, ch), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
        od.rounded_rectangle((0, 0, cw - 1, ch - 1), rad, fill=(16, 21, 31, 102))
        od.rounded_rectangle((0, 0, cw - 1, ch - 1), rad, outline=(255, 255, 255, 242), width=4)
        img.alpha_composite(ov, (int(x - cw / 2), int(y - ch / 2)))
        d.text((x, y), f"{nm} 지역", font=font(34), fill=(255, 255, 255, 255),
               anchor="mm", stroke_width=6, stroke_fill=(26, 34, 56, 255))
        d.text((x, y + 66), f"{cnt} 마리", font=font(21), fill=(255, 255, 255, 255),
               anchor="mm", stroke_width=5, stroke_fill=DARK + (255,))
    save(img, "미리보기_지역선택.png", "region_preview.png")


# ─────────────────────────── 스테이지 그리드(지역 내) ───────────────────────────
def render_stages():
    img = cover(os.path.join(PUB, "bg", "r1.webp"), W, H).convert("RGBA")  # 성도 배틀 필드 배경
    d = ImageDraw.Draw(img)
    WS = dict(stroke_width=6, stroke_fill=(22, 35, 63, 255))   # 배경 위 흰글씨 외곽선
    WS2 = dict(stroke_width=4, stroke_fill=(22, 35, 63, 255))
    # 상단바 — 지역 선택과 동일(도감/상점 좌측, 코인 우측끝, ⚙ 우측하단)
    btn(img, 110, 56, 150, 58, C_BLUE, "◀ 지역", 26)
    btn(img, 272, 56, 134, 56, C_GREEN, "📕 도감", 24)
    btn(img, 416, 56, 134, 56, C_TILE, "🛍 상점", 24)
    d.text((W / 2, 24), "성도 지역", font=font(34), fill=(255, 255, 255, 255), anchor="ma", **WS)
    draw_emoji(img, "🪙", 1240 - 74, 46, 28)
    d.text((1240, 46), "99949", font=font(28), fill=(58, 72, 96, 255), anchor="rm", stroke_width=3, stroke_fill=(255, 255, 255, 255))
    draw_gear_hollow(img, 1235, 682, 26 * 0.6)
    d.text((W / 2, 92), "잡은 포켓몬 100 / 100", font=font(22), fill=(255, 255, 255, 255), anchor="mm", **WS2)
    # 포켓몬 노드 6x4 (성도 152~175, 모두 포획=초록 원 + ✓)
    GX0, GY0, GAPX, GAPY = 150, 198, 196, 122
    for i in range(24):
        n = 152 + i
        cx, cy = GX0 + (i % 6) * GAPX, GY0 + (i // 6) * GAPY
        ov = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(ov).ellipse((cx - 46, cy - 46, cx + 46, cy + 46), fill=(217, 245, 217, 255), outline=(54, 164, 90, 255), width=5)
        img.alpha_composite(ov)
        sprite(img, os.path.join(PUB, "sprites", f"{n}.webp"), cx, cy, 76)
        d.text((cx, cy + 50), str(n), font=font(16), fill=(255, 255, 255, 255), anchor="mm", **WS2)
        bx, by = cx + 33, cy - 33
        bd = Image.new("RGBA", img.size, (0, 0, 0, 0))
        bdd = ImageDraw.Draw(bd)
        bdd.ellipse((bx - 13, by - 13, bx + 13, by + 13), fill=(54, 164, 90, 255), outline=(255, 255, 255, 255), width=3)
        bdd.line([(bx - 5, by + 1), (bx - 1, by + 5), (bx + 6, by - 5)], fill=(255, 255, 255, 255), width=3, joint="curve")
        img.alpha_composite(bd)
    # 페이지 네비
    btn(img, W / 2 - 150, 680, 92, 52, C_GRAY, "◀", 26)
    btn(img, W / 2 + 150, 680, 92, 52, C_BLUE, "▶", 26)
    d.text((W / 2, 680), "1 / 5  (좌우로 넘겨요)", font=font(20), fill=(255, 255, 255, 255), anchor="mm", **WS2)
    save(img, "미리보기_스테이지.png", "stages_preview.png")


if __name__ == "__main__":
    for name, fn in [("설정", render_settings), ("상점", render_shop), ("지역", render_region), ("스테이지", render_stages)]:
        try:
            fn()
        except Exception as e:
            import traceback
            print(name, "실패:", e)
            traceback.print_exc()
