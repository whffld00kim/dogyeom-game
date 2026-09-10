# -*- coding: utf-8 -*-
"""_book_prompts.json → 고급 책/앨범 배경 생성 + '균일 슬롯 격자(UI 포켓몬 위치 정렬) + 책 속 포켓몬' 합성 미리보기.
슬롯 격자는 DexScene 그리드(6열x4행, startX150 cellW196 topY236 cellH110)에 정확히 정렬.
출력: bg_candidates/_cand_{name}.webp(책 원본), _bookcands.png(합성 몽타주).
"""
import os, sys, io, time, json
os.environ.setdefault("GOOGLE_APPLICATION_CREDENTIALS",
                      r"C:\Users\김민성\AppData\Roaming\gcloud\application_default_credentials.json")
os.environ.pop("GOOGLE_API_KEY", None)
os.environ.pop("GEMINI_API_KEY", None)
from PIL import Image, ImageDraw, ImageFont
from google import genai
from google.genai import types
try:
    sys.stdout.reconfigure(errors="replace")
except Exception:
    pass

ROOT = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(ROOT, "bg_candidates")
SPR = os.path.join(ROOT, "public", "sprites")
os.makedirs(CAND, exist_ok=True)
client = genai.Client(vertexai=True, project=os.environ.get("GCP_PROJECT", "project-c17dc3ff-01ee-4606-ab3"), location="global")
W, H = 1280, 720
# DexScene 그리드와 동일
COLS, ROWS, CW, CH, TOPY = 6, 4, 196, 110, 236
STARTX = W // 2 - (COLS - 1) * CW // 2  # 150
# 채울 포켓몬(앞 2행=잡음, 뒤 2행=빈 슬롯)
FILL = [(1, "이상해씨"), (4, "파이리"), (7, "꼬부기"), (25, "피카츄"), (133, "이브이"), (52, "나옹"),
        (6, "리자몽"), (9, "거북왕"), (94, "팬텀"), (130, "갸라도스"), (143, "잠만보"), (151, "뮤")]


def gen(prompt):
    for a in range(12):
        try:
            resp = client.models.generate_content(
                model="gemini-2.5-flash-image", contents=[prompt],
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"], image_config=types.ImageConfig(aspect_ratio="16:9")))
            for part in resp.candidates[0].content.parts:
                d = getattr(part, "inline_data", None)
                if d and getattr(d, "data", None):
                    return Image.open(io.BytesIO(d.data))
            return None
        except Exception as e:
            s = str(e).lower()
            if any(k in s for k in ("429", "resource_exhausted", "503", "500", "unavailable", "deadline")) and a < 11:
                print(f"  retry"); time.sleep(min(20 * (a + 1), 120)); continue
            print("  ERR", str(e)[:100])
            if a < 11:
                time.sleep(min(20 * (a + 1), 120)); continue
            return None
    return None


def font(sz):
    try:
        return ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", sz)
    except Exception:
        return ImageFont.load_default()


def txt(d, xy, s, sz, fill, sw=0):
    d.text(xy, s, font=font(sz), fill=fill, stroke_fill=(255, 255, 255, 255), stroke_width=sw, anchor="mm")


def build_book(bgpath):
    img = Image.open(bgpath).convert("RGB").resize((W, H), Image.LANCZOS).convert("RGBA")
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    # 균일 슬롯 격자(6x4) — 책 속 포켓몬 주머니. UI 위치 정렬.
    sw_, sh_ = 172, 104
    for r in range(ROWS):
        for c in range(COLS):
            x = STARTX + c * CW
            y = TOPY + r * CH + 10
            box = (x - sw_ / 2, y - sh_ / 2, x + sw_ / 2, y + sh_ / 2)
            # 살짝 들어간 주머니: 옅은 크림 채움 + 얇은 금색 테두리 + 상단 옅은 음영
            d.rounded_rectangle(box, 16, fill=(255, 250, 238, 46), outline=(168, 138, 78, 205), width=2)
            d.line((x - sw_ / 2 + 8, y - sh_ / 2 + 3, x + sw_ / 2 - 8, y - sh_ / 2 + 3), fill=(90, 70, 40, 50), width=2)
    # 상단 탭(관동 초록/나머지 다크글래스) + 뒤로
    d.rounded_rectangle((26, 24, 166, 80), 12, fill=(16, 21, 31, 120))
    names = ["관동", "성도", "호연", "신오", "하나", "칼로스", "알로라", "가라르", "팔데아"]
    n = len(names); tabW = min(150, 1180 // n - 8); pitch = tabW + 8; sx = W / 2 - ((n - 1) * pitch) / 2
    for i in range(n):
        cx = sx + i * pitch
        d.rounded_rectangle((cx - tabW / 2, 103, cx + tabW / 2, 153), 12, fill=(46, 158, 79, 255) if i == 0 else (16, 21, 31, 120))
    img = Image.alpha_composite(img, ov)
    # 포켓몬(앞 12칸 채움) — 슬롯 안에
    for k, (pid, _nm) in enumerate(FILL):
        c = k % COLS; r = k // COLS
        x = STARTX + c * CW; y = TOPY + r * CH
        p = os.path.join(SPR, f"{pid}.webp")
        if os.path.exists(p):
            sp = Image.open(p).convert("RGBA"); sp.thumbnail((76, 76))
            img.paste(sp, (int(x - sp.width / 2), int(y - sp.height / 2 - 6)), sp)
    # 글자
    d2 = ImageDraw.Draw(img)
    txt(d2, (W / 2, 40), "포켓몬 도감", 40, (43, 58, 103, 255), 5)
    txt(d2, (96, 52), "◀ 뒤로", 23, (255, 255, 255, 255), 0)
    for i, nm in enumerate(names):
        txt(d2, (sx + i * pitch, 128), nm, 21, (255, 255, 255, 255), 0)
    txt(d2, (W / 2, 192), "관동 지역 · 12 / 151 마리", 24, (43, 58, 103, 255), 4)
    for k, (pid, nm) in enumerate(FILL):
        c = k % COLS; r = k // COLS
        x = STARTX + c * CW; y = TOPY + r * CH
        txt(d2, (x, y + 40), nm, 17, (43, 58, 103, 255), 3)
    # 빈 슬롯(뒤 2행) 물음표
    for r in range(2, ROWS):
        for c in range(COLS):
            x = STARTX + c * CW; y = TOPY + r * CH
            txt(d2, (x, y - 4), "?", 38, (150, 120, 70, 230), 0)
            txt(d2, (x, y + 40), "???", 16, (120, 100, 70, 220), 0)
    return img.convert("RGB")


def main():
    prompts = json.load(open(os.path.join(ROOT, "_book_prompts.json"), encoding="utf-8"))
    comps = []
    for i, item in enumerate(prompts, 1):
        name = f"book{i}"
        cand = os.path.join(CAND, f"_cand_{name}.webp")
        if not os.path.exists(cand):
            print(f"[{i}] 생성: {item['label']}")
            img = gen(item["prompt"])
            if img is None:
                print(f"  실패 {i}"); continue
            img.convert("RGB").resize((W, H), Image.LANCZOS).save(cand, "WEBP", quality=90)
        comps.append((i, item["label"], build_book(cand).resize((560, 315), Image.LANCZOS)))
        print(f"  OK {i}")
    pad = 30
    out = Image.new("RGB", (560, (315 + pad) * len(comps)), (24, 24, 28))
    dr = ImageDraw.Draw(out)
    for k, (i, lab, comp) in enumerate(comps):
        y = k * (315 + pad)
        dr.text((6, y + 4), f"{i}. {lab}", font=font(20), fill=(255, 235, 150))
        out.paste(comp, (0, y + pad))
    out.save(os.path.join(ROOT, "_bookcands.png"))
    print(f"몽타주: _bookcands.png ({len(comps)})")


if __name__ == "__main__":
    main()
