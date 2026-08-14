"""Run the TTS CLI from the repository with `python tools/tts/generate.py ...`."""

from __future__ import annotations

import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from primeos_tts.cli import main

if __name__ == "__main__":
    raise SystemExit(main(["generate", *sys.argv[1:]]))
