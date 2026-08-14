"""Compatibility import for the official Kokoro voice catalog."""

from primeos_tts.voices import Voice, get_voice, list_voices, resolve_lang_code

__all__ = ["Voice", "get_voice", "list_voices", "resolve_lang_code"]

