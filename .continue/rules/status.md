# Status Dashboard

Display progress across all initiatives, epics, and tasks.

## What to Do

1. Find all initiative files in `docs/initiatives/`
2. For each initiative, read its epics
3. For each epic, read its tasks.json and count statuses
4. Display a tree view with progress

## Output Format

```
📊 TDD Progress Dashboard
========================

Initiative: [NAME] ([X]% complete)
├── [Epic 1]: [tested] tested, [implementing] implementing, [todo] todo
├── [Epic 2]: [tested] tested, [implementing] implementing, [todo] todo (blocked by [Epic 1])
└── [Epic 3]: [tested] tested, [implementing] implementing, [todo] todo (blocked by [Epic 2])

Initiative: [NAME 2] ([X]% complete)
├── ...

========================
Total: [X] features | [tested] tested | [debug] debug | [todo] todo

🔧 Debug Issues: [count] features need fixing
   Run: /fix-debug-tasks [path-to-tasks.json]

📋 Next Action:
   /implement docs/tasks/[next-tasks-file].json
```

## Status Counts

For each tasks.json, count:
- `todo` - Not started
- `planning` - Being planned
- `implementing` - In progress
- `implemented` - Done, needs verification
- `tested` - Verified working
- `regression` - Being retested
- `debug` - Test failed, needs fix

## Progress Calculation

```
progress = (tested / total_features) * 100
```

## Blocked Detection

An epic is blocked if:
- Its `blocks` attribute references another epic
- That blocking epic is not 100% tested

## Recommendations

Based on status, suggest next action:
- If debug > 0: Suggest `/fix-debug-tasks`
- If todo > 0: Suggest `/implement` for highest priority
- If all tested: Suggest `/regression` to verify
- If initiative complete: Celebrate!