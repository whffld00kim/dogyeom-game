#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""359~1025 포켓몬 코디 격자 시트를 Gemini 이미지 API(나노바나나)로 자동 생성.

⚠ 2026-09-03: 그림 생성을 더 쓰지 않아 서비스계정(gemini-image@minsung-buboo2)을 삭제했고
   vertex-key.json 도 지웠다. 다시 쓰려면 새 서비스계정을 만들고 키를 저장소 밖(~/.claude/)에 둘 것.

무료 한도껏 돌리다가 일일 한도(429)가 소진되면 깔끔히 멈춥니다.
다음 날 다시 실행하면 "이미 생성/분할된 포켓몬은 건너뛰고" 이어서 진행합니다.

[사전 준비]
  1) pip install -U google-genai pillow
  2) Google AI Studio(https://aistudio.google.com)에서 API 키 발급
  3) 환경변수 설정 (PowerShell):  $env:GEMINI_API_KEY = "발급받은키"

[사용]
  python gen_outfits.py            # 359~1025 전체
  python gen_outfits.py 359 380    # 범위 지정(테스트 권장: python gen_outfits.py 359 363)

생성 결과는 public/items/{id}.png 로 저장됩니다. (이후 process_batch.py 로 분할 → 빌드)
"""
import os
import sys
import io
import time

from PIL import Image
from google import genai
from google.genai import types, errors

# Windows 한글(cp949) 콘솔에서 이모지/엠대시(—) 출력 시 크래시 방지(인코딩 불가 문자는 ? 로 대체)
try:
    sys.stdout.reconfigure(errors="replace")
    sys.stderr.reconfigure(errors="replace")
except Exception:
    pass

ROOT = os.path.dirname(os.path.abspath(__file__))
SPRITES = os.path.join(ROOT, "public", "sprites")
ITEMS = os.path.join(ROOT, "public", "items")  # 생성 시트 출력(이후 process_batch가 분할)
SHEETS = os.path.join(ROOT, "sheets")          # 이미 분할된 원본 위치(중복 생성 방지)

MODEL = "gemini-2.5-flash-image"   # 무료 친화. 더 좋은 품질: "gemini-3.1-flash-image"
DELAY_BETWEEN = 5                  # 호출 간 간격(초). 어차피 429 재시도(30s)가 페이스 조절하므로 짧게
MAX_RPM_RETRY = 5                  # 분당 한도 429 재시도 횟수(계속 막히면 일일 한도로 간주하고 종료)

# Vertex AI 서비스계정 인증(권장·확실): 이 경로에 키 JSON을 두면 자동 사용. ⚠️ 공개 저장소에 올리지 말 것!
VERTEX_KEY_JSON = os.path.join(ROOT, "vertex-key.json")
VERTEX_LOCATION = "global"         # 이미지 모델 지원 위치. 안 되면 "us-central1" 로 변경

PROMPT = (
    "Draw a clean 4x5 grid (4 columns, 5 rows = 20 equal rectangular cells) outlined by THICK SOLID BLACK "
    "GRID LINES (like a spreadsheet table) over a flat solid MAGENTA (hex #FF00FF, RGB 255,0,255) background.\n"
    "Inside EACH of the 20 cells, place the SAME Pokemon (from the provided reference image), centered, "
    "wearing a DIFFERENT unique set of in-game items/accessories (hats, scarves, capes, crowns, wings, etc.). "
    "CRITICAL: keep each Pokemon AND all of its items ENTIRELY INSIDE its own cell with a clear margin — "
    "nothing may touch, overlap, or cross the black grid lines. Behind each Pokemon, inside the cell, use the "
    "same flat magenta (no checkerboard, no transparency, no shadows).\n"
    "All 20 cells must be CLEARLY DIFFERENT; do NOT repeat any outfit and do NOT leave any Pokemon plain or bare. "
    "Do NOT use magenta, pink, or purple for any item (those colors are background-only and would disappear). "
    "Keep the Pokemon at the same size and pose in every cell."
)


def already_done(pid):
    if os.path.exists(os.path.join(ITEMS, f"{pid}.png")):      # 생성됨(분할 대기)
        return True
    if os.path.exists(os.path.join(SHEETS, f"{pid}.png")):     # 분할되어 sheets/로 이동됨
        return True
    d = os.path.join(ITEMS, str(pid))
    if os.path.isdir(d) and any(f.endswith(".webp") for f in os.listdir(d)):  # 분할 완료
        return True
    return False


def sprite_for(pid):
    for ext in (".webp", ".png"):
        p = os.path.join(SPRITES, f"{pid}{ext}")
        if os.path.exists(p):
            return p
    return None


def extract_image(resp):
    try:
        for part in resp.candidates[0].content.parts:
            d = getattr(part, "inline_data", None)
            if d and getattr(d, "data", None):
                return Image.open(io.BytesIO(d.data))
    except Exception:
        pass
    return None


# image_config(비율 4:5) 지원 SDK면 사용, 아니면 자동으로 빼고 호출
_use_cfg = [True]


def generate(client, img):
    # response_modalities=["IMAGE"]는 항상 지정(이미지 출력 보장). 비율(aspect)만 선택적.
    if _use_cfg[0]:
        try:
            return client.models.generate_content(
                model=MODEL,
                contents=[PROMPT, img],
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                    image_config=types.ImageConfig(aspect_ratio="4:5"),
                ),
            )
        except (TypeError, AttributeError, ValueError):
            _use_cfg[0] = False  # 이 SDK/백엔드는 image_config(비율) 미지원 → 이후엔 비율 없이
    return client.models.generate_content(
        model=MODEL,
        contents=[PROMPT, img],
        config=types.GenerateContentConfig(response_modalities=["IMAGE"]),
    )


def is_daily_quota(e):
    m = str(e).lower()
    return any(k in m for k in ("perday", "per day", "per-day", "daily"))


def make_client():
    """인증 우선순위: ① 서비스계정 JSON(Vertex AI, 권장·확실) ② AQ.키→Vertex express ③ AIza키→Developer API."""
    cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not (cred_path and os.path.exists(cred_path)):
        cred_path = VERTEX_KEY_JSON if os.path.exists(VERTEX_KEY_JSON) else None
    if cred_path:
        from google.oauth2 import service_account
        creds = service_account.Credentials.from_service_account_file(
            cred_path, scopes=["https://www.googleapis.com/auth/cloud-platform"])
        print(f"백엔드: Vertex AI (서비스계정 {os.path.basename(cred_path)}, project={creds.project_id}, loc={VERTEX_LOCATION})")
        return genai.Client(vertexai=True, project=creds.project_id, location=VERTEX_LOCATION, credentials=creds)
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("❌ 인증 없음. vertex-key.json(서비스계정 키 파일)을 두거나 GEMINI_API_KEY를 설정하세요.")
        sys.exit(1)
    use_vertex = api_key.startswith("AQ")
    print(f"백엔드: {'Vertex AI (AQ.키/express)' if use_vertex else 'Developer API (AIza키)'}  키 {api_key[:6]}...{api_key[-4:]}")
    return genai.Client(api_key=api_key, vertexai=use_vertex)


def main():
    os.makedirs(ITEMS, exist_ok=True)
    lo = int(sys.argv[1]) if len(sys.argv) > 1 else 359
    hi = int(sys.argv[2]) if len(sys.argv) > 2 else 1025
    client = make_client()

    todo = [p for p in range(lo, hi + 1) if not already_done(p) and sprite_for(p)]
    skipped = sum(1 for p in range(lo, hi + 1) if already_done(p))
    no_sprite = [p for p in range(lo, hi + 1) if not already_done(p) and not sprite_for(p)]
    print(f"범위 {lo}~{hi}: 이미 완료 {skipped} / 생성할 것 {len(todo)}" + (f" / 스프라이트 없음 {len(no_sprite)}" if no_sprite else ""))

    made = 0
    for pid in todo:
        img = Image.open(sprite_for(pid)).convert("RGBA")
        for attempt in range(MAX_RPM_RETRY + 1):
            try:
                resp = generate(client, img)
                out = extract_image(resp)
                if out is None:
                    print(f"  pid {pid}: 이미지 응답 없음(거절/텍스트만) — 건너뜀")
                    break
                out.convert("RGBA").save(os.path.join(ITEMS, f"{pid}.png"))
                made += 1
                print(f"  pid {pid}: OK ({made}장째)")
                time.sleep(DELAY_BETWEEN)
                break
            except errors.APIError as e:
                code = getattr(e, "code", None)
                s = str(e).lower()
                transient = code == 429 or "429" in s or "resource_exhausted" in s or (isinstance(code, int) and 500 <= code < 600)
                if transient:
                    if (code == 429 and is_daily_quota(e)) or attempt >= MAX_RPM_RETRY:
                        print(f"\n⛔ 무료 한도 소진(또는 한도 지속). 이번 실행 {made}장 생성 후 종료.")
                        print("   👉 내일 다시  python gen_outfits.py  실행하면 이어서 진행됩니다.")
                        return
                    wait = 30 * (attempt + 1)
                    print(f"  pid {pid}: 한도(429/5xx) — {wait}s 대기 후 재시도 ({attempt + 1}/{MAX_RPM_RETRY})")
                    time.sleep(wait)
                    continue
                print(f"  pid {pid}: API 오류 {e} — 건너뜀")
                break
            except Exception as e:
                print(f"  pid {pid}: 예외 {e} — 건너뜀")
                break

    print(f"\n✅ 이번 실행 {made}장 생성 완료. 남은 건 다음날 재실행하면 이어집니다.")
    print("   다 모이면(또는 주기적으로) 분할+빌드:  python process_batch.py 359 1025  후 빌드")


if __name__ == "__main__":
    main()
