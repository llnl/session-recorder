# Implement Next Task

You are implementing the next highest-priority task using TDD workflow.

Arguments: $ARGUMENTS (optional --continue flag)

## Step 0: Read PROGRESS.md for Next Task

**Read `plan/PROGRESS.md` and find the `## Next Task` section:**

```markdown
## Next Task

| ID | Description | Tasks File |
|---|---|---|
| BUG-02 | Block creation fails with constraint violation | [tasks-mvp-foundation.json](tasks/tasks-mvp-foundation.json) |
```

Extract:
- **Task ID**: The feature ID to implement (e.g., `BUG-02`)
- **Tasks File**: Path to the JSON file containing the task details

If no "Next Task" section exists or it's empty, **STOP** and report: "No next task defined in PROGRESS.md"

---

## Step 1: Get Bearings (Fresh Context)

Before implementing anything:

```bash
# Check current progress
cat [tasks-file] | grep -c '"status": "todo"'
cat [tasks-file] | grep -c '"status": "tested"'

# Check recent git history
git log --oneline -10
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

## Step 3: Locate the Specific Task

Open the tasks file and find the task by ID:
- Search for `"id": "[TASK-ID]"` in the JSON
- Verify status is `"todo"` (if `"implementing"`, continue it)
- Read all steps for the task

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

### For Desktop App Features (Electron)

**IMPORTANT: Desktop app features require user verification.**
Mark as "implemented" and the user will test manually.

```json
{
  "status": "implemented",
  "history": [..., {"date": "YYYY-MM-DD", "from": "implementing", "to": "implemented", "notes": "Description of changes"}]
}
```

**Note:** Only the USER can mark desktop app features as "tested" after manual verification.

### For Web Features (Viewer, MCP Server, etc.)

You CAN mark web-based features as "tested" if you verify them with Playwright:

**If Playwright tests pass:**
```json
{
  "status": "tested",
  "history": [..., {"date": "YYYY-MM-DD", "from": "implementing", "to": "tested"}]
}
```

### For Blocking Issues

```json
{
  "status": "debug",
  "history": [..., {"date": "YYYY-MM-DD", "from": "implementing", "to": "debug"}]
}
```

Update the `summary` counts in the JSON file.

## Step 7: Commit Progress

```bash
git add .
git commit -m "feat: [feature description]

- Implemented [specific changes]
- Status: [feature-id] → implemented (awaiting user test)"
```

## Step 8: Update PROGRESS.md with Next Task (CRITICAL)

**This is the key difference from `/implement`.**

1. Open the tasks file and find the next `"todo"` task by priority:
   - First: Any task with `"priority": "HIGH"` in remaining phases
   - Then: Tasks in phase order (ui-session-priority → bucket-page-creation → upcoming-page-enhancement → bug-fixes → testing-validation)
   - Within phase: First `"todo"` task by array order

2. Update `plan/PROGRESS.md`:

```markdown
## Next Task

| ID | Description | Tasks File |
|---|---|---|
| [NEXT-ID] | [Next task description] | [tasks-file-link](tasks/[file].json) |
```

3. If ALL tasks are complete (no more `"todo"` status), update to:

```markdown
## Next Task

✅ **All tasks complete!** Ready for next epic or final validation.
```

4. Update the initiative/epic markdown files as needed.

## Step 9: Report and Stop

Report what was done:
- Feature ID and description
- Files changed
- Test results
- Any issues encountered
- **Next task queued:** [ID] - [description]

**STOP** unless `--continue` flag was provided.

If `--continue`:
- Go back to Step 0
- Read updated PROGRESS.md
- Implement next task
- Repeat process

## Quality Bar

- Zero console errors
- All steps from feature verified
- Screenshot evidence captured
- Clean code following existing patterns
- Proper TypeScript types
- e2e test written and passing
- PROGRESS.md updated with next task

## Session End Checklist

Before ending:
- [ ] All work committed
- [ ] tasks.json updated with correct statuses
- [ ] PROGRESS.md updated with change log
- [ ] PROGRESS.md updated with next task
- [ ] No uncommitted changes
- [ ] App in working state (confirm using playwright mcp if changes were UI based)
