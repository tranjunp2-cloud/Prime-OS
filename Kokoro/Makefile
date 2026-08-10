SHELL := /bin/zsh

.PHONY: setup sync doctor voices test lint demo

setup:
	./scripts/setup-macos.sh

sync:
	uv sync --group dev

doctor:
	uv run kokoro-tts doctor

voices:
	uv run kokoro-tts voices

test:
	uv run pytest

lint:
	uv run ruff check .

demo:
	uv run kokoro-tts generate examples/primeos-demo.md output/primeos-demo.wav --voice af_heart
