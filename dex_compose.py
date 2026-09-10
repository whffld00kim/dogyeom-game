# -*- coding: utf-8 -*-
"""후보 배경 1장을 실제 도감 UI 목업과 합성. 사용: python dex_compose.py <cand.webp> <out.png>"""
import sys
from dex_preview import build

img = build(sys.argv[1])
img.save(sys.argv[2])
print("composed:", sys.argv[2])
