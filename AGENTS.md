# AI development workflow

This repository is developed with both Codex and Claude Code. Treat
`docs/AI_HANDOFF.md` as the durable shared memory between agents.

## At the start of every development task

1. Read `docs/AI_HANDOFF.md` before editing files.
2. Inspect `git status --short --branch` and the recent relevant history.
3. Do not assume that an uncommitted change was made by the current agent.
   Preserve it unless the user explicitly asks to remove or replace it.

## While working

- Keep the handoff concise and factual; do not paste secrets, tokens, personal
  data, or full command output into it.
- Update `docs/AI_HANDOFF.md` whenever the active objective, important decision,
  blocker, schema/API contract, migration requirement, or verification state
  changes materially.
- Record paths and commands precisely enough that the other agent can continue
  without relying on chat history.
- Do not mark work complete until the relevant checks have actually passed.

## Before ending a development session

Update `docs/AI_HANDOFF.md` with:

- the current objective and status;
- completed changes, with file paths;
- remaining work and the exact next action;
- tests/checks run and their outcomes;
- known risks, blockers, and relevant uncommitted files;
- the agent name and current local date/time.

Keep only current, actionable state in the main sections. Move useful historical
context into the short session log at the bottom and remove stale details.

