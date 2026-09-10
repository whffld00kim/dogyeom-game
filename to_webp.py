from PIL import Image
import os, glob, json, time

root = os.path.dirname(os.path.abspath(__file__))
items = os.path.join(root, "public", "items")
manifest = os.path.join(root, "src", "data", "outfits.json")

t0 = time.time()
n = 0
for d in sorted([x for x in os.listdir(items) if os.path.isdir(os.path.join(items, x)) and x.isdigit()], key=int):
    for f in glob.glob(os.path.join(items, d, "*.png")):
        Image.open(f).convert("RGBA").save(f[:-4] + ".webp", "WEBP", quality=90, method=4)
        os.remove(f)
        n += 1
    print(f"pid {d} done ({n} total) {time.time()-t0:.0f}s", flush=True)

# 매니페스트 경로 .png -> .webp
data = json.load(open(manifest, encoding="utf-8"))
for pid in data:
    for o in data[pid]:
        if o["file"].endswith(".png"):
            o["file"] = o["file"][:-4] + ".webp"
json.dump(data, open(manifest, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

size = sum(os.path.getsize(f) for f in glob.glob(os.path.join(items, "**", "*.webp"), recursive=True))
print(f"CONVERTED {n} files -> WebP, items now {size/1024/1024:.1f}MB, {time.time()-t0:.0f}s", flush=True)
