import os, shutil, sys, time
from split_sheet import split_one, ITEMS, SHEETS

lo = int(sys.argv[1]) if len(sys.argv) > 1 else 11
hi = int(sys.argv[2]) if len(sys.argv) > 2 else 75

os.makedirs(SHEETS, exist_ok=True)
t0 = time.time()
done = 0
total = 0
for pid in range(lo, hi + 1):
    src = os.path.join(ITEMS, f"{pid}.png")
    dst = os.path.join(SHEETS, f"{pid}.png")
    if os.path.exists(src):
        shutil.move(src, dst)
    if not os.path.exists(dst):
        continue
    try:
        total += split_one(str(pid))
        done += 1
    except Exception as e:
        print(f"ERR pid {pid}: {e}", flush=True)
print(f"BATCH DONE: {done} sheets, {total} outfits, {time.time()-t0:.0f}s", flush=True)
