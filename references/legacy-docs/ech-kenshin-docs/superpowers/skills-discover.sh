#!/bin/bash
# docs/superpowers/skills-discover.sh
# Scans .ai/skills/ for hybrid skills (folder + skill.yaml) and markdown-only skills,
# then writes docs/superpowers/registry.json.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-"$(cd "$SCRIPT_DIR/../.." && pwd)"}"
SKILLS_DIR="${SKILLS_DIR:-"$PROJECT_ROOT/.ai/skills"}"
REGISTRY="${REGISTRY:-"$SCRIPT_DIR/registry.json"}"

echo "[skills-discover] Scanning $SKILLS_DIR..."

python3 - "$SCRIPT_DIR" "$PROJECT_ROOT" "$SKILLS_DIR" "$REGISTRY" <<'PYEOF'
import json
import os
import re
import sys
from datetime import datetime, timezone

# Script paths are passed as arguments to avoid __file__ resolution issues in here-doc context
script_dir   = sys.argv[1]
project_root = sys.argv[2]
skills_dir   = sys.argv[3]
registry     = sys.argv[4]

# ── Helpers ───────────────────────────────────────────────────────────────────
def _yaml_field(raw: str, key: str) -> str:
    """Return the value of a top-level YAML 'key: value' field (strip quotes)."""
    pattern = re.compile(r"^" + re.escape(key) + r":\s*(.*)$", re.MULTILINE)
    m = pattern.search(raw)
    if not m:
        return ""
    return m.group(1).strip().strip("\"'")


def _yaml_field_after(raw: str, key: str) -> str:
    """Return continuation line(s) after a multiline YAML 'key:' field (indented).
    Handles both block scalars (description: > / |) and inline continuations."""
    # Block scalar: key: >\n  line1\n  line2   OR  key: |\n  line1\n  line2
    pattern = re.compile(r"^" + re.escape(key) + r":\s*[>|]?\n((?:[ ]{2,4}.+\n?)+)", re.MULTILINE)
    m = pattern.search(raw)
    if not m:
        return _yaml_field(raw, key)  # fallback: single-line value
    lines = [ln.strip() for ln in m.group(1).splitlines() if ln.strip()]
    return " ".join(ln.strip("\"'") for ln in lines)


def _yaml_list(raw: str, key: str, max_lines: int) -> list[str]:
    """Return a list of values under a YAML 'key:' list field."""
    # Use + (unbounded) instead of {N} — {N} fails when the inner non-capturing
    # group's + makes the outer quantifier ambiguous. Capture with group(0).
    body = r"(?:[ ]{2,4}-\s+.+\n?)+"
    pattern = re.compile(r"^" + re.escape(key) + r":\s*\n" + body, re.MULTILINE)
    m = pattern.search(raw)
    if not m:
        return []
    results = []
    for ln in m.group(0).splitlines():
        ln = ln.strip()
        if ln.startswith("- "):
            results.append(ln[2:].strip().strip("\"'"))
    return results[:max_lines]


# ── Scan .ai/skills/ ──────────────────────────────────────────────────────────
skills = []

for entry in os.scandir(skills_dir):
    if entry.is_dir():
        # Hybrid skill: directory + skill.yaml
        skill_name = entry.name
        skill_yaml = os.path.join(entry.path, "skill.yaml")

        if os.path.isfile(skill_yaml):
            with open(skill_yaml) as f:
                raw = f.read()

            name     = _yaml_field(raw, "name")
            triggers = _yaml_list(raw, "triggers", 20)
            desc     = _yaml_field_after(raw, "description")
            uses     = _yaml_list(raw, "uses", 10)

            skills.append({
                "name":          name,
                "path":          f".ai/skills/{skill_name}",
                "triggers":      triggers,
                "description":   desc,
                "hasAutomation": True,
                "uses":          uses,
            })
            print(f"  [found] hybrid: {name}")

    elif entry.is_file() and entry.name.endswith(".md"):
        # Markdown-only skill: top-level .ai/skills/*.md
        if entry.name == "_index.md":
            continue
        skill_name = entry.name[:-3]  # strip .md
        skills.append({
            "name":          skill_name,
            "path":          f".ai/skills/{entry.name}",
            "hasAutomation": False,
        })
        print(f"  [found] markdown: {skill_name}")

# ── Write registry ─────────────────────────────────────────────────────────────
timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
output = {
    "generated": timestamp,
    "skills":    skills,
}

with open(registry, "w") as f:
    json.dump(output, f, indent=2)

print(f"[skills-discover] Wrote {registry} with {len(skills)} skills.")
PYEOF
