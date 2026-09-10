# -*- coding: utf-8 -*-
"""수동 생성(Gemini) 코디 PNG들을 게임 형식으로 변환 + items/{pid}에 배치 + 매니페스트 갱신.
흰/회색 배경 → 투명(split_sheet.clear_bg 재사용) → bbox → 정사각 → 384 webp.
소스 PNG는 삭제하지 않음(검증 후 별도 정리). 결과 몽타주는 루트(_result{pid}.png, 번들 안 됨).
사용: python place_manual.py 90
"""
import os, sys, json
from PIL import Image
sys.stdout.reconfigure(errors="replace")
from split_sheet import clear_bg

ROOT = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(ROOT, "public")
ITEMS = os.path.join(PUB, "items")
MANIFEST = os.path.join(ROOT, "src", "data", "outfits.json")
TARGET = 384
PRICE = 10


def normalize(img):
    keyed = clear_bg(img.convert("RGBA"), None)  # 밝은 무채색 배경 border flood-fill
    bbox = keyed.getchannel("A").getbbox()
    if not bbox:
        return None
    cell = keyed.crop(bbox)
    w, h = cell.size
    s = max(w, h)
    sq = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    sq.paste(cell, ((s - w) // 2, (s - h) // 2))
    return sq.resize((TARGET, TARGET), Image.LANCZOS)


def main():
    pid = sys.argv[1] if len(sys.argv) > 1 else "90"
    files = sorted(f for f in os.listdir(PUB) if f.startswith("Gemini_Generated_Image") and f.lower().endswith(".png"))
    print(f"pid {pid}: 소스 {len(files)}장")
    outdir = os.path.join(ITEMS, pid)
    os.makedirs(outdir, exist_ok=True)
    for old in os.listdir(outdir):
        if old.endswith((".png", ".webp")):
            os.remove(os.path.join(outdir, old))
    entries, results = [], []
    n = 0
    for f in files:
        norm = normalize(Image.open(os.path.join(PUB, f)))
        if norm is None:
            print(f"  ⚠️ {f}: 내용 없음 skip"); continue
        n += 1
        fn = f"{n}.webp"
        norm.save(os.path.join(outdir, fn), "WEBP", quality=82, method=4)
        entries.append({"id": f"o{pid}_{n}", "name": f"코디 {n}", "price": PRICE, "file": f"items/{pid}/{fn}"})
        results.append(norm)
        print(f"  {f} -> {fn}")
    data = {}
    if os.path.exists(MANIFEST):
        with open(MANIFEST, encoding="utf-8") as fp:
            data = json.load(fp)
    data[str(pid)] = entries
    with open(MANIFEST, "w", encoding="utf-8") as fp:
        json.dump(data, fp, ensure_ascii=False, indent=2)
    print(f"매니페스트 pid {pid}: {len(entries)}개 항목")
    # 결과 검증 몽타주(체커 배경 → 투명 확인), 루트에 저장
    cell, cols = 200, 5
    rows = max(1, (len(results) + cols - 1) // cols)
    mont = Image.new("RGB", (cols * cell, rows * cell), (50, 50, 58))
    for by in range(0, mont.height, 16):
        for bx in range(0, mont.width, 16):
            if (bx // 16 + by // 16) % 2 == 0:
                for yy in range(by, min(by + 16, mont.height)):
                    for xx in range(bx, min(bx + 16, mont.width)):
                        mont.putpixel((xx, yy), (82, 82, 92))
    for i, r in enumerate(results):
        t = r.copy(); t.thumbnail((cell - 12, cell - 12))
        cx, cy = (i % cols) * cell, (i // cols) * cell
        mont.paste(t.convert("RGB"), (cx + 6, cy + 6), t)
    mont.save(os.path.join(ROOT, f"_result{pid}.png"))
    print(f"결과 몽타주: _result{pid}.png")


if __name__ == "__main__":
    main()
