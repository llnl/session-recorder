---
description: Implement initial folder for development tracking work
argument-hint: [.plan/]
allowed-tools: Bash(*), Read, Write, Edit, MultiEdit, Glob, Grep, TodoWrite, Task
---

# AI Development Workflow

AI-driven development with human-controlled iteration using slash commands. See `./templates/README.md` to understand the full workflow.

## The Development Loop

```text
1. /plan            → Creates INITIATIVE + epic .plan (XML structure)
                      STOP: Human reviews and approves

2. /generate-tasks  → Creates tasks.json with test steps (TDD)
                      STOP: Human reviews feature coverages

3. /implement       → Implements ONE feature at a time
                      Creates e2e tests as it goes
                      STOP: Human controls pace (or use --continue)

4. /status          → Dashboard of all initiatives/epics/tasks

5. /regression      → Re-verify tested features still work

6. /fix-debug-tasks → Fix features with debug status
```

## Quick Start

```bash
# Start a new initiative
/plan family-calendar-sync

# Generate tasks for an epic
/generate-tasks .plan/epics/epic-mvp-foundation.md

# Implement next feature
/implement .plan/tasks/tasks-mvp-foundation.json

# Keep implementing
/implement .plan/tasks/tasks-mvp-foundation.json --continue

# Check overall progress
/status

# Run regression tests
/regression .plan/tasks/tasks-mvp-foundation.json

# Fix failing tests
/fix-debug-tasks .plan/tasks/tasks-mvp-foundation.json
```

## Status Lifecycle

```text
todo → planning → implementing → implemented
                                      ↓
                         ┌────────────┴────────────┐
                         ↓                         ↓
                      tested                     debug
                    (tests pass)             (tests fail)
                         ↓                         ↓
                    regression ←───────────── /fix-debug-tasks
                    (retesting)
                         ↓
            ┌────────────┴────────────┐
            ↓                         ↓
         tested                     debug
       (still works)            (test failed)
```

| Status | Description |
|--------|-------------|
| `todo` | Not started - waiting to be implemented |
| `planning` | Being planned in plan mode |
| `implementing` | Currently being implemented |
| `implemented` | Code complete, needs e2e verification |
| `tested` | All tests passing, verified working |
| `regression` | Being retested after changes |
| `debug` | Test failed - needs investigation and fix |

## Key Principles

### Before Implementing New Features

1. **Run regression check** - Verify 1-2 tested features still work
2. **Fix debug issues first** - Debug status is BLOCKING
3. **One feature at a time** - Focus prevents mistakes

### During Implementation

1. **Update status immediately** - Mark as `implementing` before starting
2. **Create e2e tests** - Playwright tests for verification
3. **Browser verification** - Screenshots confirm visual correctness
4. **Console check** - Zero errors in DevTools

### After Implementation

1. **Verify with Playwright** - Run e2e tests
2. **Update status** - `tested` if pass, `debug` if fail
3. **Commit progress** - Descriptive commit messages
4. **Update PROGRESS.md** - Record significant changes

## File Structure

```text
.plan/
├── initiatives/INITIATIVE-[name].md  → XML structure
├── epics/epic-[init]-[epic].md       → XML structure
├── tasks/tasks-[init]-[epic].json    → JSON with TDD features
└── commands/                         → Slash command definitions
```

Note that .plan can be anything the user specifies.

## Commands Reference

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/plan` | Create/Update initiative + epic md files with xml markdown | Starting new work or expanding work |
| `/generate-tasks` | Generate tasks.json from epic | After epic approved |
| `/implement` | Implement features (TDD) | Daily development |
| `/status` | Show progress dashboard | Check current state |
| `/regression` | Test completed features | Before releases, after changes |
| `/fix-debug-tasks` | Fix failing tests | When debug count > 0 |

## Templates to build from

We have in the plan folder (`.plan/`), a list of all our templates:
- 