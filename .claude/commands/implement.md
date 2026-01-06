# Implement Feature

You are implementing features from a tasks.json file using TDD workflow.

Arguments: $ARGUMENTS (path-to-tasks.json and optional --continue flag)

## Step 1: Get Bearings (Fresh Context)

Before implementing anything:

```bash
# Check current progress
cat [tasks-file] | grep -c '"status": "todo"'
cat [tasks-file] | grep -c '"status": "tested"'

# Check recent git history
git log --oneline -10

# Read PROGRESS.md for context
cat docs/PROGRESS.md
```

## Step 2: Run Regression Check (MANDATORY)

Before new work, verify 1-2 core tested features still work:

1. Find a feature with `status: "tested"` that's critical
2. Run its e2e test or manually verify steps
3. Check for UI issues:
   - White-on-white text or poor contrast
   - Layout issues or overflow
   - Console errors
   - Missing hover states

**If ANY issue found:**
- Mark that feature as `status: "debug"`
- Fix ALL debug issues BEFORE implementing new features
- Use `/fix-debug-tasks` if needed

## Step 3: Find Next Feature

Find the highest-priority feature with `status: "todo"`:

1. Read tasks.json
2. Find first feature where `status === "todo"`
3. If a feature has `status === "implementing"`, continue that one instead

## Step 4: Implement ONE Feature

Focus on ONE feature at a time:

1. **Update status:** Change `status` to `"implementing"`
2. **Add history entry:** `{"date": "YYYY-MM-DD", "from": "todo", "to": "implementing"}`
3. **Implement the code:**
   - Write/modify source files
   - Follow existing patterns in codebase
   - Use proper TypeScript types
4. **Create e2e test:**
   - Add Playwright test file (if not exists)
   - Implement test based on feature steps
5. **Run the test:**
   - Execute Playwright test
   - Verify with screenshots

## Step 5: Verify with Browser (CRITICAL)

**DO:**
- Test through the UI with clicks and keyboard (Playwright)
- Take screenshots to verify visual appearance
- Check browser console for errors
- Verify complete user workflow end-to-end

**DON'T:**
- Only test with curl/API commands
- Use JavaScript evaluation to bypass UI
- Skip visual verification
- Mark tested without thorough verification

## Step 6: Update Status

After verification with screenshots:

**If tests pass:**
```json
{
  "status": "tested",
  "history": [..., {"date": "YYYY-MM-DD", "from": "implementing", "to": "tested"}]
}
```

**If tests fail:**
```json
{
  "status": "debug",
  "history": [..., {"date": "YYYY-MM-DD", "from": "implementing", "to": "debug"}]
}
```

Update the `summary` counts in the JSON file.

Update PROGRESS.md, and related initiative and epic (only update as it pertains to the md's purpose)

For any files updated, build any projects updated using the root package.json (using build scripts).

## Step 8: Report and Stop

Report what was done:
- Feature ID and description
- Files changed
- Test results
- Any issues encountered

## Step 7: Commit Progress

```bash
git add .
git commit -m "feat: [feature description]

- Implemented [specific changes]
- Added e2e test: [test file]
- Status: [feature-id] → tested"
```

**STOP** unless `--continue` flag was provided.

If `--continue`:
- Go back to Step 3
- Find next todo feature
- Repeat process

## Quality Bar

- Zero console errors
- All steps from feature verified
- Screenshot evidence captured
- Clean code following existing patterns
- Proper TypeScript types
- e2e test written and passing

## Session End Checklist

Before ending:
- [ ] All work committed
- [ ] tasks.json updated with correct statuses
- [ ] No uncommitted changes
- [ ] App in working state
- [ ] PROGRESS.md changelog updated (if significant)
