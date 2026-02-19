#!/bin/bash
# Stop hook: Post-session hygiene checks

FEEDBACK=""

# Check for uncommitted changes in source files
# Configure extensions for your project
SOURCE_EXTENSIONS="ts tsx js jsx py rs go java kt swift"

UNCOMMITTED=$(git diff --name-only 2>/dev/null)
if [ -n "$UNCOMMITTED" ]; then
  SOURCE_CHANGES=""
  for ext in $SOURCE_EXTENSIONS; do
    MATCHES=$(echo "$UNCOMMITTED" | grep "\.$ext$")
    if [ -n "$MATCHES" ]; then
      SOURCE_CHANGES="$SOURCE_CHANGES$MATCHES\n"
    fi
  done

  if [ -n "$SOURCE_CHANGES" ]; then
    FEEDBACK="UNCOMMITTED SOURCE CHANGES:\n$SOURCE_CHANGES\nConsider using /commit before ending the session."
  fi
fi

# Check if CODEBASE_OVERVIEW.md needs updating
STAGED=$(git diff --cached --name-only 2>/dev/null)
OVERVIEW_UPDATED=$(echo "$STAGED" | grep "CODEBASE_OVERVIEW.md")
NEW_FILES=$(echo "$STAGED" | grep -v "CODEBASE_OVERVIEW.md" | head -5)

if [ -n "$NEW_FILES" ] && [ -z "$OVERVIEW_UPDATED" ]; then
  FEEDBACK="$FEEDBACK\n\nNew/modified files detected but CODEBASE_OVERVIEW.md wasn't updated. Consider updating it."
fi

if [ -n "$FEEDBACK" ]; then
  echo -e "$FEEDBACK"
fi

exit 0
