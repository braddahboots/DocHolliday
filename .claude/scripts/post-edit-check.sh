#!/bin/bash
# PostToolUse hook: Verify edits
# Runs after every file write/edit
# Configure the FILE_EXTENSION, BUILD_CMD, and TRUTH_FILE for your project

# Verify jq is available (required for JSON parsing)
if ! command -v jq &> /dev/null; then
  echo "WARNING: jq is not installed. Hook scripts require jq to parse tool input. Install with: brew install jq (macOS), apt install jq (Linux), choco install jq (Windows)"
  exit 0
fi

# Read tool input from stdin
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# ============================================
# CONFIGURATION (set by bootstrap)
# ============================================
FILE_EXTENSIONS=(".ts" ".tsx")  # Extensions to check
BUILD_CMD="npx tsc --noEmit"    # Type-check / compile command
TRUTH_FILE=""                    # Path to truth file (empty = skip truth check)
IMPORT_PATTERN=""                # Regex to extract imports — keep simple (e.g., "from 'sdk-name'" not complex lookbehinds). Must work with grep -oP.

# ============================================
# Check if file matches configured extensions
# ============================================
MATCH=false
for ext in "${FILE_EXTENSIONS[@]}"; do
  if [[ "$FILE_PATH" == *"$ext" ]]; then
    MATCH=true
    break
  fi
done

if [ "$MATCH" = false ]; then
  exit 0
fi

FEEDBACK=""

# ============================================
# Truth file cross-reference (if configured)
# ============================================
if [ -n "$TRUTH_FILE" ] && [ -f "$TRUTH_FILE" ] && [ -n "$IMPORT_PATTERN" ]; then
  # Extract imports matching the pattern
  IMPORTS=$(grep -oP "$IMPORT_PATTERN" "$FILE_PATH" 2>/dev/null | sort -u)

  if [ -n "$IMPORTS" ]; then
    UNKNOWN=""
    while IFS= read -r import; do
      if ! grep -q "$import" "$TRUTH_FILE"; then
        UNKNOWN="$UNKNOWN  - $import\n"
      fi
    done <<< "$IMPORTS"

    if [ -n "$UNKNOWN" ]; then
      FEEDBACK="WARNING: Unknown imports in $FILE_PATH:\n$UNKNOWN\nThese were not found in $TRUTH_FILE. Verify they exist before proceeding."
    fi
  fi
fi

# ============================================
# Type-check / compile (if configured)
# ============================================
if [ -n "$BUILD_CMD" ]; then
  BUILD_OUTPUT=$($BUILD_CMD 2>&1)
  BUILD_EXIT=$?

  if [ $BUILD_EXIT -ne 0 ]; then
    # Show first 20 lines of errors
    ERRORS=$(echo "$BUILD_OUTPUT" | head -20)
    FEEDBACK="$FEEDBACK\n\nBUILD CHECK FAILED:\n$ERRORS"
  fi
fi

if [ -n "$FEEDBACK" ]; then
  echo -e "$FEEDBACK"
fi

exit 0
