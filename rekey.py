# -*- coding: utf-8 -*-
"""흰배경이 아닌(회색/검정 등) 원본을 배경색 자동감지로 재키잉.
manual_src/{pid}/{n}.png → items/{pid}/{n}.webp 덮어쓰기.
배경색=테두리 픽셀 중앙값. 그 색 L1 근접 + (무채색 배경이면 같은 밝기대 무채색)만 제거 → 유채색 피사체 보존.
사용: python rekey.py 91 1 94 5
"""
import os, sys
from collections import deque
from PIL import Image, ImageDraw
sys.stdout.reconfigure(errors="replace")

ROOT = os.path.dirname(os.path.abspath(__file__))
ITEMS = os.path.join(ROOT, "public", "items")
BACKUP = os.path.join(ROOT, "manual_src")
TARGET = 384


def autokey(img):
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    edge = []
    step = max(1, w // 64)
    for x in range(0, w, step):
        edge += [px[x, 0], px[x, h - 1]]
    for y in range(0, h, step):
        edge += [px[0, y], px[w - 1, y]]
    rs = sorted(p[0] for p in edge); gs = sorted(p[1] for p in edge); bs = sorted(p[2] for p in edge)
    m = len(rs) // 2
    bg = (rs[m], gs[m], bs[m])
    bgavg = sum(bg) // 3
    achroma = (max(bg) - min(bg)) <= 25
    print(f"    배경색 추정 {bg} (avg {bgavg}, 무채색={achroma})")
    data = bytearray(img.tobytes())
    TOL = 95

    def isbg(i):
        a = data[i + 3]
        if a < 8:
            return True
        r, g, b = data[i], data[i + 1], data[i + 2]
        if abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2]) < TOL:
            return True
        if achroma and (max(r, g, b) - min(r, g, b)) <= 22:
            avg = (r + g + b) // 3
            if bgavg >= 150 and avg >= 150:
                return True
            if bgavg <= 90 and avg <= 95:
                return True
        return False

    seen = bytearray(w * h)
    dq = deque()

    def push(x, y):
        if 0 <= x < w and 0 <= y < h:
            p = y * w + x
            if not seen[p]:
                seen[p] = 1
                dq.append((x, y))

    for x in range(w):
        push(x, 0); push(x, h - 1)
    for y in range(h):
        push(0, y); push(w - 1, y)
    while dq:
        x, y = dq.popleft()
        i = (y * w + x) * 4
        if not isbg(i):
            continue
        data[i + 3] = 0
        push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1)
    out = Image.frombytes("RGBA", (w, h), bytes(data))
    bbox = out.getchannel("A").getbbox()
    if not bbox:
        return None
    c = out.crop(bbox)
    ww, hh = c.size
    s = max(ww, hh)
    sq = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    sq.paste(c, ((s - ww) // 2, (s - hh) // 2))
    return sq.resize((TARGET, TARGET), Image.LANCZOS)


def main():
    args = sys.argv[1:]
    pairs = [(args[i], args[i + 1]) for i in range(0, len(args) - 1, 2)]
    done = []
    for pid, n in pairs:
        src = os.path.join(BACKUP, str(pid), f"{n}.png")
        if not os.path.exists(src):
            print(f"  ❌ {src} 없음"); continue
        print(f"  재키잉 {pid}/{n}")
        out = autokey(Image.open(src))
        if out is None:
            print(f"  ⚠️ {pid}/{n} 내용없음"); continue
        out.save(os.path.join(ITEMS, str(pid), f"{n}.webp"), "WEBP", quality=82, method=4)
        done.append((pid, n, out))
    # 재키잉 결과만 마젠타 크게
    if done:
        cell = 360
        mont = Image.new("RGB", (cell * len(done), cell), (255, 0, 255))
        dr = ImageDraw.Draw(mont)
        for i, (pid, n, im) in enumerate(done):
            t = im.copy(); t.thumbnail((cell - 12, cell - 12))
            mont.paste(t, (i * cell + (cell - t.width) // 2, (cell - t.height) // 2), t)
            dr.text((i * cell + 6, 6), f"{pid}/{n}", fill=(255, 255, 0))
        mont.save(os.path.join(ROOT, "_rekey_check.png"))
        print("재키잉 검증: _rekey_check.png")


if __name__ == "__main__":
    main()
