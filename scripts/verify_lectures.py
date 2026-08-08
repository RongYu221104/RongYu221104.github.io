from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
LECTURES = ROOT / "src" / "data" / "lectures.json"
LECTURE_PUBLIC = ROOT.parent / "rongyu-lecture-assets" / "public"
EXPECTED_COVER_SIZE = (720, 960)


def main() -> None:
    lectures = json.loads(LECTURES.read_text(encoding="utf-8"))
    errors: list[str] = []
    cover_hashes: dict[str, str] = {}

    for lecture in lectures:
        file_name = str(lecture["fileName"])
        stem = Path(file_name).stem
        pdf = LECTURE_PUBLIC / "lectures" / str(lecture["subject"]) / file_name
        cover = ROOT / "public" / "images" / "lectures" / f"{stem}.png"

        if not pdf.exists():
            errors.append(f"Missing PDF in lecture asset repository: {pdf}")

        if not cover.exists():
            errors.append(f"Missing cover: {cover.relative_to(ROOT)}")
            continue
        with Image.open(cover) as image:
            if image.size != EXPECTED_COVER_SIZE:
                errors.append(f"Cover size mismatch: {cover.name} is {image.size}")
        digest = hashlib.sha256(cover.read_bytes()).hexdigest()
        if digest in cover_hashes:
            errors.append(f"Duplicate covers: {cover_hashes[digest]} and {cover.name}")
        cover_hashes[digest] = cover.name

    print(f"Verified {len(lectures)} lecture records and {len(cover_hashes)} unique covers.")
    if errors:
        raise SystemExit("\n".join(errors))


if __name__ == "__main__":
    main()
