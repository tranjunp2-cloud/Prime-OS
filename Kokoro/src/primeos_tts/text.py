"""Input normalization for scripts written in Markdown or plain text."""

from __future__ import annotations

import re
import sys
from pathlib import Path

_FRONTMATTER = re.compile(r"\A---\s*\n.*?\n---\s*\n", re.DOTALL)
_FENCED_BLOCK = re.compile(r"```.*?```", re.DOTALL)
_IMAGE = re.compile(r"!\[[^\]]*\]\([^)]*\)")
_LINK = re.compile(r"\[([^\]]+)\]\([^)]*\)")
_HTML = re.compile(r"<[^>]+>")
_HEADING = re.compile(r"^\s{0,3}#{1,6}\s*", re.MULTILINE)
_LIST_MARKER = re.compile(r"^\s*(?:[-*+]\s+|\d+[.)]\s+)", re.MULTILINE)
_EMPHASIS = re.compile(r"([*_~]){1,3}")


def clean_script(text: str, *, markdown: bool = True) -> str:
    """Convert a Markdown/plain-text script into narration-ready text."""

    if not text or not text.strip():
        raise ValueError("Input script is empty.")

    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    if markdown:
        normalized = _FRONTMATTER.sub("", normalized)
        normalized = _FENCED_BLOCK.sub("", normalized)
        normalized = _IMAGE.sub("", normalized)
        normalized = _LINK.sub(r"\1", normalized)
        normalized = _HTML.sub("", normalized)
        normalized = _HEADING.sub("", normalized)
        normalized = _LIST_MARKER.sub("", normalized)
        normalized = _EMPHASIS.sub("", normalized)

    paragraphs = []
    for paragraph in re.split(r"\n\s*\n+", normalized):
        lines = [re.sub(r"\s+", " ", line).strip() for line in paragraph.splitlines()]
        value = " ".join(line for line in lines if line)
        if value:
            paragraphs.append(value)

    result = "\n\n".join(paragraphs).strip()
    if not result:
        raise ValueError("Input script has no speakable text after cleanup.")
    return result


def load_script(source: str) -> str:
    """Read a path, stdin (`-`), or treat the argument as inline text."""

    if source == "-":
        return sys.stdin.read()
    path = Path(source).expanduser()
    if path.is_file():
        return path.read_text(encoding="utf-8")
    return source
