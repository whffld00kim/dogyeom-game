#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""키잉 실패(마젠타 배경 + 검은 프레임이 남은) 코디 webp를 찾아 재처리.
모델이 가끔 검은 테두리를 그려 flood-fill이 막혀 마젠타가 안 지워진 경우.
→ 전역 마젠타 제거 + 가장자리 연결 어두운 프레임 제거 + bbox + 384.
사용: python fix_outfits.py [lo] [hi]   (기본 359~460)
"""
import os, sys
from collections import deque
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
ITEMS = os.path.join(ROOT, "public", "items")
TARGET = 384


def transparent_frac(img):
    a = img.convert("RGBA").getchannel("A")
    hh = a.histogram()
    return sum(hh[0:16]) / float(img.width * img.height)


def is_magenta(r, g, b):
    return r > 135 and b > 105 and g < min(r, b) - 22


def refix(img):
    img = img.convert("RGBA")
    w, h = img.size
    data = bytearray(img.tobytes())
    # 1) 전역 마젠타 제거
    for i in range(0, len(data), 4):
        if data[i + 3] >= 8 and is_magenta(data[i], data[i + 1], data[i + 2]):
            data[i + 3] = 0
    # 2) 가장자리 연결 어두운 프레임 제거(flood-fill: 투명은 통과, 어두운 불투명은 제거, 밝은 포켓몬은 정지)
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
        if data[i + 3] < 8:
            push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1)
            continue
        if (data[i] + data[i + 1] + data[i + 2]) // 3 < 75:  # 어두운 프레임 → 제거 + 전파
            data[i + 3] = 0
            push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1)
        # 밝은 불투명(포켓몬)은 정지
    cell = Image.frombytes("RGBA", (w, h), bytes(data))
    bbox = cell.getchannel("A").getbbox()
    if not bbox:
        return None
    cell = cell.crop(bbox)
    cw, ch = cell.size
    s = max(cw, ch)
    sq = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    sq.paste(cell, ((s - cw) // 2, (s - ch) // 2))
    return sq.resize((TARGET, TARGET), Image.LANCZOS)


def main():
    lo = int(sys.argv[1]) if len(sys.argv) > 1 else 359
    hi = int(sys.argv[2]) if len(sys.argv) > 2 else 460
    scanned = fixed = 0
    bad = []
    for pid in range(lo, hi + 1):
        d = os.path.join(ITEMS, str(pid))
        if not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            if not f.endswith(".webp"):
                continue
            p = os.path.join(d, f)
            img = Image.open(p)
            scanned += 1
            if transparent_frac(img) > 0.15:
                continue  # 정상(투명 배경)
            out = refix(img)
            if out is None:
                continue
            out.save(p, "WEBP", quality=82, method=4)
            fixed += 1
            bad.append(f"{pid}/{f}")
    print(f"스캔 {scanned}장, 수정 {fixed}장")
    for b in bad:
        print("  고침:", b)


if __name__ == "__main__":
    main()
