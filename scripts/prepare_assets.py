from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image

from sync_tool_fonts import sync_tool_fonts


ROOT = Path(__file__).resolve().parents[1]
PROJECTS = ROOT.parent
INPUT = PROJECTS / "input"
PUBLIC = ROOT / "public"
MUSIC_PUBLIC = PROJECTS / "rongyu-music-assets" / "public"
LECTURE_PUBLIC = PROJECTS / "rongyu-lecture-assets" / "public"


LECTURE_GROUPS = {
    "maths": INPUT / "maths",
    "physics": INPUT / "phys",
}

LECTURE_FILES = {
    "maths": {
        "常微分方程习题整理与解答.pdf": "Aux_ODE.pdf",
        "抽象代数习题整理与解答.pdf": "Aux_AA.pdf",
    },
    "physics": {
        "原子物理学练习题整理与解答.pdf": "Aux_AP.pdf",
        "电动力学习题整理与解答.pdf": "Aux_ED.pdf",
    },
}

TRACKS = {
    "Bill Evans - Children's Play Song.mp3": "childrens-play-song",
    "Bill Evans - Darn That Dream.mp3": "darn-that-dream",
    "Bill Evans - Dream Gypsy.mp3": "dream-gypsy",
    "Bill Evans - I Hear a Rhapsody.mp3": "i-hear-a-rhapsody",
    "Bill Evans - I'm All Smiles.mp3": "im-all-smiles",
    "Bill Evans - Romain.mp3": "romain",
    "Bill Evans - Skating in Central Park.mp3": "skating-in-central-park",
    "Bill Evans - Soiree.mp3": "soiree",
    "Bill Evans - Theme From MxAxSxH (Suicide Is Painless).mp3": "theme-from-mash",
    "Bill Evans - My Funny Valentine.mp3": "my-funny-valentine",
    "Bill Evans - What Are You Doing The Rest Of Your Life.mp3": "what-are-you-doing-the-rest-of-your-life",
    "Bill Evans - Why Did I Choose You (Master Take).mp3": "why-did-i-choose-you",
    "Bill Evans - You Must Believe In Spring.mp3": "you-must-believe-in-spring",
    "Miles Davis - All Blues.mp3": "all-blues",
    "Miles Davis - Blue in Green.mp3": "blue-in-green",
    "Miles Davis - Flamenco Sketches.mp3": "flamenco-sketches",
    "Miles Davis - Freddie Freeloader.mp3": "freddie-freeloader",
    "Miles Davis - So What.mp3": "so-what",
    "The Bill Evans Trio - Detour Ahead (take 2).mp3": "detour-ahead",
    "The Bill Evans Trio - My Foolish Heart.mp3": "my-foolish-heart",
    "The Bill Evans Trio - Milestones.mp3": "milestones",
    "The Bill Evans Trio - My Romance (take 1).mp3": "my-romance",
    "The Bill Evans Trio - Porgy (I Loves You Porgy).mp3": "porgy",
    "The Bill Evans Trio - Some Other Time.mp3": "some-other-time",
    "The Bill Evans Trio - Waltz for Debby (take 2).mp3": "waltz-for-debby",
    "The Dave Brubeck Quartet - Blue Rondo à la Turk.mp3": "blue-rondo-a-la-turk",
    "The Dave Brubeck Quartet - Everybody's Jumpin'.mp3": "everybodys-jumpin",
    "The Dave Brubeck Quartet - Kathy's Waltz.mp3": "kathys-waltz",
    "The Dave Brubeck Quartet - Pick up Sticks.mp3": "pick-up-sticks",
    "The Dave Brubeck Quartet - Strange Meadow Lark.mp3": "strange-meadow-lark",
    "The Dave Brubeck Quartet - Take Five.mp3": "take-five",
    "The Dave Brubeck Quartet - Three to Get Ready.mp3": "three-to-get-ready",
}


def synchsafe(value: bytes) -> int:
    return (
        ((value[0] & 0x7F) << 21)
        | ((value[1] & 0x7F) << 14)
        | ((value[2] & 0x7F) << 7)
        | (value[3] & 0x7F)
    )


def split_terminated(payload: bytes, encoding: int) -> tuple[bytes, bytes]:
    if encoding in (1, 2):
        for index in range(0, len(payload) - 1, 2):
            if payload[index : index + 2] == b"\x00\x00":
                return payload[:index], payload[index + 2 :]
        return payload, b""
    index = payload.find(b"\x00")
    return (payload, b"") if index < 0 else (payload[:index], payload[index + 1 :])


def embedded_cover(path: Path) -> bytes:
    raw = path.read_bytes()
    if raw[:3] != b"ID3":
        raise ValueError(f"No ID3 tag found in {path.name}")

    version = raw[3]
    tag_size = synchsafe(raw[6:10])
    tag = raw[10 : 10 + tag_size]
    position = 0

    while position + 10 <= len(tag):
        frame_id = tag[position : position + 4]
        if frame_id == b"\x00\x00\x00\x00":
            break
        frame_size_bytes = tag[position + 4 : position + 8]
        frame_size = (
            synchsafe(frame_size_bytes)
            if version == 4
            else int.from_bytes(frame_size_bytes, "big")
        )
        data = tag[position + 10 : position + 10 + frame_size]
        if frame_id == b"APIC" and data:
            encoding = data[0]
            mime_end = data.find(b"\x00", 1)
            if mime_end < 0:
                break
            _, image_data = split_terminated(data[mime_end + 2 :], encoding)
            if image_data:
                return image_data
        position += 10 + frame_size

    raise ValueError(f"No embedded cover found in {path.name}")


def publish_background(source: Path, prefix: str) -> None:
    """Publish one source background into the original plus sized variants."""
    if not source.exists():
        return
    shutil.copy2(source, PUBLIC / "images" / f"{prefix}-original.jpg")
    with Image.open(source) as image:
        for width in (1920, 3840):
            height = round(image.height * width / image.width)
            resized = image.resize((width, height), Image.Resampling.LANCZOS)
            resized.save(
                PUBLIC / "images" / f"{prefix}-{width}.jpg",
                format="JPEG",
                quality=90,
                optimize=True,
                progressive=True,
            )


def prepare_images() -> None:
    image_dir = PUBLIC / "images"
    image_dir.mkdir(parents=True, exist_ok=True)

    # Two rotating homepage backgrounds: 背景.jpg (A) and 背景B.jpg (B).
    publish_background(INPUT / "images" / "背景.jpg", "background")
    publish_background(INPUT / "images" / "背景B.jpg", "background-b")

    source_avatar = INPUT / "images" / "头像.jpg"

    if source_avatar.exists():
        shutil.copy2(source_avatar, image_dir / "avatar.jpg")
        with Image.open(source_avatar) as image:
            image.resize((180, 180), Image.Resampling.LANCZOS).save(
                image_dir / "apple-touch-icon.png", format="PNG", optimize=True
            )
            image.resize((32, 32), Image.Resampling.LANCZOS).save(
                image_dir / "favicon-32.png", format="PNG", optimize=True
            )


def prepare_music() -> None:
    music_dir = PUBLIC / "images" / "music"
    audio_dir = MUSIC_PUBLIC / "audio"
    music_dir.mkdir(parents=True, exist_ok=True)
    audio_dir.mkdir(parents=True, exist_ok=True)

    for source_name, slug in TRACKS.items():
        source = INPUT / "music" / source_name
        if not source.exists():
            continue
        cover_bytes = embedded_cover(source)
        cover_path = music_dir / f"{slug}.jpg"
        cover_path.write_bytes(cover_bytes)
        with Image.open(cover_path) as cover:
            cover.convert("RGB").resize((420, 420), Image.Resampling.LANCZOS).save(
                cover_path,
                format="JPEG",
                quality=88,
                optimize=True,
                progressive=True,
            )
        shutil.copy2(source, audio_dir / f"{slug}.mp3")


def prepare_documents() -> None:
    for public_name, source_dir in LECTURE_GROUPS.items():
        destination = LECTURE_PUBLIC / "lectures" / public_name
        destination.mkdir(parents=True, exist_ok=True)
        for source_name, destination_name in LECTURE_FILES[public_name].items():
            source = source_dir / source_name
            if source.exists():
                shutil.copy2(source, destination / destination_name)


def prepare_tools() -> None:
    app_sources = {
        "workspace-viewer.html": "workspace-viewer",
        "DocBridge.html": "docbridge",
    }
    downloads = PUBLIC / "downloads"
    downloads.mkdir(parents=True, exist_ok=True)

    for source_name, slug in app_sources.items():
        source = INPUT / "tools" / source_name
        if not source.exists():
            continue
        destination = PUBLIC / "apps" / slug
        destination.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination / "index.html")
        shutil.copy2(source, downloads / source_name)

    ryplan_input = INPUT / "tools" / "ryplan.html"
    if ryplan_input.exists():
        shutil.copy2(ryplan_input, downloads / "RYplan.html")

    sync_tool_fonts()


if __name__ == "__main__":
    if not (MUSIC_PUBLIC.parent / ".git").exists():
        raise SystemExit(f"Missing sibling repository: {MUSIC_PUBLIC.parent}")
    if not (LECTURE_PUBLIC.parent / ".git").exists():
        raise SystemExit(f"Missing sibling repository: {LECTURE_PUBLIC.parent}")
    prepare_images()
    prepare_music()
    prepare_documents()
    prepare_tools()
    print("Prepared public assets.")
