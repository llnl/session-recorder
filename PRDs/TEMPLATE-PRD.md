# PRD Template Guide

This guide defines the standard structure for Product Requirements Documents (PRDs).

---

## File Naming Convention

```
PRD-{project-name}.md
```

Example: `PRD-session-recorder.md`, `PRD-user-authentication.md`

---

## Required Sections

### 1. Header

```markdown
# {Project Name} - Product Requirements Document

**Version:** {X.Y}
**Last Updated:** {Month YYYY}
**Status:** {Draft | Review | Approved | Deprecated}

---
```

### 2. Executive Summary

One paragraph (3-5 sentences) summarizing:
- What the product/feature is
- Primary value proposition
- Key capabilities
- Target outcome

```markdown
## Executive Summary

{Product Name} is a {category} that {primary function} to enable {outcome}.
The system prioritizes {key differentiator} to balance {tradeoff A} with {tradeoff B}.
```

### 3. Problem Statement

Describe the business problem being solved:
- Current pain points (bulleted list)
- Impact of not solving
- Why now?

```markdown
## Problem Statement

{Context paragraph explaining the problem domain}

- {Pain point 1}
- {Pain point 2}
- {Pain point 3}

{Concluding statement about the solution approach}
```

### 4. Target Users

Table format with roles and primary use cases:

```markdown
## Target Users

| Role | Primary Use Cases |
|------|-------------------|
| **{Role 1}** | {Use case description} |
| **{Role 2}** | {Use case description} |
```

### 5. Use Cases (UC-X)

Detailed scenarios for each primary workflow:

```markdown
## Use Cases

### UC-1: {Use Case Name}

**Actor:** {Primary user role}
**Duration:** {Typical time range}
**Scenario:** {Narrative description of the workflow}

**Requirements:**
- {Requirement 1}
- {Requirement 2}
- {Requirement 3}
```

### 6. Functional Requirements (FR-X)

Organized by feature area with sub-sections:

```markdown
## Functional Requirements

### FR-1: {Feature Area}

{Brief description of what this feature area covers}

#### FR-1.1: {Sub-feature}

| {Column 1} | {Column 2} | {Column 3} |
|------------|------------|------------|
| {Data}     | {Data}     | {Data}     |

**{Additional context header}:**
- {Detail 1}
- {Detail 2}
```

### 7. Technical Requirements (TR-X)

Implementation specifications with code examples:

```markdown
## Technical Requirements

### TR-1: {Technical Area}

#### TR-1.1: {Specific Requirement}

{Description of the technical requirement}

**Expected {metric}:** {value}

\`\`\`typescript
// Implementation reference
{code example}
\`\`\`
```

### 8. Implementation Specifications (IS-X)

Full code examples for complex implementations:

```markdown
## Implementation Specifications

### IS-1: {Module Name}

\`\`\`typescript
// {filename}.ts

{Full implementation code with comments}
\`\`\`
```

### 9. Data Schema

TypeScript interfaces for data structures:

```markdown
## Data Schema

### {Schema Name}

\`\`\`typescript
interface {InterfaceName} {
  field: type;
  // ...
}
\`\`\`
```

### 10. Quality Attributes (QA-X)

Non-functional requirements:

```markdown
## Quality Attributes

### QA-1: {Attribute Name}

- {Requirement with specific measurable target}
- {Requirement with specific measurable target}
```

### 11. Future Considerations

Out of scope items and potential enhancements:

```markdown
## Future Considerations

### Not In Scope (v1)

| Feature | Rationale |
|---------|-----------|
| {Feature} | {Why it's excluded} |

### Potential v2 Features

- {Feature idea 1}
- {Feature idea 2}
```

### 12. Appendices (Optional)

Reference tables, calculations, detailed specifications:

```markdown
## Appendix A: {Title}

### {Sub-section}

| {Column} | {Column} | {Column} |
|----------|----------|----------|
| {Data}   | {Data}   | {Data}   |
```

---

## Formatting Guidelines

### Tables

Use tables for:
- Comparing options
- Listing events/fields with properties
- User roles and use cases
- Size/performance estimates

### Code Examples

Include TypeScript code examples for:
- Data interfaces
- Key algorithms
- Implementation patterns

Use `// Implementation reference` comments to indicate examples.

### Numbering Convention

- **UC-X**: Use Cases
- **FR-X**: Functional Requirements (FR-X.Y for sub-requirements)
- **TR-X**: Technical Requirements (TR-X.Y for sub-requirements)
- **IS-X**: Implementation Specifications
- **QA-X**: Quality Attributes

### Priority Indicators

Use in tables:
- `Required` - Must have for MVP
- `Optional` - Nice to have
- `Future` - Out of scope for current version

### Section Separators

Use `---` between major sections for visual clarity.

---

## Checklist

Before finalizing a PRD, ensure:

- [ ] Executive summary is clear and concise
- [ ] Problem statement identifies real pain points
- [ ] All target users are identified
- [ ] Use cases cover primary workflows
- [ ] Functional requirements are specific and testable
- [ ] Technical requirements include implementation guidance
- [ ] Code examples are syntactically correct
- [ ] Data schemas are complete
- [ ] Quality attributes have measurable targets
- [ ] Future considerations document scope boundaries
