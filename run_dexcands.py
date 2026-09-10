# -*- coding: utf-8 -*-
"""_prompts.json(list of {label,prompt})을 읽어 후보 배경 순차 생성 + 도감 UI 합성 + 몽타주.
ADC 자체설정. 재개 가능(이미 생성된 _cand_NN.webp는 건너뜀). 스로틀 안전(순차).
출력: bg_candidates/_cand_NN.webp(원본), _dexcands.png(합성 몽타주, 루트).
"""
import os, sys, io, time, json
os.environ.setdefault("GOOGLE_APPLICATION_CREDENTIALS",
                      r"C:\Users\김민성\AppData\Roaming\gcloud\application_default_credentials.json")
os.environ.pop("GOOGLE_API_KEY", None)
os.environ.pop("GEMINI_API_KEY", None)
from PIL import Image, ImageDraw, ImageFont
from google import genai
from google.genai import types, errors
from dex_preview import build  # 도감 UI 목업 합성
try:
    sys.stdout.reconfigure(errors="replace")
except Exception:
    pass

ROOT = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(ROOT, "bg_candidates")
os.makedirs(CAND, exist_ok=True)
client = genai.Client(vertexai=True, project=os.environ.get("GCP_PROJECT", "project-c17dc3ff-01ee-4606-ab3"), location="global")


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
            transient = any(k in s for k in ("429", "resource_exhausted", "503", "500", "unavailable", "deadline", "timeout"))
            if transient and a < 11:
                w = min(20 * (a + 1), 120); print(f"  retry {w}s"); time.sleep(w); continue
            print(f"  ERR: {str(e)[:120]}")
            if a < 11:
                time.sleep(min(20 * (a + 1), 120)); continue
            return None
    return None


def font(sz):
    try:
        return ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", sz)
    except Exception:
        return ImageFont.load_default()


def main():
    prompts = json.load(open(os.path.join(ROOT, "_prompts.json"), encoding="utf-8"))
    comps = []
    for i, item in enumerate(prompts, 1):
        cand = os.path.join(CAND, f"_cand_{i:02d}.webp")
        if not os.path.exists(cand):
            print(f"[{i}/{len(prompts)}] 생성: {item.get('label','')}")
            img = gen(item["prompt"])
            if img is None:
                print(f"  실패 {i}"); continue
            img.convert("RGB").resize((1280, 720), Image.LANCZOS).save(cand, "WEBP", quality=90)
        comp = build(cand).resize((520, 293), Image.LANCZOS)
        comps.append((i, item.get("label", f"후보{i}"), comp))
        print(f"  OK {i}")
    # 몽타주 2열 x 5행
    cols = 2; cellW = 520; cellH = 293; pad = 30
    rows = (len(comps) + cols - 1) // cols
    out = Image.new("RGB", (cols * cellW, rows * (cellH + pad)), (24, 24, 28))
    dr = ImageDraw.Draw(out)
    for k, (i, lab, comp) in enumerate(comps):
        cx = (k % cols) * cellW
        cy = (k // cols) * (cellH + pad)
        dr.text((cx + 6, cy + 4), f"{i}. {lab}", font=font(20), fill=(255, 255, 120))
        out.paste(comp, (cx, cy + pad))
    out.save(os.path.join(ROOT, "_dexcands.png"))
    print(f"몽타주 저장: _dexcands.png ({len(comps)}개)")


if __name__ == "__main__":
    main()
