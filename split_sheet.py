"""전용 코디 시트 분할기.
sheets/{pid}.png (격자 시트) → 칸별로 잘라 정규화(배경키잉 + square + 384px) →
public/items/{pid}/{n}.webp + 매니페스트 src/data/outfits.json 갱신.

배경 자동 감지:
  - '채도 있는 단색' 배경(마젠타 등, API 생성물): 그 색을 키잉 + 비배경 투영으로 격자 탐지(+넓은밴드 균등분할)
  - 밝은 회색/체커 + 검은 실선(수동 웹 생성물): 기존 방식(실선 감지 + 밝은 무채색 제거)

사용법:
  python split_sheet.py 359          # 자동 감지
  python split_sheet.py 359 4 5      # 4열 5행 균등분할(자동이 어긋날 때)
이름: sheets/{pid}.txt (한 줄에 하나, 칸 순서) 있으면 사용, 없으면 "코디 N".
"""
import sys, os, json
from collections import deque
from PIL import Image, ImageChops

ROOT = os.path.dirname(os.path.abspath(__file__))
SHEETS = os.path.join(ROOT, "sheets")  # 원본 시트(번들 안 됨). public 아님!
ITEMS = os.path.join(ROOT, "public", "items")  # 잘린 코디 출력(번들됨)
MANIFEST = os.path.join(ROOT, "src", "data", "outfits.json")
TARGET = 384
PRICE = 10
CHROMA_TOL = 110  # 단색 배경 키잉 허용오차(L1 거리)


def sample_bg(img):
    """전체에 격자로 점을 뿌려 RGB 중앙값 = 배경색. 배경(마젠타)이 다수라 검은 테두리선/포켓몬에 강건."""
    W, H = img.size
    px = img.load()
    rs, gs, bs = [], [], []
    sx, sy = max(1, W // 48), max(1, H // 48)
    for y in range(0, H, sy):
        for x in range(0, W, sx):
            p = px[x, y]
            rs.append(p[0]); gs.append(p[1]); bs.append(p[2])
    rs.sort(); gs.sort(); bs.sort()
    m = len(rs) // 2
    return (rs[m], gs[m], bs[m])


def clear_bg(cell, bg=None):
    """테두리에서 연결된 배경을 flood-fill로 투명화. bg(단색)면 그 색 키잉, 없으면 밝은 무채색(회색/체커)."""
    cell = cell.convert("RGBA")
    w, h = cell.size
    data = bytearray(cell.tobytes())
    if bg is not None:
        br, bgc, bb = bg

        def is_bg(i):
            if data[i + 3] < 8:
                return True
            return abs(data[i] - br) + abs(data[i + 1] - bgc) + abs(data[i + 2] - bb) < CHROMA_TOL
    else:
        def is_bg(i):
            r, g, b, a = data[i], data[i + 1], data[i + 2], data[i + 3]
            if a < 8:
                return True
            avg = (r + g + b) // 3
            return (max(r, g, b) - min(r, g, b)) <= 22 and avg >= 178

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
        if not is_bg(i):
            continue
        data[i + 3] = 0
        push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1)
    return Image.frombytes("RGBA", (w, h), bytes(data))


def detect_grid_lines(img):
    """어두운 실선(밝기<90)을 격자 구분선으로 감지 → (수직선 중심들, 수평선 중심들)."""
    W, H = img.size
    mask = img.convert("L").point(lambda v: 255 if v < 90 else 0)
    colavg = list(mask.resize((W, 1), Image.BOX).getdata())
    rowavg = list(mask.resize((1, H), Image.BOX).getdata())

    def centers(avg, thresh=150):
        res = []
        i, n = 0, len(avg)
        while i < n:
            if avg[i] > thresh:
                j = i
                while j < n and avg[j] > thresh:
                    j += 1
                res.append((i + j) // 2)
                i = j
            else:
                i += 1
        return res

    return centers(colavg), centers(rowavg)


def find_bands(proj, thresh, min_len):
    res = []
    i, n = 0, len(proj)
    while i < n:
        if proj[i] > thresh:
            j = i
            while j < n and proj[j] > thresh:
                j += 1
            if j - i >= min_len:
                res.append((i, j))
            i = j
        else:
            i += 1
    return res


def split_wide(bands):
    """규칙적 격자에서 아이템 삐짐으로 합쳐진(2~3배 넓은) 밴드를 중앙값 기준 균등 분할."""
    if len(bands) < 2:
        return bands
    widths = sorted(b[1] - b[0] for b in bands)
    med = widths[len(widths) // 2]
    out = []
    for (a, b) in bands:
        k = max(1, round((b - a) / med))
        if k == 1:
            out.append((a, b))
        else:
            step = (b - a) / k
            for i in range(k):
                out.append((int(round(a + i * step)), int(round(a + (i + 1) * step))))
    return out


def _axis(proj, min_cell):
    """투영(0~255)에서 규칙적 격자의 칸 수를 주기성으로 추정 → 균등 분할 밴드.
    거터 찾기(아이템 삐짐에 취약)보다 안정적: 칸수 C마다 '셀중심 내용 높고 거터 낮음' 점수 최대 C 선택."""
    mx = max(proj) if proj else 0
    if mx <= 0:
        return [(0, len(proj))]
    idx = [i for i, v in enumerate(proj) if v > mx * 0.12]
    a, b = idx[0], idx[-1] + 1
    span = b - a
    if span < min_cell * 2:
        return [(a, b)]
    best_c, best_s = 1, -1e9
    c = 2
    while c <= 8 and span / c >= min_cell:
        guts = [a + span * k / c for k in range(1, c)]
        cents = [a + span * (k + 0.5) / c for k in range(c)]
        gv = sum(proj[min(len(proj) - 1, int(p))] for p in guts) / max(1, len(guts))
        cv = sum(proj[min(len(proj) - 1, int(p))] for p in cents) / c
        sc = cv - 2 * gv  # 셀중심은 높고 거터는 낮을수록 좋음
        if sc > best_s:
            best_s, best_c = sc, c
        c += 1
    c = best_c
    return [(int(round(a + span * k / c)), int(round(a + span * (k + 1) / c))) for k in range(c)]


def detect_grid_chroma(img, bg):
    """단색(마젠타) 배경: 비배경 투영 → 주기성으로 행/열 칸 수 추정 → 균등 분할."""
    W, H = img.size
    r, g, b = img.convert("RGB").split()
    dr = ImageChops.difference(r, Image.new("L", (W, H), bg[0]))
    dg = ImageChops.difference(g, Image.new("L", (W, H), bg[1]))
    db = ImageChops.difference(b, Image.new("L", (W, H), bg[2]))
    s = ImageChops.add(ImageChops.add(dr, dg), db)  # L1 합(255 클램프)
    mask = s.point(lambda v: 255 if v >= CHROMA_TOL else 0)  # 255=내용, 0=배경
    col = list(mask.resize((W, 1), Image.BOX).getdata())  # 열별 평균 내용(0~255)
    row = list(mask.resize((1, H), Image.BOX).getdata())
    return _axis(col, max(20, W // 40)), _axis(row, max(20, H // 40))


def split_one(pid, cols=None, rows=None):
    """시트 1장 분할 → public/items/{pid}/{n}.webp + 매니페스트 갱신. 출력 칸 수 반환."""
    pid = str(pid)
    img = Image.open(os.path.join(SHEETS, f"{pid}.png")).convert("RGBA")
    W, H = img.size
    bg = sample_bg(img)
    chroma = (max(bg) - min(bg)) > 60  # 채도 있는 단색 배경(마젠타)인가?

    if cols and rows:
        INSET = 0 if chroma else 8
        col_bands = [(round(c * W / cols) + INSET, round((c + 1) * W / cols) - INSET) for c in range(cols)]
        row_bands = [(round(r * H / rows) + INSET, round((r + 1) * H / rows) - INSET) for r in range(rows)]
    elif chroma:
        # 마젠타 위에 검은 격자선이 있으면 그 선대로 자름(그림이 칸 안에 갇혀 안 잘림). 없으면 주기성.
        vlines, hlines = detect_grid_lines(img)
        if len(vlines) >= 3 and len(hlines) >= 3:
            INSET = 14  # 굵은 선 + 여백 제외(마젠타는 키잉, 잔여 마젠타는 bbox가 트림)
            col_bands = [(vlines[c] + INSET, vlines[c + 1] - INSET) for c in range(len(vlines) - 1)]
            row_bands = [(hlines[r] + INSET, hlines[r + 1] - INSET) for r in range(len(hlines) - 1)]
        else:
            col_bands, row_bands = detect_grid_chroma(img, bg)
    else:
        vlines, hlines = detect_grid_lines(img)
        INSET = 8
        col_bands = [(vlines[c] + INSET, vlines[c + 1] - INSET) for c in range(len(vlines) - 1)]
        row_bands = [(hlines[r] + INSET, hlines[r + 1] - INSET) for r in range(len(hlines) - 1)]

    key = bg if chroma else None

    names = []
    txt = os.path.join(SHEETS, f"{pid}.txt")
    if os.path.exists(txt):
        with open(txt, encoding="utf-8") as f:
            names = [ln.strip() for ln in f if ln.strip()]

    outdir = os.path.join(ITEMS, pid)
    os.makedirs(outdir, exist_ok=True)
    for old in os.listdir(outdir):
        if old.endswith((".png", ".webp")):
            os.remove(os.path.join(outdir, old))

    entries = []
    sigs = []  # 중복 제거용 축소 서명(24x24 RGB)
    n = 0
    for (y0, y1) in row_bands:
        for (x0, x1) in col_bands:
            cell = clear_bg(img.crop((x0, y0, x1, y1)), key)  # 배경(마젠타/회색) → 투명
            bbox = cell.getchannel("A").getbbox()
            if not bbox:  # 내용 없는 칸 skip
                continue
            cell = cell.crop(bbox)
            w, h = cell.size
            s = max(w, h)
            sq = Image.new("RGBA", (s, s), (0, 0, 0, 0))
            sq.paste(cell, ((s - w) // 2, (s - h) // 2))
            sq = sq.resize((TARGET, TARGET), Image.LANCZOS)
            # 거의 동일한 칸(맨몸 중복 등) 자동 제거
            sig = sq.convert("RGB").resize((24, 24), Image.BOX).tobytes()
            if any(sum(abs(sig[i] - p[i]) for i in range(len(sig))) / len(sig) < 8 for p in sigs):
                continue
            sigs.append(sig)
            n += 1
            fname = f"{n}.webp"
            sq.save(os.path.join(outdir, fname), "WEBP", quality=82, method=4)
            nm = names[n - 1] if n - 1 < len(names) else f"코디 {n}"
            entries.append({"id": f"o{pid}_{n}", "name": nm, "price": PRICE, "file": f"items/{pid}/{fname}"})

    os.makedirs(os.path.dirname(MANIFEST), exist_ok=True)
    data = {}
    if os.path.exists(MANIFEST):
        with open(MANIFEST, encoding="utf-8") as f:
            data = json.load(f)
    data[str(pid)] = entries
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    kind = "chroma" if chroma else "lines"
    print(f"pid {pid}: {W}x{H} {kind} grid {len(col_bands)}x{len(row_bands)} -> {n} outfits", flush=True)
    return n


def main():
    if len(sys.argv) < 2:
        print("usage: python split_sheet.py <pid> [cols rows]")
        return
    if len(sys.argv) >= 4:
        split_one(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]))
    else:
        split_one(sys.argv[1])


if __name__ == "__main__":
    main()
