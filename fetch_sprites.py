#!/usr/bin/env python3
# 포켓몬 공식 아트워크(475x475 원본)를 전부 다시 받아 public/sprites/{id}.png 로 저장.
# (저해상 160px를 고화질로 교체) 병렬 + 재시도.
import os, urllib.request, concurrent.futures, time

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public', 'sprites')
BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{}.png'
os.makedirs(OUT, exist_ok=True)

def fetch(i):
    url = BASE.format(i)
    dst = os.path.join(OUT, f'{i}.png')
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=40) as r:
                data = r.read()
            if len(data) < 800:
                raise ValueError('too small')
            with open(dst, 'wb') as f:
                f.write(data)
            return (i, True, len(data))
        except Exception as e:
            if attempt == 4:
                return (i, False, str(e))
            time.sleep(1.2 * (attempt + 1))

ids = list(range(1, 1026))
ok = 0
fail = []
t0 = time.time()
with concurrent.futures.ThreadPoolExecutor(max_workers=16) as ex:
    for res in ex.map(fetch, ids):
        if res[1]:
            ok += 1
        else:
            fail.append(res[0])
        done = ok + len(fail)
        if done % 100 == 0:
            print(f'{done}/1025  ok={ok} fail={len(fail)}  {time.time()-t0:.0f}s', flush=True)

print(f'DONE ok={ok} fail={len(fail)} elapsed={time.time()-t0:.0f}s', flush=True)
if fail:
    print('FAILED_IDS=' + ','.join(map(str, fail)), flush=True)
