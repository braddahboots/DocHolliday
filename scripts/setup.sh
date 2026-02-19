#!/usr/bin/env bash
#
# setup.sh — Copy the claude-agentic-template infrastructure into a target project.
#
# Copies only the files that belong in a project:
#   .claude/  CLAUDE.md  CODEBASE_OVERVIEW.md  ROADMAP.md  scripts/
#
# Does NOT copy reference-only material:
#   examples/  templates/  README.md
#
# Usage:
#   bash scripts/setup.sh /path/to/your/project
#   bash scripts/setup.sh .   # current directory (if run from outside the template)

set -euo pipefail

TEMPLATE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_DIR="${1:-}"

if [ -z "$TARGET_DIR" ]; then
  echo "Usage: bash scripts/setup.sh /path/to/your/project"
  echo ""
  echo "Copies .claude/, CLAUDE.md, CODEBASE_OVERVIEW.md, ROADMAP.md, and scripts/"
  echo "into the target project directory."
  exit 1
fi

# Resolve to absolute path
TARGET_DIR="$(cd "$TARGET_DIR" 2>/dev/null && pwd || echo "$TARGET_DIR")"

if [ "$TEMPLATE_DIR" = "$TARGET_DIR" ]; then
  echo "Error: Target directory is the same as the template directory."
  echo "Please specify a different project directory."
  exit 1
fi

if [ ! -d "$TARGET_DIR" ]; then
  echo "Error: Target directory does not exist: $TARGET_DIR"
  exit 1
fi

echo "Copying claude-agentic-template to: $TARGET_DIR"
echo ""

# Copy .claude/ directory
if [ -d "$TARGET_DIR/.claude" ]; then
  echo "Warning: $TARGET_DIR/.claude/ already exists. Merging (existing files will be overwritten)."
fi
cp -r "$TEMPLATE_DIR/.claude" "$TARGET_DIR/"
echo "  Copied .claude/"

# Copy root files
for file in CLAUDE.md CODEBASE_OVERVIEW.md ROADMAP.md; do
  if [ -f "$TARGET_DIR/$file" ]; then
    echo "  Warning: $TARGET_DIR/$file already exists — overwriting."
  fi
  cp "$TEMPLATE_DIR/$file" "$TARGET_DIR/"
  echo "  Copied $file"
done

# Copy scripts/ directory
if [ -d "$TARGET_DIR/scripts" ]; then
  echo "  Warning: $TARGET_DIR/scripts/ already exists. Merging (existing files will be overwritten)."
fi
cp -r "$TEMPLATE_DIR/scripts" "$TARGET_DIR/"
echo "  Copied scripts/"

echo ""
echo "Done. Next steps:"
echo "  1. cd $TARGET_DIR"
echo "  2. Write your PRD as PRD.md"
echo "  3. Run Claude Code and invoke /bootstrap"
echo ""
echo "Files NOT copied (reference only — stay in the template repo):"
echo "  examples/   — Sample PRDs for format reference"
echo "  templates/  — Bootstrap scaffolding (consumed internally)"
echo "  README.md   — Template documentation"
