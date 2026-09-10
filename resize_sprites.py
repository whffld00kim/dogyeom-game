from PIL import Image
import os
import glob

d = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public", "sprites")
TARGET = 384
files = glob.glob(os.path.join(d, "*.png"))

before = sum(os.path.getsize(f) for f in files)
done = 0
skipped = 0
for f in files:
    try:
        im = Image.open(f).convert("RGBA")
        if im.width == TARGET and im.height == TARGET:
            skipped += 1
            continue
        im = im.resize((TARGET, TARGET), Image.LANCZOS)
        im.save(f, optimize=True)
        done += 1
    except Exception as e:
        print("ERR", os.path.basename(f), e)

files = glob.glob(os.path.join(d, "*.png"))
after = sum(os.path.getsize(f) for f in files)
print(f"resized={done} skipped={skipped} files={len(files)}")
print(f"before={before/1024/1024:.1f}MB  after={after/1024/1024:.1f}MB")
