from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROJECTS = ROOT.parent
MUSIC_PUBLIC = PROJECTS / "rongyu-music-assets" / "public"
LECTURE_PUBLIC = PROJECTS / "rongyu-lecture-assets" / "public"


def load_json(path: Path) -> list[dict[str, object]]:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    errors: list[str] = []
    tracks = load_json(ROOT / "src" / "data" / "tracks.json")
    lectures = load_json(ROOT / "src" / "data" / "lectures.json")

    expected_audio: set[str] = set()
    for track in tracks:
        file_name = Path(str(track["audio"])).name
        expected_audio.add(file_name)
        if not (MUSIC_PUBLIC / "audio" / file_name).is_file():
            errors.append(f"Missing MP3 in music asset repository: {file_name}")
        cover = ROOT / "public" / "images" / "music" / f"{Path(file_name).stem}.jpg"
        if not cover.is_file():
            errors.append(f"Missing music cover in website repository: {cover.name}")

    expected_pdfs: set[tuple[str, str]] = set()
    for lecture in lectures:
        if lecture.get("retired"):
            continue
        subject = str(lecture["subject"])
        file_name = str(lecture["fileName"])
        expected_pdfs.add((subject, file_name))
        if not (LECTURE_PUBLIC / "lectures" / subject / file_name).is_file():
            errors.append(f"Missing PDF in lecture asset repository: {subject}/{file_name}")

    actual_audio = {path.name for path in (MUSIC_PUBLIC / "audio").glob("*.mp3")}
    actual_pdfs = {
        (path.parent.name, path.name)
        for path in (LECTURE_PUBLIC / "lectures").glob("*/*.pdf")
    }
    for file_name in sorted(actual_audio - expected_audio):
        errors.append(f"Unreferenced MP3 in music asset repository: {file_name}")
    for subject, file_name in sorted(actual_pdfs - expected_pdfs):
        errors.append(f"Unreferenced PDF in lecture asset repository: {subject}/{file_name}")

    if (ROOT / "public" / "audio").exists():
        errors.append("Website repository still contains public/audio")
    if (ROOT / "public" / "lectures").exists():
        errors.append("Website repository still contains public/lectures")

    print(
        f"Verified {len(expected_audio)} MP3 files and {len(expected_pdfs)} PDFs "
        "across the sibling asset repositories."
    )
    if errors:
        raise SystemExit("\n".join(errors))


if __name__ == "__main__":
    main()
