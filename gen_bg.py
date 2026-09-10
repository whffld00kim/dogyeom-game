#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""배경 이미지 생성 (텍스트→이미지, 참조 없음). 16:9 → 1280x720 webp. 검토용 _new_ 접두.
인증: ADC(gcloud auth application-default login) — 와이프 프로젝트.
사용: python gen_bg.py dexA   |   python gen_bg.py dexB   |   python gen_bg.py regions
"""
import sys, io, os, time
from PIL import Image
from google import genai
from google.genai import types, errors

try:
    sys.stdout.reconfigure(errors="replace")
except Exception:
    pass

ROOT = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.environ.get("GCP_PROJECT", "project-c17dc3ff-01ee-4606-ab3")
client = genai.Client(vertexai=True, project=PROJECT, location="global")  # ADC

_DEX_COMMON = (
    "Absolutely NO characters, NO creatures, NO pokemon, NO text, NO letters, NO UI buttons. "
    "The whole image, especially the center, must stay light, soft and uncluttered so that a grid of colorful "
    "creature icons and dark-blue labels with white outlines placed on top remain perfectly readable. "
    "Flat, soft, friendly storybook art, low contrast, calm palette, gentle and cohesive with a cute rounded kids' UI."
)
PROMPTS = {
    # A: 부드러운 수집앨범 느낌 (따뜻한 크림 + 옅은 둥근 패널)
    "dexA": (
        "A soft, cozy background for a children's collection-album / Pokédex screen. Warm cream and pale mint "
        "tones, a very subtle large rounded panel in the center, faint soft rounded corner decorations, gentle "
        "soft shadows, a few tiny faint sparkles. Looks like a friendly sticker-album page. " + _DEX_COMMON
    ),
    # B: 부드러운 하늘/민트 그라데이션 + 상단 옅은 구름 (현재 개선판, 더 밝고 깔끔)
    "dexB": (
        "A very light, airy background for a children's Pokédex screen. Smooth pastel gradient from soft "
        "sky-blue at the top to pale mint-green at the bottom, a few small soft white clouds only near the top "
        "edge, a hint of soft sparkles, the entire center kept very light and almost empty. " + _DEX_COMMON
    ),
    # C: 옅은 보라/하늘 + 아주 옅은 큰 몬스터볼 워터마크(코너) — 도감 테마
    "dexC": (
        "A soft pastel background for a children's Pokédex screen. Gentle lavender-to-sky-blue gradient, with a "
        "couple of very faint, very low-contrast large circle motifs (like soft watermark bubbles) only in the "
        "far corners, soft and dreamy. The center stays light and clean. " + _DEX_COMMON
    ),
    "regions": (
        "A warm, inviting background illustration for a Pokémon-style region-select map screen in a cute kids' "
        "game. A soft stylized adventure world vista: gentle rolling green hills, a winding light path, distant "
        "soft blue mountains, a calm pastel sky with soft clouds, a few trees, cheerful and friendly. Flat, "
        "soft, storybook art style, cohesive with a cute rounded kids' UI, pastel palette, not too busy. "
        "Absolutely NO characters, NO creatures, NO text, NO UI buttons. Keep it soft so rounded menu buttons stay readable."
    ),
}


def extract(resp):
    try:
        for part in resp.candidates[0].content.parts:
            d = getattr(part, "inline_data", None)
            if d and getattr(d, "data", None):
                return Image.open(io.BytesIO(d.data))
    except Exception:
        pass
    return None


def gen(prompt):
    for attempt in range(6):
        try:
            resp = client.models.generate_content(
                model="gemini-2.5-flash-image", contents=[prompt],
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"], image_config=types.ImageConfig(aspect_ratio="16:9")))
            return extract(resp)
        except errors.APIError as e:
            s = str(e).lower()
            if ("429" in s or "resource_exhausted" in s or "503" in s) and attempt < 5:
                print(f"  한도 - {30*(attempt+1)}s 대기"); time.sleep(30 * (attempt + 1)); continue
            raise
    return None


def main():
    name = sys.argv[1] if len(sys.argv) > 1 else "dexB"
    prompt = PROMPTS.get(name)
    if not prompt:
        print("이름:", ", ".join(PROMPTS)); return
    print(f"생성중: {name} ...")
    img = gen(prompt)
    if img is None:
        print("실패(이미지 없음)"); return
    img = img.convert("RGB").resize((1280, 720), Image.LANCZOS)
    out = os.path.join(ROOT, "public", "bg", f"_new_{name}.webp")
    img.save(out, "WEBP", quality=90)
    print("저장:", out)


if __name__ == "__main__":
    main()
