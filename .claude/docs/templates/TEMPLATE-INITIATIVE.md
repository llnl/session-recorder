# Initiative Template

Copy this template and customize for each initiative.

```xml
<initiative>
  <name>[Initiative Name]</name>
  <goal>[One sentence describing the initiative goal]</goal>
  <status>[active | planning | complete]</status>
  <progress>[0-100]</progress>
  <timeline>[Estimated timeline or duration]</timeline>

  <philosophy>
    [Key insights about the approach, ordering principles, or strategic decisions
    that guide this initiative. What makes this initiative unique or important?]
  </philosophy>

  <critical_path>
    [Visual or textual representation of epic dependencies]

    1. [First epic] must complete first because [reason]
    2. [Second epic] requires [first epic] because [reason]
    3. [Third epic] requires [second epic] because [reason]
  </critical_path>

  <success_criteria>
    <!-- CRITICAL: Every criterion MUST be unambiguous and verifiable -->
    <!-- NO vague words: works, correct, properly, valid, matches spec -->
    <!-- Format: [SPECIFIC CONDITION] → [EXACT OBSERVABLE OUTCOME] -->

    - Query `SELECT column FROM table LIMIT 1` → Returns exactly 1 row
    - Navigate to /path → URL is exactly '/path' AND no redirect occurs
    - Element with data-testid='x' → Contains text 'Expected Value'
    - Run `npm test` → Exit code 0, all tests pass
    - Open DevTools console → Zero errors logged
    - Mobile 375px viewport → [Specific element] visible with [exact properties]
    - Desktop 1440px viewport → [Specific element] visible with [exact properties]
  </success_criteria>

  <epics>
    <!-- List all epics in dependency order -->
    <epic id="[epic-id]" status="[in_progress | blocked | complete]" progress="[0-100]" blocks="[epic-id-that-blocks-this | empty]">
      [Epic Name] - [Brief description]
      Link: ../epics/epic-[init]-[epic].md
    </epic>
    <epic id="[epic-id-2]" status="blocked" progress="0" blocks="[epic-id]">
      [Epic 2 Name] - [Brief description]
      Link: ../epics/epic-[init]-[epic-2].md
    </epic>
  </epics>

  <changelog>
    <!-- Most recent entries first -->
    <entry date="YYYY-MM-DD" epic="[epic-id]">
      [Brief description of what changed]
    </entry>
  </changelog>
</initiative>
```

## Template Usage Notes

### Status Values

- `active` - Currently being worked on
- `planning` - In planning phase, not yet started
- `complete` - All epics tested and verified

### Epic Status Values

- `in_progress` - Currently implementing features
- `blocked` - Waiting on another epic to complete
- `complete` - All features tested and verified

### Success Criteria Writing Rules

**NEVER use vague words:**
- works, correct, properly, valid, good, appropriate
- matches spec, as expected, successfully, correctly

**ALWAYS specify exact outcomes:**
- Exact values: `rgb(15, 23, 42)`, `'Expected Text'`, `200`
- Exact selectors: `data-testid='x'`, `aria-label='y'`, `h1`
- Exact measurements: `375px`, `1440px`, `<3s`
- Exact counts: `exactly 5 items`, `returns 1 row`

**Format Pattern:**

```text
[SPECIFIC CONDITION] → [EXACT OBSERVABLE OUTCOME]
```

**Examples:**
- Query `SELECT type FROM tasks WHERE type='idea'` → Returns only rows where type column equals 'idea'
- Click 'Submit' button → URL changes to '/success' AND toast appears with text 'Saved!'
- Viewport 375px width → Navigation shows 5 icon buttons, no text labels visible
