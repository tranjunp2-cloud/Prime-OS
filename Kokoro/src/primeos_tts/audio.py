"""Audio export helpers for WAV/FLAC/OGG and video-friendly formats."""

from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path

from .engine import SynthesisResult

LOSSLESS_FORMATS = {"wav", "flac", "ogg"}
VIDEO_FORMATS = {"mp3", "m4a", "aac"}


def write_audio(result: SynthesisResult, output: str | Path, *, audio_format: str = "auto") -> Path:
    """Write a synthesis result and return the resolved output path."""

    import soundfile as sf

    destination = Path(output).expanduser()
    destination.parent.mkdir(parents=True, exist_ok=True)
    suffix = destination.suffix.lower().lstrip(".")
    selected_format = (audio_format if audio_format != "auto" else suffix).lower()
    if selected_format not in LOSSLESS_FORMATS | VIDEO_FORMATS:
        raise ValueError("Supported formats are wav, flac, ogg, mp3, m4a, and aac.")

    if selected_format in LOSSLESS_FORMATS:
        sf.write(destination, result.audio, result.sample_rate, format=selected_format.upper())
        return destination

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError(
            "ffmpeg is required for mp3/m4a/aac output. Install it with `brew install ffmpeg`."
        )

    with tempfile.TemporaryDirectory(prefix="primeos-kokoro-") as temporary_dir:
        temporary_wav = Path(temporary_dir) / "input.wav"
        sf.write(temporary_wav, result.audio, result.sample_rate, format="WAV")
        codec_args = {
            "mp3": ["-codec:a", "libmp3lame", "-q:a", "2"],
            "m4a": ["-codec:a", "aac", "-b:a", "192k"],
            "aac": ["-codec:a", "aac", "-b:a", "192k", "-f", "adts"],
        }[selected_format]
        command = [
            ffmpeg,
            "-y",
            "-loglevel",
            "error",
            "-i",
            str(temporary_wav),
            *codec_args,
            str(destination),
        ]
        subprocess.run(command, check=True)
    return destination
