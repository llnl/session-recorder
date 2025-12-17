# Documentation System for Claude Code

## Purpose

This documentation system organizes work into a clear hierarchy optimized for AI-driven TDD development:

- **PROGRESS.md** - Dashboard of all initiatives (see `./TEMPLATE-PROGRESS.md` for template to start with)
- **INITIATIVE-[name].md** - XML-structured initiative with epic dependencies (see `./TEMPLATE-INITIATIVE.md` for template to start with)
- **epic-[init]-[epic].md** - XML-structured epic with requirements (see `./TEMPLATE-EPIC.md` for template to start with)
- **tasks-[init]-[epic].json** - JSON feature list with TDD test steps (see `./TEMPLATE-TASKS.json` for template to start with)

## Document Formats

### Initiatives & Epics: XML Structure

Uses XML tags for machine-readable structure with markdown content inside:

```xml
<initiative>
  <name>MVP</name>
  <goal>Ship a functional family operating system</goal>
  <status>active</status>
  <epics>
    <epic id="foundation" status="in_progress" blocks="">...</epic>
    <epic id="time-blocks" status="blocked" blocks="foundation">...</epic>
  </epics>
</initiative>
```

### Tasks: JSON Format

Structured feature lists with explicit test steps:

```json
{
  "epic": "epic-mvp-foundation",
  "features": [
    {
      "id": "DB-FUNC-01",
      "status": "todo",
      "steps": [
        "Navigate to /path → URL is exactly '/path'",
        "Query SELECT x → Returns exactly 1 row"
      ]
    }
  ]
}
```

## TDD Status Lifecycle

```text
todo → planning → implementing → implemented → tested
                                      ↓           ↓
                                    debug    regression
                                      ↑           ↓
                               /fix-debug-tasks  tested | debug
```

| Status | Description | Next Action |
|--------|-------------|-------------|
| `todo` | Not started | `/implement` to start |
| `planning` | Being planned | Complete planning |
| `implementing` | In progress | Continue implementing |
| `implemented` | Code complete | Run e2e verification |
| `tested` | Verified working | `/regression` periodically |
| `regression` | Being retested | Wait for results |
| `debug` | Test failed | `/fix-debug-tasks` |

## Human-Controlled Development Loop

Development is controlled by humans via slash commands:

1. **`/plan [name]`** - Creates initiative + epic docs
   - Uses `--think-hard` for deep analysis
   - Asks clarifying questions to reduce ambiguity
   - **STOPS** for human review

2. **`/generate-tasks [epic-path]`** - Creates tasks.json
   - Uses `--think-hard` for requirements analysis
   - Asks clarifying questions about edge cases
   - **STOPS** for human review

3. **`/implement [tasks-path]`** - Implements ONE feature
   - Regression check before new work
   - Creates e2e tests during implementation
   - **STOPS** after each feature (unless `--continue`)

4. **`/status`** - Shows progress dashboard
   - All initiatives, epics, tasks
   - Recommends next action

5. **`/regression [tasks-path]`** - Re-tests completed features
   - Marks as `regression` during testing
   - Updates to `tested` or `debug`

6. **`/fix-debug-tasks [tasks-path]`** - Fixes failing tests
   - Investigates root cause
   - Applies fix and verifies
   - **STOPS** after each fix

## Writing Explicit Test Steps

**CRITICAL:** Every step must be unambiguous and verifiable.

### Banned Vague Words

- works, correct, properly, valid, good, appropriate
- matches spec, as expected, successfully, correctly
- handles, supports, ensures (without specific outcomes)

### Required Format

```text
[ACTION] → [OBSERVABLE RESULT] (with exact values)
```

### BAD Examples

- "Test filtering works" ❌
- "Page displays correctly" ❌
- "Form validation is proper" ❌

### GOOD Examples

- "Query `SELECT type FROM tasks WHERE type='idea'` → Returns only rows where type='idea'" ✅
- "Navigate to /bucket → Page shows h1 with text 'Bucket'" ✅
- "Submit empty form → Error 'Title is required' appears below input" ✅
- "Viewport 375px → Bottom nav shows 5 icons, no text labels" ✅

## Quality Bar

- Zero console errors
- All e2e tests passing
- Screenshots confirm visual correctness
- Code follows existing patterns
- Proper TypeScript types

## Agent Workflow

### Starting Fresh Session

1. Read PROGRESS.md for context
2. Check git log for recent changes
3. Run `/status` to see current state
4. If debug > 0: Run `/fix-debug-tasks` first
5. Otherwise: Run `/implement` for next feature

### Ending Session

- [ ] All work committed
- [ ] tasks.json updated with correct statuses
- [ ] No uncommitted changes
- [ ] App in working state
- [ ] PROGRESS.md updated (if significant changes)
