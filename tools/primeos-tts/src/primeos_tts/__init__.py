"""Reusable local TTS helpers built around Kokoro-82M."""

from .engine import SAMPLE_RATE, SynthesisResult, SynthesisSegment, synthesize
from .voices import Voice, get_voice, list_voices

__all__ = [
    "SAMPLE_RATE",
    "SynthesisResult",
    "SynthesisSegment",
    "Voice",
    "get_voice",
    "list_voices",
    "synthesize",
]

