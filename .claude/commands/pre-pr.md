---
description: Run code-reviewer, linter, unit-tester, and e2e-tester in parallel against the current changes before opening a PR.
---

Launch all four project sub-agents **in parallel** (a single message, four `Agent` tool calls — do not run them one after another) against the current diff:

1. `code-reviewer` — reviews the diff for correctness/security/style issues, read-only.
2. `linter` — runs and fixes ESLint + `tsc --noEmit`.
3. `unit-tester` — adds/updates Vitest coverage for changed logic and runs it.
4. `e2e-tester` — adds/updates Playwright coverage for changed flows and runs it.

These four have no overlapping concerns and don't depend on each other's output, so parallel execution is safe and is the whole point — it turns a sequential lint → test → review loop into one round.

After all four report back, summarize: what was fixed automatically (linter), what tests were added (unit/e2e), and any findings from code-reviewer that need a human decision (e.g. a design tradeoff, not a clear bug).
