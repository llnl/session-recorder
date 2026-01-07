# Regression Testing

Re-run tests on features with `status: "tested"` to verify they still work after new changes.

Arguments: $ARGUMENTS (path-to-tasks.json and optional --all flag)

## When to Run

- After implementing new features
- Before merging branches
- After significant refactoring
- Periodically to catch silent regressions

## Workflow

### Step 1: Find Tested Features

Read the tasks.json and find all features with `status: "tested"`.

If `--all` flag: Test all tested features
Otherwise: Test a representative sample (1-3 core features)

### Step 2: Mark as Regression

For each feature being tested:
```json
{
  "status": "regression",
  "history": [..., {"date": "YYYY-MM-DD", "from": "tested", "to": "regression"}]
}
```

### Step 3: Run Tests

For each feature in regression:

1. Run its e2e test file
2. OR manually verify each step
3. Check for UI issues:
   - White-on-white text or poor contrast
   - Random characters displayed
   - Incorrect timestamps
   - Layout issues or overflow
   - Buttons too close together
   - Missing hover states
   - Console errors

### Step 4: Update Status

**If test passes:**
```json
{
  "status": "tested",
  "history": [..., {"date": "YYYY-MM-DD", "from": "regression", "to": "tested"}]
}
```

**If test fails:**
```json
{
  "status": "debug",
  "history": [..., {"date": "YYYY-MM-DD", "from": "regression", "to": "debug"}]
}
```

### Step 5: Report Results

```
🔄 Regression Test Results
==========================

Tested: [X] features

✅ Passed: [count]
   - [feature-id]: [description]
   - [feature-id]: [description]

❌ Failed: [count]
   - [feature-id]: [description]
     Error: [what broke]
   - [feature-id]: [description]
     Error: [what broke]

Next Action:
   [If failures] /fix-debug-tasks [path]
   [If all pass] Continue with /implement
```

## Debug Issues Found

When marking a feature as `debug`, record what broke:
- Which step failed
- Error message or screenshot
- Suspected cause if known

This helps `/fix-debug-tasks` understand what to fix.

## Update Summary

After regression testing, update the `summary` object in tasks.json:
- Decrement `tested` for any that failed
- Increment `debug` for failures
- Keep `regression` at 0 (temporary state)