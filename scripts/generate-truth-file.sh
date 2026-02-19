#!/bin/bash
# Generic truth file generator
# Adapts to different type definition formats

set -e

usage() {
  echo "Usage: $0 <type-definition-file> <output-file> [--format ts|python|rust]"
  echo ""
  echo "Generates a truth file from type definitions."
  echo "The truth file lists every exported class, method, enum, interface, and type."
  echo ""
  echo "Examples:"
  echo "  $0 node_modules/my-sdk/dist/index.d.ts sdk-truth.md --format ts"
  echo "  $0 venv/lib/my-sdk/py.typed sdk-truth.md --format python"
  exit 1
}

if [ $# -lt 2 ]; then
  usage
fi

INPUT="$1"
OUTPUT="$2"
FORMAT="${4:-ts}"

if [ ! -f "$INPUT" ]; then
  echo "Error: Input file '$INPUT' not found"
  exit 1
fi

echo "# SDK Truth File" > "$OUTPUT"
echo "" >> "$OUTPUT"
echo "> Auto-generated from \`$INPUT\` on $(date)" >> "$OUTPUT"
echo "> DO NOT EDIT MANUALLY — regenerate with \`$0 $INPUT $OUTPUT\`" >> "$OUTPUT"
echo "" >> "$OUTPUT"

case "$FORMAT" in
  ts)
    echo "## Exported Classes" >> "$OUTPUT"
    grep -n "^export declare class\|^export class" "$INPUT" 2>/dev/null | while read -r line; do
      echo "- Line $(echo "$line" | cut -d: -f1): $(echo "$line" | cut -d: -f2-)" >> "$OUTPUT"
    done
    echo "" >> "$OUTPUT"

    echo "## Exported Interfaces" >> "$OUTPUT"
    grep -n "^export declare interface\|^export interface" "$INPUT" 2>/dev/null | while read -r line; do
      echo "- Line $(echo "$line" | cut -d: -f1): $(echo "$line" | cut -d: -f2-)" >> "$OUTPUT"
    done
    echo "" >> "$OUTPUT"

    echo "## Exported Types" >> "$OUTPUT"
    grep -n "^export declare type\|^export type" "$INPUT" 2>/dev/null | while read -r line; do
      echo "- Line $(echo "$line" | cut -d: -f1): $(echo "$line" | cut -d: -f2-)" >> "$OUTPUT"
    done
    echo "" >> "$OUTPUT"

    echo "## Exported Enums" >> "$OUTPUT"
    grep -n "^export declare enum\|^export enum" "$INPUT" 2>/dev/null | while read -r line; do
      echo "- Line $(echo "$line" | cut -d: -f1): $(echo "$line" | cut -d: -f2-)" >> "$OUTPUT"
    done
    echo "" >> "$OUTPUT"

    echo "## Exported Functions" >> "$OUTPUT"
    grep -n "^export declare function\|^export function" "$INPUT" 2>/dev/null | while read -r line; do
      echo "- Line $(echo "$line" | cut -d: -f1): $(echo "$line" | cut -d: -f2-)" >> "$OUTPUT"
    done
    ;;
  python)
    echo "## Classes" >> "$OUTPUT"
    grep -n "^class " "$INPUT" 2>/dev/null | while read -r line; do
      echo "- Line $(echo "$line" | cut -d: -f1): $(echo "$line" | cut -d: -f2-)" >> "$OUTPUT"
    done
    echo "" >> "$OUTPUT"

    echo "## Functions" >> "$OUTPUT"
    grep -n "^def \|^async def " "$INPUT" 2>/dev/null | while read -r line; do
      echo "- Line $(echo "$line" | cut -d: -f1): $(echo "$line" | cut -d: -f2-)" >> "$OUTPUT"
    done
    ;;
  rust)
    echo "## Structs" >> "$OUTPUT"
    grep -n "^pub struct " "$INPUT" 2>/dev/null | while read -r line; do
      echo "- Line $(echo "$line" | cut -d: -f1): $(echo "$line" | cut -d: -f2-)" >> "$OUTPUT"
    done
    echo "" >> "$OUTPUT"

    echo "## Enums" >> "$OUTPUT"
    grep -n "^pub enum " "$INPUT" 2>/dev/null | while read -r line; do
      echo "- Line $(echo "$line" | cut -d: -f1): $(echo "$line" | cut -d: -f2-)" >> "$OUTPUT"
    done
    echo "" >> "$OUTPUT"

    echo "## Traits" >> "$OUTPUT"
    grep -n "^pub trait " "$INPUT" 2>/dev/null | while read -r line; do
      echo "- Line $(echo "$line" | cut -d: -f1): $(echo "$line" | cut -d: -f2-)" >> "$OUTPUT"
    done
    echo "" >> "$OUTPUT"

    echo "## Functions" >> "$OUTPUT"
    grep -n "^pub fn \|^pub async fn " "$INPUT" 2>/dev/null | while read -r line; do
      echo "- Line $(echo "$line" | cut -d: -f1): $(echo "$line" | cut -d: -f2-)" >> "$OUTPUT"
    done
    ;;
  *)
    echo "Error: Unknown format '$FORMAT'. Supported: ts, python, rust"
    exit 1
    ;;
esac

echo "" >> "$OUTPUT"
echo "---" >> "$OUTPUT"
echo "Total entries: $(wc -l < "$OUTPUT")" >> "$OUTPUT"

echo "Truth file generated at $OUTPUT"
