"""Command-line interface for repeatable Kokoro voice generation."""

from __future__ import annotations

import argparse
import importlib.metadata
import shutil
import sys
from pathlib import Path

from .audio import write_audio
from .engine import synthesize
from .text import clean_script, load_script
from .voices import list_voices


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="kokoro-tts",
        description="Generate local narration with Kokoro-82M.",
    )
    commands = parser.add_subparsers(dest="command", required=True)

    generate = commands.add_parser(
        "generate", help="Generate audio from a file, stdin, or inline text."
    )
    generate.add_argument("source", help="Markdown/text path, '-' for stdin, or inline text.")
    generate.add_argument(
        "output", type=Path, help="Output path: wav, flac, ogg, mp3, m4a, or aac."
    )
    generate.add_argument("--voice", default="af_heart", help="Kokoro voice (default: af_heart).")
    generate.add_argument(
        "--lang", help="Optional language code/alias; normally inferred from voice."
    )
    generate.add_argument(
        "--speed", type=float, default=1.0, help="Speech speed from >0 to 4 (default: 1)."
    )
    generate.add_argument(
        "--pause-ms", type=int, default=150, help="Pause between chunks (default: 150)."
    )
    generate.add_argument("--device", choices=("auto", "cpu", "mps", "cuda"), default="auto")
    generate.add_argument("--cache-dir", help="Hugging Face cache root for model/voice downloads.")
    generate.add_argument("--repo-id", default="hexgrad/Kokoro-82M", help=argparse.SUPPRESS)
    generate.add_argument(
        "--plain-text", action="store_true", help="Do not apply Markdown cleanup."
    )
    generate.add_argument(
        "--format", dest="audio_format", default="auto", help="Override output format."
    )
    generate.set_defaults(handler=_handle_generate)

    voices = commands.add_parser("voices", help="List available Kokoro voices.")
    voices.add_argument("--lang", help="Filter by language code or alias.")
    voices.set_defaults(handler=_handle_voices)

    doctor = commands.add_parser(
        "doctor", help="Check local dependencies and Apple Silicon support."
    )
    doctor.set_defaults(handler=_handle_doctor)
    return parser


def _handle_generate(args: argparse.Namespace) -> int:
    raw_script = load_script(args.source)
    script = clean_script(raw_script, markdown=not args.plain_text)
    result = synthesize(
        script,
        voice=args.voice,
        lang_code=args.lang,
        speed=args.speed,
        pause_ms=args.pause_ms,
        device=args.device,
        repo_id=args.repo_id,
        cache_dir=args.cache_dir,
    )
    output = write_audio(result, args.output, audio_format=args.audio_format)
    print(f"Generated {output}")
    print(
        f"Voice: {result.voice} | Language: {result.lang_code} "
        f"| Duration: {result.duration_seconds:.2f}s"
    )
    print(f"Segments: {len(result.segments)} | Sample rate: {result.sample_rate} Hz")
    return 0


def _handle_voices(args: argparse.Namespace) -> int:
    voices = list_voices(args.lang)
    if not voices:
        print(f"No voices found for language {args.lang!r}.", file=sys.stderr)
        return 1
    print("VOICE        LANGUAGE                 ACCENT")
    for voice in voices:
        print(f"{voice.name:<12} {voice.language:<24} {voice.accent}")
    return 0


def _handle_doctor(_: argparse.Namespace) -> int:
    failures = 0
    print(f"Python: {sys.version.split()[0]}")
    try:
        print(f"kokoro: {importlib.metadata.version('kokoro')}")
    except importlib.metadata.PackageNotFoundError:
        print("kokoro: missing")
        failures += 1
    for executable in ("espeak-ng", "ffmpeg"):
        location = shutil.which(executable)
        print(f"{executable}: {location or 'missing'}")
        if not location:
            failures += 1
    try:
        import torch

        mps = bool(torch.backends.mps.is_available())
        print(f"PyTorch: {torch.__version__} | MPS available: {mps}")
    except ImportError:
        print("PyTorch: missing")
        failures += 1
    if failures:
        print("Doctor found missing dependencies.", file=sys.stderr)
        return 1
    print("Doctor check passed.")
    return 0


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    return args.handler(args)


if __name__ == "__main__":
    raise SystemExit(main())
