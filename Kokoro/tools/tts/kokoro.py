"""Compatibility import for the reusable Kokoro engine."""

from primeos_tts.engine import SAMPLE_RATE, SynthesisResult, SynthesisSegment, synthesize

__all__ = ["SAMPLE_RATE", "SynthesisResult", "SynthesisSegment", "synthesize"]

