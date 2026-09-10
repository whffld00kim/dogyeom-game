# 연결요소 기반 배경 제거: 포켓몬 본체(색 or 어두운 외곽)에 연결된 밝은 무채색만 보존,
# 떠 있는(연결 안 된) 밝은 무채색 조각(체크무늬 잔여·갇힌 점)은 제거. 단색 흰배는 본체에 연결돼 보존.
import sys, os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
ITEMS = os.path.join(ROOT, "public", "items")
CHROMA = 24
BRIGHT = 178


def clean_cc(im):
    im = im.convert("RGBA")
    arr = np.asarray(im).astype(np.int16)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    avg = (r + g + b) // 3
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    chroma = mx - mn
    opaque = a > 8
    candidate = opaque & (chroma <= CHROMA) & (avg >= BRIGHT)     # 밝은 무채색(포켓몬 흰부분 또는 배경 잔여)
    solid = opaque & ((chroma > CHROMA) | (avg < BRIGHT))         # 색 또는 어두운(외곽) = 확실한 포켓몬
    region = candidate | solid
    keep = solid.copy()
    for _ in range(500):
        new = keep.copy()
        new[1:, :] |= keep[:-1, :]
        new[:-1, :] |= keep[1:, :]
        new[:, 1:] |= keep[:, :-1]
        new[:, :-1] |= keep[:, 1:]
        new &= region
        s = new.sum()
        if s == keep.sum():
            break
        keep = new
    remove = candidate & ~keep
    out = arr.copy()
    out[..., 3] = np.where(remove, 0, arr[..., 3])
    return Image.fromarray(out.astype(np.uint8), "RGBA"), int(remove.sum())


def first_webp(pid):
    d = os.path.join(ITEMS, str(pid))
    ws = sorted([f for f in os.listdir(d) if f.endswith(".webp")], key=lambda s: int(s.split('.')[0]))
    return os.path.join(d, ws[0])


def test(pids):
    CELL = 240
    montage = Image.new("RGB", (CELL * len(pids), CELL * 2), (255, 0, 255))
    for i, pid in enumerate(pids):
        src = Image.open(first_webp(pid)).convert("RGBA")
        cleaned, n = clean_cc(src)
        for row, img in enumerate([src, cleaned]):
            mag = Image.new("RGBA", (CELL, CELL), (255, 0, 255, 255))
            cell = Image.alpha_composite(mag, img.resize((CELL, CELL), Image.LANCZOS)).convert("RGB")
            montage.paste(cell, (i * CELL, row * CELL))
        print(f"pid {pid}: removed {n} px")
    montage.save(os.path.join(ROOT, "_cc_test.png"))
    print("saved _cc_test.png (위=현재, 아래=처리후)")


def run_all():
    fixed = 0
    pids = sorted([p for p in os.listdir(ITEMS) if os.path.isdir(os.path.join(ITEMS, p))], key=lambda s: int(s) if s.isdigit() else 0)
    for pid in pids:
        d = os.path.join(ITEMS, pid)
        for f in os.listdir(d):
            if not f.endswith(".webp"):
                continue
            path = os.path.join(d, f)
            cleaned, n = clean_cc(Image.open(path))
            if n > 20:
                cleaned.save(path, "WEBP", quality=90, method=4)
                fixed += 1
    print(f"cc fixed {fixed} webp")


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "all":
        run_all()
    else:
        test([151, 36, 80, 131, 25, 89, 46])
