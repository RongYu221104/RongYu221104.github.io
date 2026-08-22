from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROJECTS = ROOT.parent
MUSIC_PUBLIC = PROJECTS / "rongyu-music-assets" / "public"
LECTURE_PUBLIC = PROJECTS / "rongyu-lecture-assets" / "public"


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    errors: list[str] = []
    tracks = load_json(ROOT / "src" / "data" / "tracks.json")
    lectures = load_json(ROOT / "src" / "data" / "lectures.json")
    music_context = load_json(MUSIC_PUBLIC / "music-context" / "api" / "v1" / "context.json")

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

    context_track_ids = {str(entry["id"]) for entry in music_context.get("tracks", [])}
    expected_track_ids = {Path(file_name).stem for file_name in expected_audio}
    if context_track_ids != expected_track_ids:
        for track_id in sorted(expected_track_ids - context_track_ids):
            errors.append(f"Missing track background API entry: {track_id}")
        for track_id in sorted(context_track_ids - expected_track_ids):
            errors.append(f"Unreferenced track background API entry: {track_id}")

    expected_context_counts = {"artists": 5, "albums": 6, "tracks": 40}
    for collection, expected_count in expected_context_counts.items():
        actual_count = len(music_context.get(collection, []))
        if actual_count != expected_count:
            errors.append(f"Music context API {collection}: expected {expected_count}, found {actual_count}")

    for artist in music_context.get("artists", []):
        image = artist.get("image")
        if image:
            relative = str(image).removeprefix("/rongyu-music-assets/")
            if not (MUSIC_PUBLIC / relative).is_file():
                errors.append(f"Missing artist image referenced by music context API: {relative}")

    print(
        f"Verified {len(expected_audio)} MP3 files, {len(expected_pdfs)} PDFs, and "
        f"{len(context_track_ids)} music background entries across the sibling asset repositories."
    )
    if errors:
        raise SystemExit("\n".join(errors))


if __name__ == "__main__":
    main()
