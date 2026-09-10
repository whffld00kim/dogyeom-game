#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""1장씩(단일 피사체) 코디 생성 — 격자 없이 한 마리에 한 코디씩, 마리당 PER장.
단일 피사체라 잘림/침범/중복/격자오인이 원천적으로 없음. 마젠타 배경 → 키잉 → 384 webp + 매니페스트.
재개 가능: 이미 PER장 있는 마리는 건너뛰고, 부분만 된 마리는 이어서 채움.

⚠ 2026-09-03: 그림 생성을 더 쓰지 않아 서비스계정(gemini-image@minsung-buboo2)을 삭제했고
   vertex-key.json 도 지웠다. 다시 쓰려면 새 서비스계정을 만들고 키를 저장소 밖(~/.claude/)에 둘 것.

사전준비: vertex-key.json(서비스계정 키), pip install google-genai google-auth pillow
사용:
  python gen_single.py            # 359~1025 전체
  python gen_single.py 359 400    # 범위 지정
"""
import os, sys, io, time, json
from PIL import Image
from google import genai
from google.genai import types, errors
from google.oauth2 import service_account
import split_sheet as ss  # sample_bg, clear_bg 재사용

try:
    sys.stdout.reconfigure(errors="replace")
except Exception:
    pass

ROOT = os.path.dirname(os.path.abspath(__file__))
SPRITES = os.path.join(ROOT, "public", "sprites")
ITEMS = os.path.join(ROOT, "public", "items")
MANIFEST = os.path.join(ROOT, "src", "data", "outfits.json")
VERTEX_KEY_JSON = os.path.join(ROOT, "vertex-key.json")
MODEL = "gemini-2.5-flash-image"
TARGET = 384
PRICE = 10
PER = 10          # 마리당 코디 수
DELAY = 4

# 서로 다른 코디 테마(마리당 앞에서 PER개 사용 → 다양성 보장)
THEMES = [
    "a wizard hat and a glowing magic staff",
    "a golden crown and a royal red cape",
    "large white feathered angel wings and a glowing golden halo",
    "a black pirate captain hat with a skull emblem and an eyepatch",
    "a white chef's hat and a cooking apron",
    "a brown cowboy hat and a red bandana",
    "a graduation cap and a rolled diploma",
    "a red Santa hat and a fluffy red scarf",
    "a detective deerstalker hat and a magnifying glass",
    "a shiny silver knight helmet and a steel sword",
    "a colorful flower crown and green leafy vines",
    "a black top hat and a gold monocle",
    "a ninja headband and a katana on the back",
    "a cone party hat and floating colorful balloons",
    "a wide straw sombrero and maracas",
    "a warm winter beanie and a thick wool scarf",
    "a superhero eye mask and a flowing cape",
    "a blue baseball cap and a sports jersey",
    "big headphones and a school backpack",
    "a horned viking helmet and a fur cloak",
    "a jester hat with jingling bells",
    "a sailor hat and a rope anchor",
    "a sparkling tiara and a pearl necklace",
    "an explorer pith helmet and binoculars",
    "small red devil horns and a pointed tail",
]


def make_client():
    # ADC(gcloud auth application-default login) 인증 — 와이프 계정 프로젝트($300 크레딧)
    project = os.environ.get("GCP_PROJECT", "project-c17dc3ff-01ee-4606-ab3")
    print(f"Vertex AI (project={project}, ADC 인증), 마리당 {PER}장")
    return genai.Client(vertexai=True, project=project, location="global")


def sprite_for(pid):
    for ext in (".webp", ".png"):
        p = os.path.join(SPRITES, f"{pid}{ext}")
        if os.path.exists(p):
            return p
    return None


def webp_count(outdir):
    if not os.path.isdir(outdir):
        return 0
    return len([f for f in os.listdir(outdir) if f.endswith(".webp")])


def extract_image(resp):
    try:
        for part in resp.candidates[0].content.parts:
            d = getattr(part, "inline_data", None)
            if d and getattr(d, "data", None):
                return Image.open(io.BytesIO(d.data))
    except Exception:
        pass
    return None


def gen_one(client, sprite_img, theme):
    """단일 코디 1장 생성. 한도(429)·서버 일시 오류(500/503)·네트워크 끊김 모두 대기 후 재시도.
    8회 연속 실패(=크레딧 소진/권한 등 진짜 문제)에만 예외 발생(상위에서 원인 출력 후 중단)."""
    prompt = (
        f"Draw the Pokemon shown in the provided reference image, full body, centered and large, "
        f"wearing {theme}. "
        f"Place it on ONE SINGLE SOLID FLAT MAGENTA (#FF00FF, RGB 255,0,255) background that fills the "
        f"ENTIRE image — absolutely no checkerboard, no transparency, no frame, no border, no shadow. "
        f"The items must NOT cover the Pokemon's face. "
        f"Do NOT use magenta, pink, or purple for the Pokemon or its items (those colors are background-only "
        f"and would be removed)."
    )
    for attempt in range(8):
        try:
            resp = client.models.generate_content(
                model=MODEL, contents=[prompt, sprite_img],
                config=types.GenerateContentConfig(response_modalities=["IMAGE"]))
            return extract_image(resp)
        except errors.APIError as e:
            s = str(e).lower()
            transient = ("429" in s or "resource_exhausted" in s or "503" in s
                         or "500" in s or "internal" in s or "unavailable" in s
                         or "deadline" in s or "timeout" in s or "overloaded" in s)
            if transient and attempt < 7:
                w = min(30 * (attempt + 1), 120)
                print(f"    일시 오류 - {w}s 대기 후 재시도 ({str(e)[:100]})")
                time.sleep(w)
                continue
            raise
        except Exception as e:  # 네트워크 끊김 등 SDK 밖 일시 오류도 재시도
            if attempt < 7:
                w = min(30 * (attempt + 1), 120)
                print(f"    네트워크/기타 오류 - {w}s 대기 후 재시도 ({type(e).__name__}: {str(e)[:100]})")
                time.sleep(w)
                continue
            raise
    return None


def key_normalize(img):
    img = img.convert("RGBA")
    bg = ss.sample_bg(img)
    cell = ss.clear_bg(img, bg)  # 마젠타 키잉
    bbox = cell.getchannel("A").getbbox()
    if not bbox:
        return None
    cell = cell.crop(bbox)
    w, h = cell.size
    s = max(w, h)
    sq = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    sq.paste(cell, ((s - w) // 2, (s - h) // 2))
    return sq.resize((TARGET, TARGET), Image.LANCZOS)


def load_manifest():
    if os.path.exists(MANIFEST):
        with open(MANIFEST, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_manifest(data):
    os.makedirs(os.path.dirname(MANIFEST), exist_ok=True)
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def write_pid_manifest(data, pid, n):
    data[str(pid)] = [
        {"id": f"o{pid}_{k}", "name": f"코디 {k}", "price": PRICE, "file": f"items/{pid}/{k}.webp"}
        for k in range(1, n + 1)
    ]
    save_manifest(data)


def main():
    lo = int(sys.argv[1]) if len(sys.argv) > 1 else 359
    hi = int(sys.argv[2]) if len(sys.argv) > 2 else 1025
    if not os.path.exists(VERTEX_KEY_JSON):
        print("❌ vertex-key.json 없음. 서비스계정 키 파일을 프로젝트 폴더에 두세요.")
        return
    # 예산 가드: GEN_MAX_NEW 환경변수 = 이번 실행에서 새로 저장할 최대 장수 (0/없음 = 무제한)
    max_new = int(os.environ.get("GEN_MAX_NEW", "0") or 0)
    made_new = 0
    if max_new:
        print(f"예산 가드: 이번 실행 최대 {max_new}장")
    client = make_client()
    data = load_manifest()

    todo = [p for p in range(lo, hi + 1) if sprite_for(p) and webp_count(os.path.join(ITEMS, str(p))) < PER]
    print(f"범위 {lo}~{hi}: 생성/보완할 마리 {len(todo)}")

    for pid in todo:
        outdir = os.path.join(ITEMS, str(pid))
        os.makedirs(outdir, exist_ok=True)
        made = webp_count(outdir)
        sprite = Image.open(sprite_for(pid)).convert("RGBA")
        fails = 0
        while made < PER:
            theme = THEMES[made % len(THEMES)]
            try:
                raw = gen_one(client, sprite, theme)
            except Exception as e:
                print(f"\n⛔ pid {pid}에서 중단 — 원인: {type(e).__name__}: {str(e)[:300]}")
                print("   다시 실행하면 이어서 진행됩니다.")
                write_pid_manifest(data, pid, made)  # 부분 생성분도 매니페스트 반영
                return
            if raw is None:
                fails += 1
                if fails > 20:
                    print(f"  pid {pid}: 응답 실패 누적 - 다음 마리로")
                    break
                continue
            norm = key_normalize(raw)
            if norm is None:
                fails += 1
                continue
            made += 1
            norm.save(os.path.join(outdir, f"{made}.webp"), "WEBP", quality=82, method=4)
            print(f"  pid {pid}: {made}/{PER}  ({theme})")
            made_new += 1
            if max_new and made_new >= max_new:
                write_pid_manifest(data, pid, made)
                print(f"\n💰 예산 한도({max_new}장) 도달 — 안전 중지. 잔액 재확인 후 다시 실행하면 이어집니다.")
                return
            time.sleep(DELAY)
        write_pid_manifest(data, pid, made)
        print(f"  pid {pid} 완료: {made}장")

    print("\n✅ 끝(또는 한도 도달). 다시 실행하면 남은 마리부터 이어서 진행됩니다.")
    print("   다 되면 빌드만 하면 앱에 반영됩니다.")


if __name__ == "__main__":
    main()
