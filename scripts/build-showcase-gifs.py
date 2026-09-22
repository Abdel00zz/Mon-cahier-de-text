"""Assemble real app captures. Requires Pillow; see showcase-preview/README.md."""
from pathlib import Path
import argparse
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument("--captures", type=Path, default=Path("tmp/showcase-captures"))
parser.add_argument("--capture-scale", type=float, default=0.8,
                    help="Visible content scale in the browser's exported PNG (use 1 for native-sized captures).")
args = parser.parse_args()
output = Path("public/showcase")
output.mkdir(parents=True, exist_ok=True)
for layout, viewport in [("landscape", (1280, 880)), ("portrait", (560, 850))]:
    size = tuple(round(n * args.capture_scale) for n in viewport)
    for locale in ["fr", "ar"]:
        scenes = [Image.open(args.captures / f"{layout}-{locale}-{scene}.png").convert("RGB").crop((0, 0, *size))
                  for scene in ["classes", "editor", "schedule"]]
        scenes[0].save(output / f"{layout}-{locale}.webp", quality=86, method=6)
        if layout == "portrait":
            for name, scene in zip(["editor", "schedule"], scenes[1:]):
                scene.save(output / f"portrait-{locale}-{name}.webp", quality=86, method=6)
        # One shared palette prevents colour flicker during the short dissolves.
        atlas = Image.new("RGB", (size[0], size[1] * len(scenes)))
        for index, scene in enumerate(scenes):
            atlas.paste(scene, (0, index * size[1]))
        palette = atlas.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
        frames, durations = [], []
        for index, scene in enumerate(scenes):
            frames.append(scene.quantize(palette=palette, dither=Image.Dither.NONE))
            durations.append(2800)
            following = scenes[(index + 1) % len(scenes)]
            for step in range(1, 4):
                frames.append(Image.blend(scene, following, step / 4).quantize(palette=palette, dither=Image.Dither.NONE))
                durations.append(60)
        target = output / f"{layout}-{locale}.gif"
        frames[0].save(target, save_all=True, append_images=frames[1:], duration=durations,
                       loop=0, optimize=True, disposal=1)
        print(f"{target}: {target.stat().st_size // 1024} KiB, {size[0]}×{size[1]}, {len(frames)} frames")
