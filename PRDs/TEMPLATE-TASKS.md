# TASKS Template Guide

This guide defines the standard structure for TASKS tracking documents.

---

## File Naming Convention

```
TASKS-{project-name}.md          # Main consolidated tasks
TASKS-{project-name}-{phase}.md  # Phase-specific tasks (optional)
```

Examples:
- `TASKS-session-recorder.md` (main)
- `TASKS-performance.md` (phase-specific)
- `TASKS-snapshot-styling.md` (phase-specific)

---

## Required Sections

### 1. Header

```markdown
# {Project Name} - {Document Type} Tasks

**PRD:** [{PRD filename}]({PRD filename})
**Last Updated:** {YYYY-MM-DD}
**Overall Status:** ~{X}% Complete {(brief description)}

---
```

### 2. Table of Contents

Link to all major sections:

```markdown
## Table of Contents

- [FR-1: {Feature Area}](#fr-1-feature-area)
- [FR-2: {Feature Area}](#fr-2-feature-area)
- [Technical Requirements](#technical-requirements)
- [Known Issues & Blockers](#known-issues--blockers)
- [Estimated Effort](#estimated-effort)
```

### 3. Functional Requirement Sections (FR-X)

Each FR section from the PRD gets a corresponding TASKS section:

```markdown
---

## FR-1: {Feature Area}

> **PRD Reference:** [FR-1: {Feature Area}]({PRD-file}.md#fr-1-feature-area)

### FR-1.1: {Sub-feature} {STATUS_INDICATOR}

> [PRD: FR-1.1]({PRD-file}.md#fr-11-sub-feature)

- [x] {Completed task description}
- [x] {Completed task description}
- [ ] {Incomplete task description}

**Implementation:** [{filename}](../path/to/file.ts)
```

### 4. Technical Requirements Sections (TR-X)

```markdown
---

## Technical Requirements

> **PRD Reference:** [Technical Requirements]({PRD-file}.md#technical-requirements)

### TR-1: {Technical Area} {STATUS_INDICATOR}

> [PRD: TR-1]({PRD-file}.md#tr-1-technical-area)

- [x] {Completed task}
- [ ] {Incomplete task}

**Current Impact:** {Description of current state vs target}

| {Metric} | PRD Target | Current (approx.) |
|----------|------------|-------------------|
| {Item}   | {Value}    | {Value}           |

**Task File:** [{related-tasks-file}]({filename}.md) (~{X}h)
```

### 5. Known Issues & Blockers

Organized by priority:

```markdown
---

## Known Issues & Blockers

### Critical Priority

**1. {Issue Title}**

- [ ] {Specific problem or task}
- [ ] {Specific problem or task}

**Task:** [{related-tasks-file}]({filename}.md)

### Medium Priority

**2. {Issue Title}**

- [ ] {Specific problem or task}

### Low Priority

**3. {Issue Title}**

- [ ] {Specific problem or task}
```

### 6. Estimated Effort

```markdown
---

## Estimated Effort

### Completed Phases ✅

| Phase | Task File | Hours | Status |
|-------|-----------|-------|--------|
| {Phase Name} | {TASKS-file.md} | {X}h | ✅ Complete |
| {Phase Name} | {TASKS-file.md} | {X}h | ✅ Phase 1-2 |
| **Completed Total** | | **{X}h** | |

### Remaining Work

| Phase | Task File | Hours | Priority |
|-------|-----------|-------|----------|
| {Phase Name} | {TASKS-file.md} | {X}h | 🔴 HIGH |
| {Phase Name} | {TASKS-file.md} | {X}h | 🟡 MEDIUM |
| {Phase Name} | {TASKS-file.md} | {X}h | 🟢 LOW |
| **Remaining Total** | | **~{X}h** | |

### Summary

| Category | Hours |
|----------|-------|
| Completed | {X}h |
| Remaining | ~{X}h |
| **Grand Total** | **~{X}h** |
```

### 7. Implementation Priority

Time-boxed priority sections:

```markdown
---

## Implementation Priority

### Immediate (This Week)

1. **{Task}** - {TASKS-file.md} ({X}h)
2. **{Task}** - {TASKS-file.md} ({X}h)

### Short-Term (Next 2 Weeks)

3. **{Task}** - {description} ({X}h)
4. **{Task}** - {description} ({X}h)

### Medium-Term (Next Month)

5. **{Task}** - {TASKS-file.md} ({X}h)

### Long-Term (Backlog)

6. **{Task}** - {TASKS-file.md} ({X}h)
```

### 8. File Reference

```markdown
---

## File Reference

### {Component Category}

- [{filename}](../path/to/file.ts) - {Brief description}
- [{filename}](../path/to/file.ts) - {Brief description}

### {Component Category}

- [{directory}/](../path/to/directory/) - {Brief description}
```

### 9. Document Change Log

```markdown
---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | {YYYY-MM-DD} | Initial document |
| 1.1 | {YYYY-MM-DD} | {Change description} |
```

---

## Status Indicators

Use these status indicators in section headers:

| Indicator | Meaning | When to Use |
|-----------|---------|-------------|
| `✅ COMPLETE` | All tasks done | 100% of checkboxes checked |
| `⚠️ PARTIAL` | Some tasks done | 50-99% of checkboxes checked |
| `❌ NOT STARTED` | No tasks done | 0% of checkboxes checked |
| `❌ NOT COMPLETE` | Work began but blocked | Tasks started but significant gaps |

## Priority Indicators

Use in Estimated Effort and Priority sections:

| Emoji | Priority | Description |
|-------|----------|-------------|
| 🔴 | HIGH | Critical path, blocking other work |
| 🟡 | MEDIUM | Important but not blocking |
| 🟢 | LOW | Nice to have, can be deferred |

---

## Checkbox Syntax

```markdown
- [x] Completed task
- [ ] Incomplete task
```

**Rules:**
- One checkbox per discrete, verifiable task
- Tasks should be atomic (can be completed independently)
- Include specific details (not just "implement feature")
- Group related tasks under sub-sections

---

## PRD Linking Convention

Every section that corresponds to a PRD requirement should include:

1. **Section-level blockquote** with bold "PRD Reference":
```markdown
> **PRD Reference:** [FR-1: Event Capture](PRD-session-recorder.md#fr-1-event-capture)
```

2. **Sub-section blockquote** with "PRD: FR-X.Y":
```markdown
> [PRD: FR-1.1](PRD-session-recorder.md#fr-11-mouse-events)
```

**Anchor format:** `#fr-{number}-{kebab-case-title}`

Examples:
- `#fr-1-event-capture`
- `#fr-11-mouse-events` (no dot, just numbers)
- `#tr-1-compression`

---

## Implementation Links

Always include links to implementation files:

```markdown
**Implementation:** [actionListener.ts](../src/browser/actionListener.ts)
```

For multiple files:
```markdown
**Implementation:** [SessionRecorder.ts](../src/node/SessionRecorder.ts)
**Reference:** [actions-recorded.md](../docs/actions-recorded.md)
```

For related task files:
```markdown
**Task File:** [TASKS-performance.md](TASKS-performance.md) Sprint 5c (~2h remaining)
```

---

## Best Practices

### Task Granularity

**Good:**
- `- [x] Capture `click` events with coordinates`
- `- [ ] Implement gzip compression for DOM snapshots`

**Bad:**
- `- [ ] Implement event capture` (too vague)
- `- [x] Add click handler to document with capture phase that extracts clientX, clientY, button type, and modifier keys` (too detailed)

### Section Organization

1. Mirror PRD structure (FR-1, FR-2, etc.)
2. Add sub-sections as needed for implementation phases
3. Group related implementation tasks together
4. Separate "what to build" from "known issues"

### Keeping Tasks Updated

- Mark tasks complete immediately when done
- Update status indicators when section completion changes
- Add new tasks as they're discovered
- Move completed phase-specific TASKS files to an archive or mark as complete
- Update "Last Updated" date with each significant change

---

## Checklist

Before finalizing a TASKS document:

- [ ] Header includes PRD link and status percentage
- [ ] Table of contents links work correctly
- [ ] All PRD sections have corresponding TASKS sections
- [ ] PRD reference links use correct anchor format
- [ ] Status indicators match actual completion state
- [ ] Implementation file links are relative and correct
- [ ] Estimated effort tables are complete
- [ ] Priority sections are time-boxed appropriately
- [ ] Change log is updated
