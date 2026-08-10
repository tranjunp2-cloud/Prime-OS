#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This bootstrap is intended for macOS." >&2
  exit 1
fi

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required: https://brew.sh" >&2
  exit 1
fi

brew bundle --file=Brewfile
uv sync --group dev

echo
echo "Kokoro TTS is ready. Run:"
echo "  uv run kokoro-tts doctor"
echo "  uv run kokoro-tts voices"
echo "  uv run kokoro-tts generate examples/primeos-demo.md output/primeos-demo.wav --voice af_heart"
