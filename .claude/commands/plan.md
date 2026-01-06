# Plan Work

Plan new work or expand existing work that go into initiatives/epics. Use `--think-hard` for deep architectural analysis.

## Determine Intent

First, understand what the user wants. If the user already has provided a spec, ensure that you have the intent. Don't ask questions they already provided to you:

1. **New Initiative** - Create a brand new initiative with epics
   - User says: "plan a new initiative for X"
   - Creates: INITIATIVE-[name].md + epic files

2. **Expand Initiative** - Add new epics to existing initiative
   - User says: "add an epic for Y to MVP" or provides initiative path
   - Creates: New epic file(s), updates initiative

3. **Expand Epic** - Add more detail/requirements to existing epic
   - User says: "expand the time-blocks epic" or provides epic path
   - Updates: Existing epic file with additional content

4. **Add multiple initiatives and epics** - The user might provide context to add multiple initiatives at a time.
   - User says: "Here is a spec file, add all initiatives and epics for these.". This is when you want to understand first what initiatives and epics they already have in case some of the initiatives are already in the folders, and you just need to expand some. You may need to expand AND create new ones. Do what is most logical. They user may have preferences, so show them the plan before adding.

## CRITICAL: Ask Questions First

Before creating or modifying ANY documentation, you MUST ask clarifying questions to reduce ambiguity and prevent hallucination IF they haven't already provided context to these questions. Don't make up answers. If you need clarifying questions, then do so:

### For New Initiatives

1. **Scope Questions:**
   - What is the core goal of this initiative?
   - What problem does it solve for users?
   - What are the boundaries (what's explicitly OUT of scope)?

2. **Success Criteria Questions:**
   - How will we know when this initiative is complete?
   - What are the measurable outcomes?
   - What quality bar must be met?

3. **Epic Breakdown Questions:**
   - What are the major phases or milestones?
   - What dependencies exist between phases?
   - What's the critical path?

### For Expanding Initiatives (Adding Epics)

1. Read the existing initiative file first
2. Ask:
   - What new capability or feature does this epic add?
   - Where does it fit in the dependency chain?
   - Does it block or depend on existing epics?

### For Expanding Epics

1. Read the existing epic file first
2. Ask:
   - What additional requirements need to be captured?
   - Are there edge cases or scenarios not covered?
   - What acceptance criteria are missing?

## After Questions Are Answered

1. Enter plan mode to design the changes
2. Create or update the appropriate files:
   - New initiative: `docs/initiatives/INITIATIVE-[name].md`
   - New epics: `docs/epics/epic-[init]-[epic].md`
   - Updates: Edit existing files
3. STOP and wait for human review

## XML Structure Requirements

### Initiative Template

```xml
<initiative>
  <name>[Name]</name>
  <goal>[One sentence goal]</goal>
  <status>planning</status>
  <progress>0</progress>

  <philosophy>
    [Key insights and approach - natural language]
  </philosophy>

  <critical_path>
    [Dependencies and sequence - natural language with diagram]
  </critical_path>

  <success_criteria>
    [EXPLICIT, VERIFIABLE criteria - no vague words like "works" or "correct"]
    - Query/Action → Exact expected outcome
    - Condition → Observable result
  </success_criteria>

  <epics>
    <epic id="[id]" status="todo" progress="0" blocks="">
      [Description]
      Link: ../epics/epic-[init]-[epic].md
    </epic>
  </epics>

  <changelog>
    <entry date="YYYY-MM-DD" epic="[epic]">
      [Description of change]
    </entry>
  </changelog>
</initiative>
```

### Epic Template

```xml
<epic>
  <name>[Name]</name>
  <initiative>../initiatives/INITIATIVE-[name].md</initiative>
  <tasks>../tasks/tasks-[init]-[epic].json</tasks>
  <status>todo</status>

  <summary>
    [2-3 sentences describing the epic]
  </summary>

  <problem>
    <current_state>
      [What exists now - natural language]
    </current_state>
    <impact>
      [Why this matters - natural language]
    </impact>
  </problem>

  <requirements>
    <requirement id="FR-1">
      <title>[Requirement Name]</title>
      [Description with bullet points]
    </requirement>
  </requirements>

  <acceptance_criteria>
    [EXPLICIT, VERIFIABLE criteria]
    - [ ] Query/Action → Exact expected outcome
    - [ ] Condition → Observable result
  </acceptance_criteria>

  <technical_notes>
    [Implementation guidance]
  </technical_notes>

  <out_of_scope>
    [What this epic does NOT include]
  </out_of_scope>
</epic>
```

## Acceptance Criteria Writing Rules

Every criterion MUST be unambiguous and verifiable. NO vague words.

**BAD (vague):**
- "Feature works correctly"
- "Navigation matches spec"
- "Page displays properly"

**GOOD (explicit):**
- "Query `SELECT type FROM tasks LIMIT 1` executes without error"
- "Mobile (375px): Bottom nav shows exactly 5 icons in order: Focus, Today, Blocks, Ideas, Browse"
- "Navigate to /bucket → Page shows tasks where project_id IS NULL"

## Output

After human approval:
- Initiative file: `docs/initiatives/INITIATIVE-[name].md`
- Epic files: `docs/epics/epic-[init]-[epic].md` (one per epic)
- Next step: Run `/implement` for each epic