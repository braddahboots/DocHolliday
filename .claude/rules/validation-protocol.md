---
description: How to verify SDK/framework facts before using them in code
globs: "**/*"
---

# Validation Protocol

Before using any SDK or framework API in code, follow this verification sequence:

## Step 1: Check Truth File
- Read the project's truth file (location specified in CLAUDE.md)
- Search for the class, method, or type you intend to use
- If found: note the file path and line number as evidence
- If not found: proceed to Step 2

## Step 2: Check Official Documentation
- Use MCP tools if available, or WebFetch to check official docs
- Look for the specific API, not just a related page
- If found: note the URL as evidence
- If not found: proceed to Step 3

## Step 3: Ask the User
- Clearly state: "I want to use [API name] but cannot verify it exists in the truth file or official docs. Should I proceed?"
- **Never guess or assume an API exists**

## Evidence Requirement
Every SDK/framework API call in your code should have traceable evidence of existence. When asked, you must be able to cite:
- Truth file: line number
- Documentation: URL
- User confirmation: "User confirmed in this session"

## Post-Edit Verification
After every file edit, hooks will automatically:
1. Check imports against the truth file (warning on unknown imports)
2. Run the type-checker/compiler (blocking on errors)

These hooks run automatically — you don't need to trigger them. But if they report issues, fix them immediately before proceeding.
