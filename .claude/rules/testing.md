# Testing

## Test Pyramid
1. **Static analysis** (type-check + truth file) — compile-time correctness
2. **Unit tests** (mocked dependencies) — logic correctness
3. **Smoke test** (real runtime) — runtime correctness

Mocks verify our code's logic. They cannot catch SDK runtime validation — that's the smoke test's job.

## Constraints
- Do not mark a task complete if new logic functions lack unit tests
- Do not skip or disable tests to unblock a commit
- Do not treat a passing type-check as proof of runtime correctness
