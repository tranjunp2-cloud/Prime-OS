# PrimeOS Kokoro TTS

Reusable local voice generation for PrimeOS and future demo projects, powered by [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M).

## What this uses

- `kokoro==0.9.4` for local inference and automatic model/voice downloads.
- Python `3.12` because the current Kokoro package requires Python `>=3.10,<3.14`.
- `espeak-ng` for the English fallback path used by Kokoro/Misaki.
- `ffmpeg` for optional `mp3`, `m4a`, and `aac` exports used by video workflows.
- Apple Silicon MPS automatically when available; CPU remains the fallback.

The Kokoro model page identifies the model and weights as Apache-2.0 licensed. Review the model card and voice notes before shipping commercial content.

## First-time setup on this Mac

```bash
cd /Users/thanhnguyenxuan/Documents/MyProject/PrimeOS/Kokoro
./scripts/setup-macos.sh
uv run kokoro-tts doctor
```

The first generation downloads the model and selected voice files from Hugging Face. They are cached locally; they are not committed to this repository.

## Generate narration

```bash
# Markdown file -> WAV
uv run kokoro-tts generate examples/primeos-demo.md output/primeos-demo.wav --voice af_heart

# Markdown file -> AAC inside an M4A container for video editing
uv run kokoro-tts generate script.md output/narration.m4a --voice af_bella --speed 0.98

# Inline text -> MP3
uv run kokoro-tts generate "PrimeOS is ready for the next operation." output/short.mp3 --voice am_michael

# Exact user-requested direct-script form
uv run python generate.py script.md output/narration.wav --voice af_heart

# Equivalent namespaced entrypoint
uv run python tools/tts/generate.py script.md output/narration.wav --voice af_heart
```

Supported output formats: `wav`, `flac`, `ogg`, `mp3`, `m4a`, and `aac`.

## Voices

```bash
uv run kokoro-tts voices
uv run kokoro-tts voices --lang en
```

Recommended starting voices for English demos:

- `af_heart` — default American English voice.
- `af_bella` — American English alternative.
- `bf_emma` — British English alternative.
- `am_michael` — American English male alternative.

Kokoro's official catalog currently covers American/British English, Japanese, Mandarin Chinese, Spanish, French, Hindi, Italian, and Brazilian Portuguese. It does not provide an official Vietnamese voice, so Vietnamese scripts should not be silently routed to an English voice.

Japanese and Mandarin need their language-specific Misaki extras:

```bash
uv sync --extra japanese
uv sync --extra mandarin
```

## Project layout

```text
Kokoro/
├── src/primeos_tts/       # Engine, Markdown cleanup, audio export, CLI
├── tools/tts/              # Direct Python entrypoints requested for future work
├── examples/               # Small smoke-test scripts
├── tests/                  # Fast tests that do not download the model
├── scripts/setup-macos.sh  # Homebrew + uv bootstrap
├── Brewfile                # espeak-ng and ffmpeg
└── pyproject.toml          # Reproducible Python 3.12 environment
```

## Useful maintenance commands

```bash
make voices
make doctor
make test
make lint
```

Model cache can be relocated when needed:

```bash
uv run kokoro-tts generate script.md output/narration.wav \
  --cache-dir "$HOME/Library/Caches/primeos-kokoro" \
  --voice af_heart
```
