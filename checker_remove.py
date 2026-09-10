# 체크무늬 배경(밝은 회색+어두운 회색이 교차하는 무채색 패턴)을 패턴 감지로 제거.
# 테두리 연결과 무관(원형 프레임 안에 갇힌 체크무늬도 제거). 단색 흰/회색 포켓몬은 보존.
import sys, os
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.abspath(__file__))
ITEMS = os.path.join(ROOT, "public", "items")

FILT = 17       # 인접 칸 탐색 창(±8) — 체크무늬 칸 크기에 맞춤
CHROMA = 24     # 무채색 허용 채널차
BRIGHT = 176    # 배경 최소 밝기
LIGHT = 220     # 밝은 칸
DARK_HI = 210   # 어두운 칸 상한 (176~210)


def clean_checker(im):
    im = im.convert("RGBA")
    arr = np.asarray(im).astype(np.int16)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    avg = (r + g + b) // 3
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    ab = ((mx - mn) <= CHROMA) & (avg >= BRIGHT) & (a > 8)  # 무채색·밝음·불투명
    light = ((ab & (avg >= LIGHT)).astype(np.uint8)) * 255
    dark = ((ab & (avg <= DARK_HI)).astype(np.uint8)) * 255
    # 근처에 밝은 칸 AND 어두운 칸이 둘 다 있으면 = 체크무늬
    lp = np.asarray(Image.fromarray(light).filter(ImageFilter.MaxFilter(FILT)))
    dp = np.asarray(Image.fromarray(dark).filter(ImageFilter.MaxFilter(FILT)))
    checker = ab & (lp > 0) & (dp > 0)
    out = arr.copy()
    out[..., 3] = np.where(checker, 0, arr[..., 3])
    return Image.fromarray(out.astype(np.uint8), "RGBA"), int(checker.sum())


def first_webp(pid):
    d = os.path.join(ITEMS, str(pid))
    ws = sorted([f for f in os.listdir(d) if f.endswith(".webp")], key=lambda s: int(s.split('.')[0]))
    return os.path.join(d, ws[0])


def test(pids):
    CELL = 384
    montage = Image.new("RGB", (CELL * len(pids), CELL * 2), (255, 0, 255))
    for i, pid in enumerate(pids):
        src = Image.open(first_webp(pid)).convert("RGBA")
        cleaned, n = clean_checker(src)
        for row, img in enumerate([src, cleaned]):
            mag = Image.new("RGBA", (CELL, CELL), (255, 0, 255, 255))
            cell = Image.alpha_composite(mag, img.resize((CELL, CELL), Image.LANCZOS)).convert("RGB")
            montage.paste(cell, (i * CELL, row * CELL))
        print(f"pid {pid}: removed {n} px")
    montage.save(os.path.join(ROOT, "_checker_test.png"))
    print("saved _checker_test.png (위=원본, 아래=처리후)")


def run_all():
    fixed = 0
    pids = sorted([p for p in os.listdir(ITEMS) if os.path.isdir(os.path.join(ITEMS, p))], key=lambda s: int(s) if s.isdigit() else 0)
    for pid in pids:
        d = os.path.join(ITEMS, pid)
        for f in os.listdir(d):
            if not f.endswith(".webp"):
                continue
            path = os.path.join(d, f)
            cleaned, n = clean_checker(Image.open(path))
            if n > 30:  # 의미있는 양만 다시 저장
                cleaned.save(path, "WEBP", quality=90, method=4)
                fixed += 1
    print(f"fixed {fixed} webp")


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "all":
        run_all()
    else:
        test([80, 131])
