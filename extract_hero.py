# -*- coding: utf-8 -*-
"""주인공.png에서 체크무늬 배경 + 홀로그램 글로우 제거 → 캐릭터만 추출(마젠타 생성 후 키잉) → public/ash.png.
Gemini image-to-image. ADC 자체설정. 검토용 _ash_extracted.png(마젠타 합성)도 생성."""
import os, sys, io, time
os.environ.setdefault("GOOGLE_APPLICATION_CREDENTIALS",
                      r"C:\Users\김민성\AppData\Roaming\gcloud\application_default_credentials.json")
os.environ.pop("GOOGLE_API_KEY", None)
os.environ.pop("GEMINI_API_KEY", None)
from PIL import Image
from google import genai
from google.genai import types
import split_sheet as ss
try:
    sys.stdout.reconfigure(errors="replace")
except Exception:
    pass

ROOT = os.path.dirname(os.path.abspath(__file__))
client = genai.Client(vertexai=True, project=os.environ.get("GCP_PROJECT", "project-c17dc3ff-01ee-4606-ab3"), location="global")

PROMPT = (
    "From the provided reference image, extract ONLY the boy character — a young boy wearing a yellow Pikachu-ear "
    "cap with goggles on top, a blue sleeveless hooded vest over a white shirt with a red stripe, dark navy shorts, "
    "and blue-and-white sneakers, hands in his pockets, standing and facing forward. "
    "COMPLETELY REMOVE the checkerboard pattern background AND every glowing holographic effect around him: the warm "
    "golden aura and rim glow, the blue and cyan holographic ring and the cylinder of light, and all light particles "
    "and streaks. Render the clean character ALONE, full body, exactly as in the reference (same pose, outfit, face), "
    "with NO glow and NO effects, placed on ONE SINGLE SOLID FLAT MAGENTA (#FF00FF, RGB 255,0,255) background that "
    "fills the entire image. No checkerboard, no transparency, no glow, no frame, no shadow, no text. "
    "Do NOT use magenta, pink, or purple anywhere on the character."
)


def gen(ref):
    for a in range(8):
        try:
            r = client.models.generate_content(
                model="gemini-2.5-flash-image", contents=[PROMPT, ref],
                config=types.GenerateContentConfig(response_modalities=["IMAGE"]))
            for part in r.candidates[0].content.parts:
                d = getattr(part, "inline_data", None)
                if d and getattr(d, "data", None):
                    return Image.open(io.BytesIO(d.data))
            return None
        except Exception as e:
            s = str(e).lower()
            if any(k in s for k in ("429", "resource_exhausted", "503", "500", "unavailable")) and a < 7:
                print("  retry"); time.sleep(min(20 * (a + 1), 120)); continue
            if a < 7:
                time.sleep(min(20 * (a + 1), 120)); continue
            print("ERR", str(e)[:120]); return None
    return None


def main():
    ref = Image.open(r"C:\Users\김민성\Downloads\주인공.png").convert("RGB")
    print("생성중...")
    img = gen(ref)
    if img is None:
        print("실패"); sys.exit(1)
    img = img.convert("RGBA")
    bg = ss.sample_bg(img)
    cell = ss.clear_bg(img, bg)  # 마젠타 키잉
    bbox = cell.getchannel("A").getbbox()
    if bbox:
        cell = cell.crop(bbox)
    s = 720 / max(cell.size)
    cell = cell.resize((int(cell.width * s), int(cell.height * s)), Image.LANCZOS)
    cell.save(os.path.join(ROOT, "public", "ash.png"))
    prev = Image.new("RGB", (cell.width + 60, cell.height + 60), (255, 0, 255))
    prev.paste(cell, (30, 30), cell)
    prev.save(os.path.join(ROOT, "_ash_extracted.png"))
    print("ash.png:", cell.size)


if __name__ == "__main__":
    main()
