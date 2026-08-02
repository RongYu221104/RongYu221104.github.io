from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src" / "data" / "lectures.json"
OUTPUT = ROOT / "public" / "images" / "lectures"
FONT = ROOT / "public" / "fonts" / "fz-qingke-benyuesong.ttf"

WIDTH, HEIGHT = 720, 960
PALETTES = {
    "maths": ("#eef3f0", "#203a39", "#6f8f86", "#b49255"),
    "physics": ("#f2efed", "#372d32", "#8a4054", "#b49559"),
}


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT), size=size)


def split_text(text: str, width: int) -> list[str]:
    if len(text) <= width:
        return [text]
    return [text[index : index + width] for index in range(0, len(text), width)]


def draw_pattern(draw: ImageDraw.ImageDraw, seed: int, colors: tuple[str, ...]) -> None:
    ink, accent, brass = colors[1], colors[2], colors[3]
    cx, cy = 366, 367
    variant = seed % 5

    if variant == 0:
        for radius in range(52, 214, 32):
            draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline=accent, width=3)
        for angle in range(0, 360, 45):
            x = cx + math.cos(math.radians(angle)) * 212
            y = cy + math.sin(math.radians(angle)) * 212
            draw.line((cx, cy, x, y), fill=ink, width=2)
    elif variant == 1:
        points = []
        for index in range(150):
            angle = index * 0.34
            radius = 1.28 * index
            points.append((cx + math.cos(angle) * radius, cy + math.sin(angle) * radius))
        draw.line(points, fill=accent, width=5)
        draw.ellipse((cx - 13, cy - 13, cx + 13, cy + 13), fill=brass)
    elif variant == 2:
        for row in range(-4, 5):
            for column in range(-4, 5):
                x = cx + column * 48 + (row % 2) * 24
                y = cy + row * 42
                draw.ellipse((x - 5, y - 5, x + 5, y + 5), fill=brass)
                if column < 4:
                    draw.line((x, y, x + 48, y), fill=accent, width=2)
                if row < 4:
                    draw.line((x, y, x + 24, y + 42), fill=ink, width=2)
    elif variant == 3:
        points = []
        for x in range(150, 586, 4):
            y = cy + math.sin((x - 150) / 44) * 105 + math.sin((x - 150) / 17) * 22
            points.append((x, y))
        draw.line(points, fill=accent, width=5)
        draw.line((150, cy, 586, cy), fill=ink, width=2)
        draw.ellipse((cx - 92, cy - 92, cx + 92, cy + 92), outline=brass, width=3)
    else:
        for index in range(12):
            angle = math.radians(index * 30 + seed % 30)
            x = cx + math.cos(angle) * 190
            y = cy + math.sin(angle) * 190
            draw.line((cx, cy, x, y), fill=accent if index % 2 else ink, width=3)
            draw.ellipse((x - 10, y - 10, x + 10, y + 10), fill=brass)
        draw.ellipse((cx - 45, cy - 45, cx + 45, cy + 45), outline=ink, width=4)


def generate(lecture: dict[str, object]) -> None:
    subject = str(lecture["subject"])
    background, ink, accent, brass = PALETTES[subject]
    stem = Path(str(lecture["fileName"])).stem
    seed = int(hashlib.sha256(stem.encode("utf-8")).hexdigest()[:8], 16)
    image = Image.new("RGB", (WIDTH, HEIGHT), background)
    draw = ImageDraw.Draw(image)

    draw.rectangle((0, 0, 20, HEIGHT), fill=accent)
    draw.line((76, 76, 644, 76), fill=ink, width=2)
    draw.text((76, 98), "RONGYU'S NOTES", fill=ink, font=font(26))
    draw.text((76, 142), f"{subject.upper()} / {lecture['kind']}", fill=accent, font=font(22))
    draw.text((570, 98), f"{int(lecture['pages']):03d} P", fill=brass, font=font(22))

    draw_pattern(draw, seed, PALETTES[subject])
    draw.line((76, 630, 644, 630), fill=ink, width=2)

    title_lines = split_text(str(lecture["titleZh"]), 8)
    title_size = 58 if len(title_lines) <= 2 else 48
    for index, line in enumerate(title_lines[:3]):
        draw.text((76, 664 + index * (title_size + 10)), line, fill=ink, font=font(title_size))

    english_y = 842 if len(title_lines) <= 2 else 875
    english = str(lecture["titleEn"])
    if len(english) > 47:
        english = english[:44].rstrip() + "..."
    draw.text((76, english_y), english, fill=accent, font=font(24))
    draw.text((76, 906), stem, fill=ink, font=font(20))
    draw.ellipse((610, 892, 634, 916), fill=brass)

    OUTPUT.mkdir(parents=True, exist_ok=True)
    image.save(OUTPUT / f"{stem}.png", format="PNG", optimize=True)


def main() -> None:
    lectures = json.loads(DATA.read_text(encoding="utf-8"))
    for lecture in lectures:
        generate(lecture)
    print(f"Generated {len(lectures)} lecture covers in {OUTPUT}")


if __name__ == "__main__":
    main()
