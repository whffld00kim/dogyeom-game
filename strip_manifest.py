#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""outfits.json에서 지정 범위 pid 항목 제거 — 재생성 전 옛 항목 정리.
(폴더만 지우고 매니페스트를 남기면, 재생성 완료 전 빌드 시 깨진 참조가 생김)
사용: python strip_manifest.py 1 358
"""
import json, sys, os

ROOT = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(ROOT, "src", "data", "outfits.json")

lo, hi = int(sys.argv[1]), int(sys.argv[2])
with open(P, encoding="utf-8") as f:
    d = json.load(f)
n = 0
for k in [str(i) for i in range(lo, hi + 1)]:
    if d.pop(k, None) is not None:
        n += 1
with open(P, "w", encoding="utf-8") as f:
    json.dump(d, f, ensure_ascii=False, indent=2)
print(f"manifest: pid {lo}~{hi} 중 {n}개 항목 제거, {len(d)}개 남음")
