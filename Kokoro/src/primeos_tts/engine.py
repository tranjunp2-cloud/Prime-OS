"""Kokoro inference and audio assembly."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .voices import get_voice, resolve_lang_code

SAMPLE_RATE = 24_000


@dataclass(frozen=True)
class SynthesisSegment:
    """One generated segment and its original graphemes."""

    index: int
    text: str
    phonemes: str
    duration_seconds: float


@dataclass(frozen=True)
class SynthesisResult:
    """Combined waveform and useful metadata for downstream video tooling."""

    audio: Any
    sample_rate: int
    voice: str
    lang_code: str
    segments: tuple[SynthesisSegment, ...]

    @property
    def duration_seconds(self) -> float:
        return len(self.audio) / self.sample_rate


def _select_device(device: str) -> str | None:
    if device != "auto":
        return None if device == "default" else device

    import torch

    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")
        return "mps"
    return "cpu"


def _as_numpy(audio: Any):
    import numpy as np

    if hasattr(audio, "detach"):
        audio = audio.detach().cpu().numpy()
    return np.asarray(audio, dtype=np.float32).reshape(-1)


def synthesize(
    text: str,
    *,
    voice: str = "af_heart",
    lang_code: str | None = None,
    speed: float = 1.0,
    pause_ms: int = 150,
    split_pattern: str = r"\n+",
    device: str = "auto",
    repo_id: str = "hexgrad/Kokoro-82M",
    cache_dir: str | Path | None = None,
) -> SynthesisResult:
    """Generate one combined waveform from text with Kokoro-82M."""

    import numpy as np

    voice_info = get_voice(voice)
    resolved_lang = resolve_lang_code(lang_code, voice_info.name)
    if not 0 < speed <= 4:
        raise ValueError("speed must be greater than 0 and no more than 4.")
    if pause_ms < 0:
        raise ValueError("pause_ms must be zero or greater.")
    if resolved_lang != voice_info.lang_code:
        raise ValueError(
            f"Voice {voice_info.name!r} belongs to lang_code={voice_info.lang_code!r}, "
            f"not {resolved_lang!r}."
        )

    if cache_dir:
        os.environ.setdefault("HF_HOME", str(Path(cache_dir).expanduser()))
    selected_device = _select_device(device)

    from kokoro import KPipeline

    pipeline = KPipeline(lang_code=resolved_lang, repo_id=repo_id, device=selected_device)
    chunks = []
    segments = []
    silence = np.zeros(round(SAMPLE_RATE * pause_ms / 1000), dtype=np.float32)

    for index, result in enumerate(
        pipeline(text, voice=voice_info.name, speed=speed, split_pattern=split_pattern)
    ):
        audio = result.audio
        if audio is None:
            continue
        waveform = _as_numpy(audio)
        if not len(waveform):
            continue
        if chunks and len(silence):
            chunks.append(silence)
        chunks.append(waveform)
        segments.append(
            SynthesisSegment(
                index=index,
                text=result.graphemes,
                phonemes=result.phonemes,
                duration_seconds=len(waveform) / SAMPLE_RATE,
            )
        )

    if not chunks:
        raise RuntimeError("Kokoro produced no audio. Check the script and selected language.")
    return SynthesisResult(
        audio=np.concatenate(chunks),
        sample_rate=SAMPLE_RATE,
        voice=voice_info.name,
        lang_code=resolved_lang,
        segments=tuple(segments),
    )

