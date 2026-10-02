"""Assemble real app captures. Requires Pillow; see showcase-preview/README.md."""
from pathlib import Path
import argparse
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument("--captures", type=Path, default=Path("tmp/showcase-captures"))
parser.add_argument("--capture-scale", type=float, default=0.8,
                    help="Visible content scale in the browser's exported PNG (use 1 for native-sized captures).")
args = parser.parse_args()
output = Path("public/showcase")
output.mkdir(parents=True, exist_ok=True)

MATTE = (251, 250, 247)


def floating_capture(path: Path, size: tuple[int, int]) -> Image.Image:
    """Remove only the contiguous canvas, preserving the white UI surfaces."""
    scene = Image.open(path).convert("RGBA").crop((0, 0, *size))
    # The preview uses a single neutral canvas. Flood-filling from the outside
    # leaves enclosed cards, panels, text, borders and their soft shadows intact.
    ImageDraw.floodfill(scene, (size[0] - 1, size[1] - 1), (*MATTE, 0), thresh=3)
    return scene


def flatten(scene: Image.Image) -> Image.Image:
    background = Image.new("RGBA", scene.size, (*MATTE, 255))
    return Image.alpha_composite(background, scene).convert("RGB")


def gif_frame(scene: Image.Image, palette: Image.Image) -> Image.Image:
    indexed = flatten(scene).quantize(palette=palette, dither=Image.Dither.NONE)
    # Reserve palette entry 255 for transparency in every frame. A shared
    # palette avoids flashing as the three live app screens crossfade.
    pixels = bytearray(indexed.tobytes())
    alpha = scene.getchannel("A").tobytes()
    for position, opacity in enumerate(alpha):
        if opacity < 128:
            pixels[position] = 255
    frame = Image.frombytes("P", scene.size, bytes(pixels))
    colors = palette.getpalette()
    colors[765:768] = list(MATTE)
    frame.putpalette(colors)
    return frame


def save_webp(scene: Image.Image, target: Path) -> None:
    # A dev server can be reading the current asset; write a complete successor
    # before replacing it so previews never observe a partial image.
    pending = target.with_name(f"{target.stem}.pending.webp")
    scene.save(pending, lossless=True, method=6)
    pending.replace(target)


# Desktop crops close below the longest lesson table, without a blank footer.
for layout, viewport in [("landscape", (1280, 840)), ("portrait", (560, 850))]:
    size = tuple(round(n * args.capture_scale) for n in viewport)
    for locale in ["fr", "ar"]:
        scenes = [floating_capture(args.captures / f"{layout}-{locale}-{scene}.png", size)
                  for scene in ["classes", "editor", "schedule"]]
        save_webp(scenes[0], output / f"{layout}-{locale}.webp")
        if layout == "portrait":
            for name, scene in zip(["editor", "schedule"], scenes[1:]):
                save_webp(scene, output / f"portrait-{locale}-{name}.webp")
        # One shared palette prevents colour flicker during the short dissolves.
        atlas = Image.new("RGB", (size[0], size[1] * len(scenes)), MATTE)
        for index, scene in enumerate(scenes):
            atlas.paste(flatten(scene), (0, index * size[1]))
        palette = atlas.quantize(colors=255, method=Image.Quantize.MEDIANCUT)
        frames, durations = [], []
        for index, scene in enumerate(scenes):
            frames.append(gif_frame(scene, palette))
            durations.append(2800)
            following = scenes[(index + 1) % len(scenes)]
            for step in range(1, 4):
                frames.append(gif_frame(Image.blend(scene, following, step / 4), palette))
                durations.append(60)
        target = output / f"{layout}-{locale}.gif"
        pending = target.with_name(f"{target.stem}.pending.gif")
        frames[0].save(pending, save_all=True, append_images=frames[1:], duration=durations,
                       loop=0, optimize=True, disposal=2, transparency=255)
        pending.replace(target)
        print(f"{target}: {target.stat().st_size // 1024} KiB, {size[0]}×{size[1]}, {len(frames)} frames")
