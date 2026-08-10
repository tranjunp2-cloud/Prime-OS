"""Convenience entrypoint: `uv run python generate.py script.md output.wav`."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
from primeos_tts.cli import main

if __name__ == "__main__":
    raise SystemExit(main(["generate", *sys.argv[1:]]))
