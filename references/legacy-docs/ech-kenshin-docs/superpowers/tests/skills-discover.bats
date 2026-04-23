#!/usr/bin/env bats

# Minimal assertion shims — plain bash, no external dependencies
assert_success() { [[ "$status" -eq 0 ]] || return 1; }
assert_failure() { [[ "$status" -ne 0 ]] || return 1; }
assert_output()  { [[ "$output" == *"$1"* ]] || return 1; }
refute_output()  { [[ "$output" != *"$1"* ]] || return 1; }

# Python-based JSON query — stdlib only
# Supports: .key, [n], .key[n], .key1.key2[n], | length
# The shim is recreated on every call so updates to the script are always reflected.
_jq() {
  JQ_SHIM=$(mktemp)
  cat > "$JQ_SHIM" <<'PYEOF'
#!/usr/bin/env python3
import json, sys

path = sys.argv[2]
filter_expr = sys.argv[1]

with open(path) as f:
    data = json.load(f)

pipe_idx = filter_expr.find(' | length')
use_len = pipe_idx != -1
if use_len:
    filter_expr = filter_expr[:pipe_idx]

val = data
i = 0
while i < len(filter_expr):
    ch = filter_expr[i]
    if ch == '.':
        i += 1
        if i >= len(filter_expr):
            break
        j = i
        while j < len(filter_expr) and filter_expr[j] not in '.[':
            j += 1
        key = filter_expr[i:j]
        i = j
        if isinstance(val, list) and key:
            val = val[0] if val else None
        if isinstance(val, dict):
            val = val.get(key, None)
        elif key:
            val = None
    elif ch == '[':
        j = filter_expr.find(']', i)
        idx = int(filter_expr[i+1:j])
        val = val[idx] if val is not None else None
        i = j + 1
    else:
        j = i
        while j < len(filter_expr) and filter_expr[j] not in '.[':
            j += 1
        key = filter_expr[i:j]
        i = j
        if isinstance(val, list) and key:
            val = val[0] if val else None
        if isinstance(val, dict):
            val = val.get(key, None)
        elif key:
            val = None
    if val is None:
        break

if use_len:
    if val is None:
        print(0)
    elif isinstance(val, (list, dict, str)):
        print(len(val))
    else:
        print(len(val))
elif val is None:
    sys.exit(1)
elif isinstance(val, bool):
    print('true' if val else 'false')
elif isinstance(val, (int, float)):
    print(val)
elif isinstance(val, str):
    sys.stdout.write(val)
else:
    print(repr(val))
PYEOF
  python3 "$JQ_SHIM" "$1" "$2"
  rm -f "$JQ_SHIM"
}
jq_val()   { _jq "$1" "$2"; }
jq_bool()  { _jq "$1" "$2"; }
jq_int()   { _jq "$1" "$2"; }
jq_str()   { _jq "$1" "$2"; }
jq_len()   { _jq "${1} | length" "$2"; }
jq_exists(){ _jq "$1" "$2" 2>/dev/null; }
jq_valid() { python3 -c "import json; json.load(open('$1'))" && return 0 || return 1; }

setup() {
  TEST_DIR=$(mktemp -d)
  export SKILLS_DIR="$TEST_DIR/.ai/skills"
  export REGISTRY="$TEST_DIR/registry.json"
  mkdir -p "$SKILLS_DIR"
}

teardown() {
  rm -rf "$TEST_DIR"
}

# ── Hybrid skill tests ────────────────────────────────────────────────────────

@test "detects hybrid skill (folder + skill.yaml)" {
  mkdir -p "$SKILLS_DIR/my-skill"
  cat > "$SKILLS_DIR/my-skill/skill.yaml" <<'YAML'
name: my-skill
triggers:
  - "/my-skill"
description: Test skill
uses: []
YAML

  run bash docs/superpowers/skills-discover.sh

  assert_success
  assert_output "[found] hybrid: my-skill"
  result=$(jq_bool '.skills[0].hasAutomation' "$REGISTRY")
  [[ "$result" == "true" ]]
}

@test "reads triggers list from skill.yaml" {
  mkdir -p "$SKILLS_DIR/my-skill"
  cat > "$SKILLS_DIR/my-skill/skill.yaml" <<'YAML'
name: my-skill
triggers:
  - "/my-skill"
  - "do my skill"
description: Test
uses: []
YAML

  run bash docs/superpowers/skills-discover.sh

  count=$(jq_int '.skills[0].triggers | length' "$REGISTRY")
  [[ "$count" -eq 2 ]]
  # Check via JSON file (avoids heredoc quirks in bats output capture)
  first=$(jq_str '.skills[0].triggers[0]' "$REGISTRY")
  [[ "$first" == "/my-skill" ]]
}

@test "reads uses list from skill.yaml" {
  mkdir -p "$SKILLS_DIR/my-skill"
  cat > "$SKILLS_DIR/my-skill/skill.yaml" <<'YAML'
name: my-skill
triggers: []
description: Test
uses:
  - other-skill
YAML

  run bash docs/superpowers/skills-discover.sh

  # Python outputs raw strings (no jq quotes); compare unquoted
  val=$(jq_val '.skills[0].uses[0]' "$REGISTRY")
  [[ "$val" == "other-skill" ]]
}

@test "reads block scalar description (description: >)" {
  mkdir -p "$SKILLS_DIR/my-skill"
  cat > "$SKILLS_DIR/my-skill/skill.yaml" <<'YAML'
name: my-skill
triggers: []
description: >
  This is a multi-line
  description text.
uses: []
YAML

  run bash docs/superpowers/skills-discover.sh

  desc=$(jq_str '.skills[0].description' "$REGISTRY")
  [[ "$desc" == *"multi-line"* ]]
  [[ "$desc" == *"description text." ]]
}

@test "handles empty uses list" {
  mkdir -p "$SKILLS_DIR/my-skill"
  cat > "$SKILLS_DIR/my-skill/skill.yaml" <<'YAML'
name: my-skill
triggers: []
description: Test
uses: []
YAML

  run bash docs/superpowers/skills-discover.sh

  count=$(jq_len '.skills[0].uses' "$REGISTRY")
  [[ "$count" -eq 0 ]]
}

# ── Markdown skill tests ───────────────────────────────────────────────────────

@test "detects markdown-only skill" {
  printf '# My Markdown Skill\n' > "$SKILLS_DIR/markdown-skill.md"

  run bash docs/superpowers/skills-discover.sh

  assert_output "[found] markdown: markdown-skill"
  result=$(jq_bool '.skills[0].hasAutomation' "$REGISTRY")
  [[ "$result" == "false" ]]
}

@test "skips _index.md" {
  printf '# Index\n' > "$SKILLS_DIR/_index.md"

  run bash docs/superpowers/skills-discover.sh

  refute_output "_index"
}

# ── Mixed / edge case tests ───────────────────────────────────────────────────

@test "registers both hybrid and markdown skills in one run" {
  mkdir -p "$SKILLS_DIR/hybrid-skill"
  cat > "$SKILLS_DIR/hybrid-skill/skill.yaml" <<'YAML'
name: hybrid-skill
triggers: []
description: Hybrid
uses: []
YAML
  printf '# Markdown Skill\n' > "$SKILLS_DIR/markdown-skill.md"

  run bash docs/superpowers/skills-discover.sh

  assert_output "[found] hybrid: hybrid-skill"
  assert_output "[found] markdown: markdown-skill"
  count=$(jq_int '.skills | length' "$REGISTRY")
  [[ "$count" -eq 2 ]]
}

@test "writes valid JSON registry" {
  run bash docs/superpowers/skills-discover.sh

  jq_valid "$REGISTRY"
  jq_exists '.generated' "$REGISTRY"
  jq_exists '.skills' "$REGISTRY"
}
