#!/usr/bin/env bats

# Shim assertions (works with or without bats-assert)
assert_success() { [[ "$status" -eq 0 ]] || return 1; }
assert_failure() { [[ "$status" -ne 0 ]] || return 1; }
assert_output()  { [[ "$output" == *"$1"* ]] || return 1; }

setup() {
  TEST_DIR=$(mktemp -d)
  export SKILLS_DIR="$TEST_DIR/.ai/skills"
  export SCRIPT_DIR="$TEST_DIR/scripts"
  mkdir -p "$SKILLS_DIR" "$SCRIPT_DIR"
  cp docs/superpowers/skills-install.sh "$SCRIPT_DIR/skills-install.sh"
  cp docs/superpowers/skills-discover.sh "$SCRIPT_DIR/skills-discover.sh"
  chmod +x "$SCRIPT_DIR/skills-install.sh"
}

teardown() {
  rm -rf "$TEST_DIR"
}

# ── Arg validation tests ───────────────────────────────────────────────────────

@test "exits 1 with usage when called with no args" {
  run "$SCRIPT_DIR/skills-install.sh"
  assert_failure
  assert_output "Usage:"
}

@test "exits 1 when called with only 1 arg" {
  run "$SCRIPT_DIR/skills-install.sh" "https://github.com/org/repo.git"
  assert_failure
}

# ── Skip-already-installed test ───────────────────────────────────────────────

@test "exits 0 with SKIP when skill already exists" {
  mkdir -p "$SKILLS_DIR/existing-skill"
  printf 'name: existing-skill\n' > "$SKILLS_DIR/existing-skill/skill.yaml"

  run "$SCRIPT_DIR/skills-install.sh" \
    "https://github.com/org/fake.git" "existing-skill"

  assert_success
  assert_output "SKIP"
  assert_output "already exists"
}

# ── Rollback test ──────────────────────────────────────────────────────────────

@test "rolls back and exits 1 when skill.yaml missing after clone" {
  # Create a bare git repo with no skill.yaml
  FAKE_REPO=$(mktemp -d)
  git -C "$FAKE_REPO" init --quiet
  printf 'not a skill\n' > "$FAKE_REPO/README.md"
  git -C "$FAKE_REPO" add .
  git -C "$FAKE_REPO" commit -m "init" --quiet

  run "$SCRIPT_DIR/skills-install.sh" "$FAKE_REPO" "bad-skill"

  assert_failure
  assert_output "skill.yaml not found"
  assert_output "Rolling back"
  # Directory must be removed
  [[ ! -d "$SKILLS_DIR/bad-skill" ]]
}

# ── Valid install test ────────────────────────────────────────────────────────

@test "installs valid skill and runs discover" {
  # Create a valid git repo with skill.yaml
  FAKE_REPO=$(mktemp -d)
  git -C "$FAKE_REPO" init --quiet
  printf 'name: good-skill\n' > "$FAKE_REPO/skill.yaml"
  git -C "$FAKE_REPO" add .
  git -C "$FAKE_REPO" commit -m "init" --quiet

  # Stub skills-discover.sh to avoid real execution
  printf 'echo stub\n' > "$SCRIPT_DIR/skills-discover.sh"

  run "$SCRIPT_DIR/skills-install.sh" "$FAKE_REPO" "good-skill"

  assert_success
  assert_output "Installed"
  [[ -f "$SKILLS_DIR/good-skill/skill.yaml" ]]
}
