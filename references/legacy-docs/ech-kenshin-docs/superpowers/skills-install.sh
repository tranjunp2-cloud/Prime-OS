#!/bin/bash
# docs/superpowers/skills-install.sh
# Usage: docs/superpowers/skills-install.sh <git-url> <skill-name>
# Example: docs/superpowers/skills-install.sh https://github.com/org/skill-xyz.git skill-xyz

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-"$(cd "$SCRIPT_DIR/../.." && pwd)"}"
SKILLS_DIR="${SKILLS_DIR:-"$PROJECT_ROOT/.ai/skills"}"

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <git-url> <skill-name>"
  echo "Example: $0 https://github.com/org/skill-xyz.git skill-xyz"
  exit 1
fi

GIT_URL="$1"
SKILL_NAME="$2"
TARGET_DIR="$SKILLS_DIR/$SKILL_NAME"

if [[ -d "$TARGET_DIR" ]]; then
  echo "[skills-install] SKIP: .ai/skills/$SKILL_NAME already exists."
  echo "  To reinstall, remove it first: rm -rf .ai/skills/$SKILL_NAME"
  exit 0
fi

echo "[skills-install] Cloning $GIT_URL into .ai/skills/$SKILL_NAME..."
git clone --depth 1 "$GIT_URL" "$TARGET_DIR"

if [[ ! -f "$TARGET_DIR/skill.yaml" ]]; then
  echo "[skills-install] ERROR: skill.yaml not found in $TARGET_DIR after clone."
  echo "  Rolling back..."
  rm -rf "$TARGET_DIR"
  exit 1
fi

echo "[skills-install] Verifying skill.yaml..."
INSTALLED_NAME=$(grep '^name:' "$TARGET_DIR/skill.yaml" | sed 's/^name: *//')
if [[ "$INSTALLED_NAME" != "$SKILL_NAME" ]]; then
  echo "[skills-install] WARN: skill.yaml name '$INSTALLED_NAME' differs from folder '$SKILL_NAME'. Continuing anyway."
fi

echo "[skills-install] Running skills-discover.sh to update registry..."
"$SCRIPT_DIR/skills-discover.sh"

echo "[skills-install] Done. Installed '$INSTALLED_NAME' to .ai/skills/$SKILL_NAME."
