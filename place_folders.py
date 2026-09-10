# -*- coding: utf-8 -*-
"""items/{pid}/ 폴더에 사용자가 넣은 원본 PNG(1.png~N.png)를 게임 형식으로 변환.
번호 보존({n}.png → {n}.webp), 흰/회색 배경 제거(split_sheet.clear_bg) → bbox → 384 webp.
원본은 manual_src/{pid}/로 백업. 매니페스트 갱신. 검증 몽타주(마젠타)는 루트.
사용: python place_folders.py 91 95   (또는 단일: python place_folders.py 91)
"""
import os, sys, json, re, shutil
from PIL import Image, ImageDraw
sys.stdout.reconfigure(errors="replace")
from split_sheet import clear_bg
from rekey import autokey  # 비백색(회/흑/색) 배경 자동감지 키잉

ROOT = os.path.dirname(os.path.abspath(__file__))
ITEMS = os.path.join(ROOT, "public", "items")
MANIFEST = os.path.join(ROOT, "src", "data", "outfits.json")
BACKUP = os.path.join(ROOT, "manual_src")
TARGET = 384
PRICE = 10


def num_key(f):
    m = re.match(r"(\d+)", f)
    return int(m.group(1)) if m else 9999


def corner_white(img):
    w, h = img.size
    cs = [img.getpixel(p)[:3] for p in [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3)]]
    ok = all(min(c) >= 170 and (max(c) - min(c)) <= 30 for c in cs)
    return ok, cs


def normalize(img):
    keyed = clear_bg(img.convert("RGBA"), None)
    bbox = keyed.getchannel("A").getbbox()
    if not bbox:
        return None
    cell = keyed.crop(bbox)
    w, h = cell.size
    s = max(w, h)
    sq = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    sq.paste(cell, ((s - w) // 2, (s - h) // 2))
    return sq.resize((TARGET, TARGET), Image.LANCZOS)


def process_pid(pid, data):
    d = os.path.join(ITEMS, str(pid))
    srcs = sorted([f for f in os.listdir(d) if f.lower().endswith((".png", ".jpg", ".jpeg"))], key=num_key)
    if not srcs:
        print(f"  pid {pid}: 원본 PNG 없음 skip")
        return None
    bdir = os.path.join(BACKUP, str(pid))
    os.makedirs(bdir, exist_ok=True)
    saved, results, warns = [], [], []
    for f in srcs:
        k = num_key(f)
        rgba = Image.open(os.path.join(d, f)).convert("RGBA")
        ok, cs = corner_white(rgba)
        norm = normalize(rgba) if ok else autokey(rgba)  # 흰배경=clear_bg / 그 외=autokey 자동감지
        if not ok:
            warns.append(f"{f} 비백색{cs}→autokey")
        if norm is None:
            print(f"  ⚠️ {pid}/{f} 내용없음 skip")
            continue
        shutil.move(os.path.join(d, f), os.path.join(bdir, f))  # 원본 백업
        norm.save(os.path.join(d, f"{k}.webp"), "WEBP", quality=82, method=4)
        saved.append(k)
        results.append((k, norm))
    saved.sort()
    data[str(pid)] = [
        {"id": f"o{pid}_{k}", "name": f"코디 {k}", "price": PRICE, "file": f"items/{pid}/{k}.webp"} for k in saved
    ]
    msg = f"  pid {pid}: {len(saved)}장 변환 [{','.join(map(str, saved))}]"
    if warns:
        msg += f"  ⚠️배경경고 {len(warns)}건"
    print(msg)
    for w in warns:
        print("      ", w)
    return results


def main():
    lo = int(sys.argv[1])
    hi = int(sys.argv[2]) if len(sys.argv) > 2 else lo
    data = {}
    if os.path.exists(MANIFEST):
        with open(MANIFEST, encoding="utf-8") as f:
            data = json.load(f)
    allres = {}
    for pid in range(lo, hi + 1):
        if os.path.isdir(os.path.join(ITEMS, str(pid))):
            r = process_pid(pid, data)
            if r:
                allres[pid] = r
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"매니페스트 갱신: {sum(len(v) for v in allres.values())}장 / {len(allres)}마리")
    # 검증 몽타주(마젠타 배경 → 흰 halo·회색몸 손상 즉시 확인)
    if allres:
        cell, cols = 150, 10
        rows = len(allres)
        mont = Image.new("RGB", (cols * cell, rows * cell), (255, 0, 255))
        dr = ImageDraw.Draw(mont)
        for ri, (pid, res) in enumerate(sorted(allres.items())):
            for ci, (k, r) in enumerate(sorted(res)[:cols]):
                t = r.copy(); t.thumbnail((cell - 10, cell - 10))
                cx, cy = ci * cell, ri * cell
                mont.paste(t, (cx + (cell - t.width) // 2, cy + (cell - t.height) // 2), t)
            dr.text((3, ri * cell + 3), str(pid), fill=(255, 255, 0))
        out = os.path.join(ROOT, f"_result_{lo}_{hi}.png")
        mont.save(out)
        print(f"검증 몽타주: _result_{lo}_{hi}.png")


if __name__ == "__main__":
    main()
