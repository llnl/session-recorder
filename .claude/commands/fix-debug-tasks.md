# Fix Debug Tasks

Fix features that have `status: "debug"` (tests that failed).

Arguments: $ARGUMENTS (path-to-tasks.json)

## Philosophy

Debug issues are BLOCKING. They must be fixed before implementing new features.
This ensures the codebase stays healthy and regressions don't accumulate.

## Workflow

### Step 1: Find Debug Features

Read the tasks.json and find all features with `status: "debug"`.

List them with their descriptions and history (to understand what broke).

### Step 2: Investigate First Feature

For the first debug feature:

1. **Read the feature steps** - understand what should work
2. **Check the history** - when did it break? what changed?
3. **Run the e2e test** - see actual error output
4. **Investigate the code** - find root cause

### Step 3: Fix the Issue

1. **Identify root cause** - don't just patch symptoms
2. **Make minimal fix** - only change what's necessary
3. **Preserve existing behavior** - don't break other things

### Step 4: Verify the Fix

1. **Run the specific e2e test** - must pass
2. **Run related tests** - ensure no new regressions
3. **Visual verification** - screenshot confirms correct appearance
4. **Console check** - no new errors

### Step 5: Update Status

**If fix verified:**
```json
{
  "status": "tested",
  "history": [..., {"date": "YYYY-MM-DD", "from": "debug", "to": "tested"}]
}
```

**If still failing:**
Keep status as `debug`, report what's still broken.

### Step 6: Commit the Fix

```bash
git add .
git commit -m "fix: [feature-id] - [brief description]

- Root cause: [what was wrong]
- Fix: [what was changed]
- Verified: e2e test passing"
```

### Step 7: Report and Stop

Report:
- Feature ID that was fixed
- Root cause found
- Fix applied
- Verification results

**STOP** after fixing ONE feature.

Human can run `/fix-debug-tasks` again for the next debug item.

## Why One at a Time?

- Focused debugging is more effective
- Each fix is isolated and verifiable
- Human can review each fix
- Prevents cascading changes that are hard to review

## Common Debug Scenarios

### UI Regression
- Check recent CSS/component changes
- Verify responsive breakpoints
- Check for conflicting styles

### Data Issue
- Check database migrations
- Verify API response format
- Check TypeScript types match

### Test Flakiness
- Add proper waits/assertions
- Check for race conditions
- Verify test isolation

### Integration Break
- Check API contracts
- Verify environment variables
- Check third-party dependencies

## Update Summary

After fixing, update the `summary` object in tasks.json:
- Decrement `debug`
- Increment `tested`
