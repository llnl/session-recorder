---
description: Generate TDD tasks JSON from an approved epic
argument-hint: [path-to-epic.md]
---

# Generate Tasks

You are generating a comprehensive tasks.json file from an approved epic. Use `--think-hard` for deep requirements analysis.

## CRITICAL: Ask Questions First

Before generating ANY tasks, you MUST ask clarifying questions about:

1. **Ambiguous Requirements:**
   - Any acceptance criteria that aren't 100% clear
   - Edge cases not explicitly covered
   - Error handling expectations

2. **User Flows:**
   - What are ALL the user paths through this feature?
   - What happens on success vs failure?
   - What validation is needed?

3. **Visual/Style Requirements:**
   - Exact colors, spacing, typography?
   - Responsive breakpoints and behavior?
   - Loading states and transitions?

4. **Integration Points:**
   - What existing components are affected?
   - What API contracts must be maintained?
   - What database changes are needed?

## After Questions Are Answered

1. Read the initiative file (for context)
2. Read the epic file (for requirements)
3. Generate `docs/tasks/tasks-[init]-[epic].json`
4. STOP and wait for human review of feature coverage

## JSON Structure

```json
{
  "epic": "epic-[init]-[epic]",
  "initiative": "[init]",
  "total_features": 0,
  "summary": {
    "todo": 0,
    "planning": 0,
    "implementing": 0,
    "implemented": 0,
    "tested": 0,
    "regression": 0,
    "debug": 0
  },
  "features": [
    {
      "id": "[PHASE]-[TYPE]-[NN]",
      "category": "functional|style",
      "phase": "[phase-name]",
      "description": "Brief description of what this feature tests",
      "status": "todo",
      "steps": [
        "Action → Expected observable result",
        "Query/Check → Exact expected outcome"
      ],
      "tests": {
        "unit": [],
        "integration": [],
        "e2e": []
      },
      "files": ["path/to/relevant/files"],
      "history": []
    }
  ]
}
```

## Feature Coverage Requirements

**Comprehensive Coverage:**
- Cover ALL user flows from the epic requirements
- Cover ALL acceptance criteria from the epic
- Include both happy path and error cases
- No fixed minimum - enough to be COMPLETE

**Category Mix:**
- `functional` - Behavior, logic, data flow
- `style` - Visual appearance, layout, responsive

**Step Complexity Mix:**
- ~75% narrow tests (2-5 steps) - focused verification
- ~25% comprehensive tests (10+ steps) - end-to-end flows

**Priority Order:**
- Foundational features first (database, core components)
- Dependencies before dependents
- Critical path items prioritized

## Step Writing Rules (CRITICAL)

Every step MUST be unambiguous, verifiable, and **idempotent**. NO vague words.

### Idempotent Step Pattern (MANDATORY)

All tasks MUST follow the **CHECK → IF NEEDED → VERIFY** pattern:

1. **CHECK**: First verify if desired state already exists
   - Safe to re-run at any time
   - Determines if action is needed

2. **IF NEEDED**: Only perform action if CHECK shows state missing
   - Skipped if CHECK passes
   - Actually creates/modifies state

3. **VERIFY**: Confirm final state is correct
   - Can be run multiple times
   - Validates the desired end state

**Step Format:**
```
[CHECK/IF NEEDED/VERIFY]: [ACTION] → [OBSERVABLE RESULT]
```

### Description Rules

Feature descriptions should be **state-based**, not action-based:
- ✅ GOOD: "tasks.type column exists with CHECK constraint"
- ❌ BAD: "Create migration for tasks.type column"

### Bad Examples (vague, non-idempotent)

- "Create the migration file"
- "Test filtering works"
- "Verify navigation is correct"
- "Check styling looks good"

### Good Examples (explicit, idempotent)

**Database Feature:**

```
CHECK: Query `SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'type'` → If returns 1 row, column exists (skip creation)
IF NEEDED: Create file supabase/migrations/YYYYMMDDHHMMSS_add_type.sql → File created
IF NEEDED: Add type TEXT column with DEFAULT 'task' → Column added
IF NEEDED: Run `supabase db push` → Migration completes
VERIFY: Query `SELECT type FROM tasks LIMIT 0` → Column accessible
VERIFY: Insert row with type='invalid' → Error: violates check constraint
```

**UI Feature:**

```
CHECK: File src/features/bucket/BucketPage.tsx exists → If exists, check functionality
IF NEEDED: Create file src/features/bucket/BucketPage.tsx → File created
IF NEEDED: Add page header with h1 → Element present
VERIFY: Navigate to /bucket → URL is exactly '/bucket', no redirect
VERIFY: Page contains h1 → h1.textContent === 'Bucket'
VERIFY: FAB button visible → Button with aria-label='Add task' in bottom-right
```

**Style Feature:**

```
CHECK: BucketPage.tsx contains bg-slate-900 class → If found, styling exists
IF NEEDED: Add dark theme classes to container → Classes added
VERIFY: Page background color → getComputedStyle returns rgb(15, 23, 42)
VERIFY: Card background color → .card elements have rgb(30, 41, 59)
VERIFY: Mobile 375px viewport → Layout is single column, full width
```

## ID Convention

```
[PHASE]-[TYPE]-[NN]

Examples:
- DB-FUNC-01 (database, functional, #1)
- NAV-STYLE-03 (navigation, style, #3)
- BUCKET-FUNC-12 (bucket page, functional, #12)
```

## Output

After human approval:
- Tasks file: `docs/tasks/tasks-[init]-[epic].json`
- Next step: Run `/implement` to start building
