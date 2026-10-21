"""Copy explicitly selected inbox PDFs to their metadata-owned asset paths.

Run after registering a lecture in src/data/lectures.json. This intentionally
does not process other deliveries, music, images, tools, or the Mini Program.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path

SITE = Path(__file__).resolve().parents[1]
INBOX = SITE.parent.parent / "input" / "docs"
ASSETS = SITE.parent / "rongyu-lecture-assets" / "public" / "lectures"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("filenames", nargs="+", help="Exact inbox PDF filenames")
    args = parser.parse_args()
    records = {row["fileName"]: row for row in json.loads((SITE / "src/data/lectures.json").read_text(encoding="utf-8"))}
    deliveries = []
    for name in args.filenames:
        if Path(name).name != name or not name.endswith(".pdf"):
            parser.error(f"Expected a PDF basename: {name}")
        row = records.get(name)
        if not row or row.get("retired") or row["subject"] not in ("maths", "physics"):
            parser.error(f"Missing active lecture metadata: {name}")
        source = INBOX / name
        if not source.is_file():
            parser.error(f"Missing delivery: {source}")
        deliveries.append((source, ASSETS / row["subject"] / name))
    for source, target in deliveries:
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists() or hashlib.sha256(target.read_bytes()).hexdigest() != digest:
            shutil.copy2(source, target)
        if hashlib.sha256(target.read_bytes()).hexdigest() != digest:
            raise RuntimeError(f"Copy verification failed: {target}")
        print(f"{target.name}: {target.stat().st_size} bytes SHA-256 {digest}")


if __name__ == "__main__":
    main()
