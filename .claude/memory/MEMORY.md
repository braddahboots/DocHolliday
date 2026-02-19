# Project Memory — Cross-Session Learnings

> First 200 lines are auto-loaded into every session.
> Structure: Gotchas → Lessons → Protocols
> When a lesson is confirmed across multiple sessions, promote it to a rule or hook.

---

## SDK/Framework Gotchas
> Add verified SDK-specific pitfalls here. Include version numbers.

<!-- Example format:
- [SDK v1.2.3] `SomeClass.method()` returns Promise, not direct value
- [SDK v1.2.3] NO `FakeClass` exists — use `RealClass` instead
-->

---

## Infrastructure Lessons

- Never trust AI self-verification — demand file path + line number evidence
- Memory alone doesn't change behavior — escalate to rules, then hooks
- Three-layer enforcement: memory (learning) → rules (instruction) → hooks (guarantee)
- Delete fabricated code, don't warn — leaving wrong code with comments doesn't work
- The compiler is the final arbiter — if it says something doesn't exist, it doesn't exist
- Separation of concerns for agents — reviewer reports, implementer fixes, devops commits

---

## Verification Protocols

- Before using any SDK API: truth file → docs → ask user (never guess)
- After every edit: hooks automatically check imports + run type-checker
- Before every commit: run /validate to catch issues early
- Evidence requirement: every API call must have traceable verification source

---

## Project-Specific Notes
> Added during development as patterns emerge

