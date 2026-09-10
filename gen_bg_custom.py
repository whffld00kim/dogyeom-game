# -*- coding: utf-8 -*-
"""임의 프롬프트로 도감 배경 후보 1장 생성 → bg_candidates/_cand_{name}.webp (1280x720).
ADC 자체설정(와이프 프로젝트). 사용: python gen_bg_custom.py <name> "<prompt>"
"""
import os, sys, io, time
os.environ.setdefault("GOOGLE_APPLICATION_CREDENTIALS",
                      r"C:\Users\김민성\AppData\Roaming\gcloud\application_default_credentials.json")
os.environ.pop("GOOGLE_API_KEY", None)
os.environ.pop("GEMINI_API_KEY", None)
from PIL import Image
from google import genai
from google.genai import types, errors
try:
    sys.stdout.reconfigure(errors="replace")
except Exception:
    pass

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "bg_candidates")
os.makedirs(OUT, exist_ok=True)
client = genai.Client(vertexai=True, project=os.environ.get("GCP_PROJECT", "project-c17dc3ff-01ee-4606-ab3"), location="global")


def gen(prompt):
    for a in range(10):
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
        except errors.APIError as e:
            s = str(e).lower()
            if any(k in s for k in ("429", "resource_exhausted", "503", "500", "unavailable", "deadline")) and a < 9:
                w = min(20 * (a + 1), 120); print(f"  retry {w}s"); time.sleep(w); continue
            raise
        except Exception:
            if a < 9:
                time.sleep(min(20 * (a + 1), 120)); continue
            raise
    return None


def main():
    name, prompt = sys.argv[1], sys.argv[2]
    print(f"gen {name} ...")
    img = gen(prompt)
    if img is None:
        print(f"FAIL {name}"); sys.exit(1)
    img = img.convert("RGB").resize((1280, 720), Image.LANCZOS)
    p = os.path.join(OUT, f"_cand_{name}.webp")
    img.save(p, "WEBP", quality=90)
    print(f"OK {name} -> {p}")


if __name__ == "__main__":
    main()
