# -*- coding: utf-8 -*-
"""배경 키잉 실패 코디 재처리: 마젠타 잔여 + 검은 프레임 + 가장자리 단색 밴드(검정/적갈색 등) 제거.
- 실제 마젠타색 측정 → 붉은기(R>B) 마젠타만 전역 제거(파랑/보라 포켓몬 보존).
- 가장자리 어두운(<50) 프레임 + 가장자리 '균일한 어두운 단색 밴드' flood-fill 제거.
- 색이 다양한 가장자리(포켓몬이 닿음)는 건드리지 않음(오탐 방지).
원본은 refix_backup/{pid}_{n}.webp 백업(반복 실행 안전).
사용: python refix.py fix 305 5 ...   |   python refix.py scan 1 1025
"""
import os, sys, shutil
from collections import deque
from PIL import Image, ImageDraw
sys.stdout.reconfigure(errors="replace")

ROOT = os.path.dirname(os.path.abspath(__file__))
ITEMS = os.path.join(ROOT, "public", "items")
BACKUP = os.path.join(ROOT, "refix_backup")
TARGET = 384


def _is_mag(r, g, b):
    return r > 135 and b > 105 and g < min(r, b) - 22


def edge_band(px, w, h):
    """가장자리(4px 밴드)의 불투명 픽셀이 '균일한 어두운 단색'이면 그 색 반환(=밴드/단색배경). 아니면 None."""
    edge = []
    for x in range(0, w, 2):
        for y in (0, 1, 2, 3, h - 4, h - 3, h - 2, h - 1):
            r, g, b, a = px[x, y]
            if a > 150:
                edge.append((r, g, b))
    for y in range(0, h, 2):
        for x in (0, 1, 2, 3, w - 4, w - 3, w - 2, w - 1):
            r, g, b, a = px[x, y]
            if a > 150:
                edge.append((r, g, b))
    if len(edge) < 20:
        return None
    rr = sorted(c[0] for c in edge); gg = sorted(c[1] for c in edge); bb = sorted(c[2] for c in edge)
    m = len(edge) // 2
    med = (rr[m], gg[m], bb[m])
    if sum(med) // 3 >= 120:   # 밝은 색이면 포켓몬일 수 있음 → 제외(어두운 밴드만)
        return None
    near = sum(1 for c in edge if abs(c[0] - med[0]) + abs(c[1] - med[1]) + abs(c[2] - med[2]) < 45)
    if near < len(edge) * 0.7:
        return None
    # 밴드는 전체의 소수여야 함 — med색이 불투명 픽셀의 35%↑면 포켓몬 본체 색(밴드 아님) → 제외
    na = op = 0
    for y in range(0, h, 4):
        for x in range(0, w, 4):
            r, g, b, a = px[x, y]
            if a > 40:
                op += 1
                if abs(r - med[0]) + abs(g - med[1]) + abs(b - med[2]) < 58:
                    na += 1
    if na > op * 0.35:
        return None
    return med


def refix_bg(img):
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    ebg = edge_band(px, w, h)   # 가장자리 단색 어두운 밴드 색(있으면)
    data = bytearray(img.tobytes())
    # 1) 마젠타 배경색 보정 (broad-magenta 픽셀 평균)
    sr = sg = sb = cnt = 0
    for i in range(0, len(data), 28):
        if data[i + 3] > 40:
            r, g, b = data[i], data[i + 1], data[i + 2]
            if r > 135 and b > 105 and g < min(r, b) - 22:
                sr += r; sg += g; sb += b; cnt += 1
    mag = (sr // cnt, sg // cnt, sb // cnt) if cnt > 40 else None
    # 2) 전역 마젠타 제거 — 붉은기(R>B)만 = 배경. 파랑/보라 포켓몬(B>=R) 보존
    if mag and mag[0] > mag[2] + 25:
        mr, mg, mb = mag
        for i in range(0, len(data), 4):
            if data[i + 3] >= 8 and abs(data[i] - mr) + abs(data[i + 1] - mg) + abs(data[i + 2] - mb) < 105:
                data[i + 3] = 0
    # 3) 가장자리 연결: 투명 통과 / 어두운<50 제거 / 균일 어두운 밴드색(±L1<58) 제거 / 밝은 포켓몬 정지
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
        a = data[i + 3]
        if a < 8:
            push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1)
            continue
        r, g, b = data[i], data[i + 1], data[i + 2]
        isbg = (r + g + b) // 3 < 50
        if not isbg and ebg is not None and abs(r - ebg[0]) + abs(g - ebg[1]) + abs(b - ebg[2]) < 58:
            isbg = True
        if isbg:
            data[i + 3] = 0
            push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1)
        # else 포켓몬 → 정지

    out = Image.frombytes("RGBA", (w, h), bytes(data))
    bbox = out.getchannel("A").getbbox()
    if not bbox:
        return None
    cell = out.crop(bbox)
    ww, hh = cell.size
    s = max(ww, hh)
    sq = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    sq.paste(cell, ((s - ww) // 2, (s - hh) // 2))
    return sq.resize((TARGET, TARGET), Image.LANCZOS)


def diagnose(p):
    im = Image.open(p).convert("RGBA")
    w, h = im.size
    px = im.load()
    a = im.getchannel("A")
    tf = sum(a.histogram()[0:16]) / (w * h)
    band = 4
    coords = []
    for x in range(0, w, 2):
        for y in list(range(band)) + list(range(h - band, h)):
            coords.append((x, y))
    for y in range(0, h, 2):
        for x in list(range(band)) + list(range(w - band, w)):
            coords.append((x, y))
    bmag = bdark = bt = 0
    for x, y in coords:
        r, g, b, al = px[x, y]
        bt += 1
        if al > 120 and _is_mag(r, g, b):
            bmag += 1
        if al > 150 and (r + g + b) // 3 < 60:
            bdark += 1
    magf = bmag / max(1, bt)
    edf = bdark / max(1, bt)
    has_band = edge_band(px, w, h) is not None
    bad = tf < 0.08 or magf > 0.05 or edf > 0.08 or has_band
    return tf, magf, edf, bad


def fix_one(pid, n, verbose=True):
    p = os.path.join(ITEMS, str(pid), f"{n}.webp")
    if not os.path.exists(p):
        return False
    bk = os.path.join(BACKUP, f"{pid}_{n}.webp")
    if os.path.exists(bk):
        src = bk
    else:
        os.makedirs(BACKUP, exist_ok=True)
        shutil.copy(p, bk)
        src = p
    out = refix_bg(Image.open(src))
    if out is None:
        return False
    out.save(p, "WEBP", quality=82, method=4)
    if verbose:
        tf, mf, ef, bad = diagnose(p)
        print(f"  {pid}/{n} 수정 → 투명율={tf:.2f} 마젠타={mf:.2f} 엣지검정={ef:.2f} {'⚠여전히bad' if bad else 'OK'}")
    return True


def montage(pairs, name):
    cell = 200
    rows = max(1, len(pairs))
    mont = Image.new("RGB", (cell * 2, cell * rows), (255, 0, 255))
    dr = ImageDraw.Draw(mont)
    for i, (pid, n) in enumerate(pairs):
        before = os.path.join(BACKUP, f"{pid}_{n}.webp")
        after = os.path.join(ITEMS, str(pid), f"{n}.webp")
        for j, pth in enumerate([before, after]):
            if os.path.exists(pth):
                im = Image.open(pth).convert("RGBA")
                t = im.copy(); t.thumbnail((cell - 10, cell - 10))
                mont.paste(t, (j * cell + (cell - t.width) // 2, i * cell + (cell - t.height) // 2), t)
        dr.text((4, i * cell + 4), f"{pid}/{n}", fill=(255, 255, 0))
    mont.save(os.path.join(ROOT, name))
    print(f"몽타주: {name} (왼=before, 오=after)")


def main():
    mode = sys.argv[1]
    if mode == "fix":
        nums = [int(x) for x in sys.argv[2:]]
        pairs = [(nums[i], nums[i + 1]) for i in range(0, len(nums), 2)]
        for pid, n in pairs:
            fix_one(pid, n)
        montage(pairs, "_refix_check.png")
    elif mode == "scan":
        lo, hi = int(sys.argv[2]), int(sys.argv[3])
        bad = []
        for pid in range(lo, hi + 1):
            d = os.path.join(ITEMS, str(pid))
            if not os.path.isdir(d):
                continue
            for f in sorted(os.listdir(d)):
                if not f.endswith(".webp") or not f[:-5].isdigit():
                    continue
                if diagnose(os.path.join(d, f))[3]:
                    bad.append((pid, int(f[:-5])))
        print(f"스캔 {lo}~{hi}: 의심 {len(bad)}장")
        for pid, n in bad:
            fix_one(pid, n, verbose=False)
        print(f"수정 시도 {len(bad)}장")
        if bad:
            montage(bad[:16], f"_scan_{lo}_{hi}.png")
        still = [(pid, n) for pid, n in bad if diagnose(os.path.join(ITEMS, str(pid), f"{n}.webp"))[3]]
        print(f"수정 후에도 의심 잔여: {len(still)} {still[:30]}")


if __name__ == "__main__":
    main()
