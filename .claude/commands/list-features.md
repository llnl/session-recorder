# List Features

Display all features with user flows from tasks JSON files, epics, or initiatives.

## Arguments

`$ARGUMENTS` - Path to a file:
- **Tasks JSON**: `plan/tasks/tasks-*.json` - List features from this file
- **Epic MD**: `plan/epics/epic-*.md` - Find related tasks file and list features
- **Initiative MD**: `plan/initiatives/INITIATIVE-*.md` - List features from ALL related epics

## What to Do

### 1. Determine Input Type

Based on file path:
- `.json` file → Tasks JSON (direct feature list)
- `epic-*.md` → Epic (resolve to tasks file)
- `INITIATIVE-*.md` → Initiative (resolve to all tasks files)

### 2. Resolve Tasks Files

**For Tasks JSON**:
- Use the file directly

**For Epic MD**:
- Read the epic file
- Extract `<id>` from XML
- Find matching tasks file: `plan/tasks/tasks-{epic-id}.json`
- Also check for `tasks-{initiative}-{epic-id}.json` pattern

**For Initiative MD**:
- Read the initiative file
- Extract `<name>` from XML
- Extract all `<epic id="...">` entries
- Find all matching tasks files using patterns:
  - `plan/tasks/tasks-{initiative}-{epic-id}.json`
  - `plan/tasks/tasks-{epic-id}.json`

### 3. Parse Features

For each tasks JSON file:
1. Read the file
2. Extract `features` array
3. For each feature extract:
   - `id` - Feature identifier
   - `description` - What the feature does
   - `status` - Current status (todo, tested, etc.)
   - `category` - Type of feature (functional, etc.)
   - `phase` - Implementation phase
   - `steps` - TDD steps (these become the user flow)
   - `files` - Related source files

### 4. Generate User Flows

Convert `steps` array into user-friendly flow:
- Filter for `VERIFY:` steps (these are the actual test assertions)
- Parse the `[ACTION] → [RESULT]` format
- Number them sequentially

## Output Format

```
================================================================================
FEATURE LIST
================================================================================

Source: [path/to/file] (initiative | epic | tasks)
Related Files: [count] tasks files

================================================================================
EPIC: [epic-name] ([X] features)
================================================================================

FEAT-01: [description]
Status: [status] | Category: [category] | Phase: [phase]
Files: [file1], [file2]

User Flow:
  1. [Action] → [Expected Result]
  2. [Action] → [Expected Result]
  3. [Action] → [Expected Result]

--------------------------------------------------------------------------------

FEAT-02: [description]
Status: [status] | Category: [category] | Phase: [phase]
Files: [file1], [file2]

User Flow:
  1. [Action] → [Expected Result]
  2. [Action] → [Expected Result]

--------------------------------------------------------------------------------

[... more features ...]

================================================================================
EPIC: [next-epic-name] ([X] features)
================================================================================

[... features from next epic ...]

================================================================================
SUMMARY
================================================================================

Total Features: [count]
By Status:
  - tested: [count]
  - implementing: [count]
  - todo: [count]
  - debug: [count]

By Category:
  - functional: [count]
  - performance: [count]
  - integration: [count]

By Phase:
  - [phase-1]: [count]
  - [phase-2]: [count]
```

## User Flow Extraction Rules

From the `steps` array:

1. **VERIFY steps** become user flow items:
   - `VERIFY: Click on element → Action captured` becomes:
   - `Click on element → Action captured`

2. **CHECK steps** indicate preconditions (skip in user flow)

3. **IF NEEDED steps** are implementation details (skip in user flow)

4. Parse the `→` separator to split action from result

## Examples

### List features from a tasks file:
```
/list-features plan/tasks/tasks-recorder-core.json
```

### List features from an epic:
```
/list-features plan/epics/epic-recorder-core.md
```

### List ALL features from an initiative:
```
/list-features plan/initiatives/INITIATIVE-session-recorder.md
```

## Error Handling

- **File not found**: Show error and suggest valid paths
- **No tasks file for epic**: Show warning, list available tasks files
- **Invalid JSON**: Show parse error with location
- **No features found**: Show info message

## Grouping Options

When listing from initiative (multiple epics):
- Group features by epic
- Show epic status in header
- Show blocking relationships between epics
