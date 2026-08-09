from __future__ import annotations

import base64
import re
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
FONTS = PUBLIC / "fonts"
DOWNLOADS = PUBLIC / "downloads"
APPS = PUBLIC / "apps"

EMBED_START = "/* TOOL_FONT_EMBED_START */"
EMBED_END = "/* TOOL_FONT_EMBED_END */"
TOOL_STACK = '"Latin Modern Roman Embedded", "Fandol Song Embedded", serif'


def data_uri(path: Path) -> str:
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:font/otf;base64,{encoded}"


def font_face(family: str, source: str, newline: str) -> str:
    return newline.join(
        (
            "@font-face {",
            f'  font-family: "{family}";',
            f'  src: url("{source}") format("opentype");',
            "  font-style: normal;",
            "  font-weight: 400;",
            "  font-display: swap;",
            "}",
        )
    )


def replace_once(text: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1)
    if count != 1:
        raise RuntimeError(f"Expected one {label} replacement, found {count}")
    return updated


def inject_font_block(text: str, faces: list[str], newline: str) -> str:
    block = newline.join((EMBED_START, *faces, EMBED_END))
    marker_pattern = re.compile(
        re.escape(EMBED_START) + r".*?" + re.escape(EMBED_END),
        re.DOTALL,
    )
    if marker_pattern.search(text):
        return marker_pattern.sub(block, text, count=1)
    return replace_once(text, r"<style>\r?\n", f"<style>{newline}{block}{newline}", "style opening")


def update_docbridge(text: str, fandol_uri: str, newline: str) -> str:
    text = inject_font_block(
        text,
        [font_face("Fandol Song Embedded", fandol_uri, newline)],
        newline,
    )
    for variable in ("display", "body", "mono"):
        text = replace_once(
            text,
            rf"--{variable}\s*:[^;]+;",
            f"--{variable}:{TOOL_STACK};",
            f"DocBridge --{variable}",
        )
    return text


def update_workspace_viewer(text: str, latin_uri: str, fandol_uri: str, newline: str) -> str:
    text = inject_font_block(
        text,
        [
            font_face("Latin Modern Roman Embedded", latin_uri, newline),
            font_face("Fandol Song Embedded", fandol_uri, newline),
        ],
        newline,
    )
    return replace_once(
        text,
        r'font-family:\s*(?:Inter,\s*"Segoe UI",\s*"PingFang SC",\s*"Microsoft YaHei",\s*Arial,\s*sans-serif|"Latin Modern Roman Embedded",\s*"Fandol Song Embedded",\s*serif);',
        f"font-family: {TOOL_STACK};",
        "Workspace Viewer body font",
    )


def update_file(path: Path, updater) -> None:
    raw = path.read_bytes()
    newline = "\r\n" if b"\r\n" in raw else "\n"
    original = raw.decode("utf-8")
    updated = updater(original, newline)
    path.write_bytes(updated.encode("utf-8"))


def sync_tool_fonts() -> None:
    latin_uri = data_uri(FONTS / "lmroman10-regular.otf")
    fandol_uri = data_uri(FONTS / "FandolSong-Regular.otf")

    docbridge = DOWNLOADS / "DocBridge.html"
    workspace_viewer = DOWNLOADS / "workspace-viewer.html"

    update_file(
        docbridge,
        lambda text, newline: update_docbridge(text, fandol_uri, newline),
    )
    update_file(
        workspace_viewer,
        lambda text, newline: update_workspace_viewer(text, latin_uri, fandol_uri, newline),
    )

    destinations = {
        docbridge: APPS / "docbridge" / "index.html",
        workspace_viewer: APPS / "workspace-viewer" / "index.html",
    }
    for source, destination in destinations.items():
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)


if __name__ == "__main__":
    sync_tool_fonts()
