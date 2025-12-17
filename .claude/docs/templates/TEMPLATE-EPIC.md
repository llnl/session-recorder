# Epic Template

Copy this template and customize for each epic.

```xml
<epic>
  <name>[Epic Name]</name>
  <initiative>../initiatives/INITIATIVE-[name].md</initiative>
  <tasks>../tasks/tasks-[init]-[epic].json</tasks>
  <status>[in_progress | planning | complete]</status>
  <timeline>[Estimated duration or target date]</timeline>

  <summary>
    [What this epic is and why we're building it - 2-3 sentences.
    Include the key insight or motivation behind this work.]
  </summary>

  <problem>
    <current_state>
      [Describe the current situation that needs improvement.
      Be specific about what exists, what's broken, or what's missing.
      Include concrete examples.]
    </current_state>

    <impact>
      [Explain why this problem matters.
      What can't users do? What breaks? What's confusing?
      Be specific about the consequences.]
    </impact>
  </problem>

  <requirements>
    <!-- Each requirement should be a distinct, implementable unit -->
    <requirement id="FR-1">
      <title>[Requirement Name]</title>
      [Detailed description of what needs to be built.
      Include specific details about behavior, constraints, and edge cases.
      Break down into bullet points if helpful.]
    </requirement>

    <requirement id="FR-2">
      <title>[Requirement Name]</title>
      [Description...]
    </requirement>
  </requirements>

  <acceptance_criteria>
    <!-- CRITICAL: Every criterion MUST be unambiguous and verifiable -->
    <!-- NO vague words: works, correct, properly, valid, matches spec -->
    <!-- Format: [SPECIFIC CONDITION] → [EXACT OBSERVABLE OUTCOME] -->

    - [ ] Query `SELECT column FROM table` → Returns [exact expected result]
    - [ ] Navigate to /path → Page renders with h1 containing text '[Exact Title]'
    - [ ] Mobile (375px): [Element] shows [exact state/appearance]
    - [ ] Desktop (1440px): [Element] shows [exact state/appearance]
    - [ ] Click [button] → [Exact outcome with specific values]
    - [ ] Open browser DevTools console → Zero errors logged
    - [ ] Run `npx playwright test [file]` → All tests pass with exit code 0
  </acceptance_criteria>

  <technical_notes>
    [Implementation guidance, architecture decisions, constraints.
    Include specific technologies, patterns, or approaches to use.
    Reference existing code patterns in the codebase.]
  </technical_notes>

  <out_of_scope>
    [What this epic explicitly does NOT include.
    Be specific to prevent scope creep and set expectations.]
  </out_of_scope>
</epic>
```

## Template Usage Notes

### Status Values

- `in_progress` - Currently implementing features
- `planning` - Being planned, not yet started
- `complete` - All features tested and verified

### Acceptance Criteria Writing Rules

**NEVER use vague words:**
- works, correct, properly, valid, good, appropriate
- matches spec, as expected, successfully, correctly
- handles, supports, ensures (without specific outcomes)

**ALWAYS specify exact outcomes:**
- Exact values: `rgb(15, 23, 42)`, `'Expected Text'`, `200`
- Exact selectors: `data-testid='x'`, `aria-label='y'`, `h1`
- Exact measurements: `375px`, `1440px`, `<3s`
- Exact counts: `exactly 5 items`, `returns 1 row`
- Exact states: `disabled`, `visible`, `hidden`, `checked`

**Format Pattern:**

```text
[SPECIFIC CONDITION] → [EXACT OBSERVABLE OUTCOME]
```

**BAD Examples (too vague):**
- tasks.type column exists and works in queries
- Navigation matches spec on both mobile and desktop
- Page displays correctly
- Form validation works properly

**GOOD Examples (explicit):**
- Query `SELECT type FROM tasks LIMIT 1` executes without error (column exists)
- Mobile (375px): Bottom nav shows exactly 5 icons in order: Focus, Today, Blocks, Ideas, Browse
- Navigate to /bucket → Page shows h1 with text 'Bucket' AND FAB button in bottom-right
- Submit empty form → Error message 'Title is required' appears below input field

### Requirement ID Convention

- `FR-1`, `FR-2`, etc. for functional requirements
- `NFR-1`, `NFR-2`, etc. for non-functional requirements (performance, security)
