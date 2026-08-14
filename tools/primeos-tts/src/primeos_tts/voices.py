"""The official Kokoro-82M voice catalog and language helpers."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Voice:
    """Metadata for a Kokoro voice."""

    name: str
    lang_code: str
    language: str
    accent: str
    traits: str


_VOICE_GROUPS: tuple[tuple[str, str, str, str, tuple[str, ...]], ...] = (
    ("a", "American English", "American", "English", (
        "af_heart", "af_alloy", "af_aoede", "af_bella", "af_jessica", "af_kore",
        "af_nicole", "af_nova", "af_river", "af_sarah", "af_sky", "am_adam",
        "am_echo", "am_eric", "am_fenrir", "am_liam", "am_michael", "am_onyx",
        "am_puck", "am_santa",
    )),
    ("b", "British English", "British", "English", (
        "bf_alice", "bf_emma", "bf_isabella", "bf_lily", "bm_daniel", "bm_fable",
        "bm_george", "bm_lewis",
    )),
    ("j", "Japanese", "Japanese", "Japanese", (
        "jf_alpha", "jf_gongitsune", "jf_nezumi", "jf_tebukuro", "jm_kumo",
    )),
    ("z", "Mandarin Chinese", "Mandarin", "Chinese", (
        "zf_xiaobei", "zf_xiaoni", "zf_xiaoxiao", "zf_xiaoyi", "zm_yunjian",
        "zm_yunxi", "zm_yunxia", "zm_yunyang",
    )),
    ("e", "Spanish", "Spanish", "Spanish", ("ef_dora", "em_alex", "em_santa")),
    ("f", "French", "French", "French", ("ff_siwis",)),
    ("h", "Hindi", "Hindi", "Hindi", ("hf_alpha", "hf_beta", "hm_omega", "hm_psi")),
    ("i", "Italian", "Italian", "Italian", ("if_sara", "im_nicola")),
    ("p", "Brazilian Portuguese", "Brazilian Portuguese", "Portuguese", (
        "pf_dora", "pm_alex", "pm_santa",
    )),
)

LANGUAGE_ALIASES = {
    "en": "a",
    "en-us": "a",
    "en-gb": "b",
    "es": "e",
    "fr": "f",
    "fr-fr": "f",
    "hi": "h",
    "it": "i",
    "ja": "j",
    "pt": "p",
    "pt-br": "p",
    "zh": "z",
}

_VOICES: dict[str, Voice] = {}
for lang_code, language, accent, traits, names in _VOICE_GROUPS:
    for name in names:
        _VOICES[name] = Voice(name, lang_code, language, accent, traits)


def get_voice(name: str) -> Voice:
    """Return a voice or raise a useful error with the available choices."""

    normalized = name.strip().lower()
    try:
        return _VOICES[normalized]
    except KeyError as error:
        available = ", ".join(sorted(_VOICES))
        raise ValueError(f"Unknown voice {name!r}. Available voices: {available}") from error


def resolve_lang_code(value: str | None, voice: str) -> str:
    """Resolve a Kokoro language code from an explicit value or voice."""

    if value:
        normalized = value.strip().lower()
        return LANGUAGE_ALIASES.get(normalized, normalized)
    return get_voice(voice).lang_code


def list_voices(lang_code: str | None = None) -> tuple[Voice, ...]:
    """Return voices, optionally filtered by a Kokoro language code or alias."""

    normalized = None
    if lang_code:
        normalized = LANGUAGE_ALIASES.get(lang_code.strip().lower(), lang_code.strip().lower())
    voices = tuple(_VOICES.values())
    if normalized:
        voices = tuple(voice for voice in voices if voice.lang_code == normalized)
    return tuple(sorted(voices, key=lambda voice: (voice.lang_code, voice.name)))

