# Claude Quality Sub-Agents

This directory holds repository-owned instruction files for Claude sub-agents. It keeps quality standards portable and versioned alongside the product.

These are not background processes or deployed application services. Claude invokes them during development or review. GitHub Actions independently executes the concrete quality commands, so deployment never depends on a model response.

## Workflow

1. Complete one focused vertical slice.
2. Give its changed files and acceptance criteria to the quality orchestrator.
3. Run applicable review, lint/type, unit/integration, and E2E tasks concurrently.
4. Fix confirmed findings and rerun affected checks.
5. Let GitHub Actions enforce required checks before Vercel deployment.

## Agent contracts

- [Code reviewer](code-reviewer.md)
- [Lint and type-check agent](lint-and-types.md)
- [Unit-test engineer](unit-test-engineer.md)
- [End-to-end test engineer](e2e-test-engineer.md)
- [Quality orchestrator](quality-orchestrator.md)
