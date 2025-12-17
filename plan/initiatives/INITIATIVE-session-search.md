# Initiative: Session Search (MCP Server)

<initiative>
  <name>session-search</name>
  <status>tested</status>
  <goal>MCP server enabling AI assistants to control recording and search session data</goal>
  <description>
    A Model Context Protocol server with 20 tools that enables AI coding assistants (Claude Code, Cline,
    Continue.dev) to start/stop recordings and query session data. Provides text-based data optimized
    for AI context windows.
  </description>

  <epics>
    <epic id="recording" status="tested" blocks="">Recording Control (PRD-MCP.md Phase 1)</epic>
    <epic id="query" status="tested" blocks="">Session Query (PRD-MCP.md Phase 2)</epic>
  </epics>

  <success_criteria>
    <criterion status="done">5 recording control tools working</criterion>
    <criterion status="done">15 session query tools working</criterion>
    <criterion status="done">Claude Code compatible</criterion>
    <criterion status="done">Markdown export tools</criterion>
    <criterion status="done">Response time under 500ms</criterion>
  </success_criteria>
</initiative>

---

## Epic Summary

| Epic | Status | Tasks File | Description |
|------|--------|------------|-------------|
| [recording](../epics/epic-search-recording.md) | tested | [tasks](../tasks/tasks-search-recording.json) | Start/stop browser/voice/combined recording |
| [query](../epics/epic-search-query.md) | tested | [tasks](../tasks/tasks-search-query.json) | Load, search, get actions, timeline, errors |

---

## Technical Architecture

```
mcp-server/
├── src/
│   ├── index.ts                # Entry point
│   ├── server.ts               # MCP server setup
│   │
│   ├── tools/
│   │   ├── recording/          # Phase 1: Recording Control
│   │   │   ├── startBrowserRecording.ts
│   │   │   ├── startVoiceRecording.ts
│   │   │   ├── startCombinedRecording.ts
│   │   │   ├── stopRecording.ts
│   │   │   └── getRecordingStatus.ts
│   │   │
│   │   └── query/              # Phase 2: Session Query
│   │       ├── sessionLoad.ts
│   │       ├── sessionSearch.ts
│   │       ├── sessionGetSummary.ts
│   │       ├── sessionGetActions.ts
│   │       ├── sessionGetAction.ts
│   │       ├── sessionGetRange.ts
│   │       ├── sessionGetUrls.ts
│   │       ├── sessionGetErrors.ts
│   │       ├── sessionGetTimeline.ts
│   │       ├── sessionGetContext.ts
│   │       ├── sessionSearchNetwork.ts
│   │       ├── sessionSearchConsole.ts
│   │       ├── sessionGetMarkdown.ts
│   │       └── sessionRegenerateMarkdown.ts
│   │
│   └── recording/
│       └── RecordingManager.ts # State management
│
└── package.json
```

---

## MCP Tools (20 Total)

### Recording Control (5 tools)

| Tool | Description |
|------|-------------|
| start_browser_recording | Start browser session recording |
| start_voice_recording | Start voice-only recording |
| start_combined_recording | Start browser + voice recording |
| stop_recording | Stop active recording, create zip |
| get_recording_status | Get current recording status |

### Session Query (15 tools)

| Tool | Description |
|------|-------------|
| session_load | Load session.zip into memory |
| session_unload | Unload session from memory |
| session_search | Full-text search across content |
| session_get_summary | High-level overview |
| session_get_actions | Filtered action list |
| session_get_action | Single action details |
| session_get_range | Sequence of actions |
| session_get_urls | URL navigation structure |
| session_get_errors | Console and network errors |
| session_get_timeline | Chronological timeline |
| session_get_context | Context around action |
| session_search_network | Search network requests |
| session_search_console | Search console logs |
| session_get_markdown | Get pre-generated markdown |
| session_regenerate_markdown | Regenerate markdown files |

---

## Use Cases

### UC-1: Record Browser Session
```
Developer: "Record my browser session testing the login flow"
AI: *calls start_browser_recording*
-> Browser opens, developer interacts
Developer: "Stop recording"
AI: *calls stop_recording*
-> Returns zip path + viewer URL
```

### UC-2: Analyze Recorded Session
```
Developer: "Analyze the session at /output/session-xxx.zip"
AI: *calls session_load*
AI: *calls session_get_summary*
AI: *calls session_search("error")*
-> Returns analysis with found issues
```

### UC-3: Generate Bug Report
```
Developer: "Generate a bug report from this session"
AI: *calls session_load*
AI: *calls session_get_errors*
AI: *calls session_get_timeline*
-> AI generates structured bug report
```

---

## Configuration

### Claude Code (~/.claude/claude_desktop_config.json)
```json
{
  "mcpServers": {
    "session-search": {
      "command": "node",
      "args": ["/path/to/session-recorder/mcp-server/dist/index.js"]
    }
  }
}
```

---

## Original PRD References

| PRD | Status | Key Features |
|-----|--------|--------------|
| PRDs/PRD-MCP.md | Complete | All 20 MCP tools |

---

## Change Log (from original PRDs)

| Date | Source | Changes |
|------|--------|---------|
| 2025-12-06 | PRD-MCP.md | Initial PRD for MCP Server (Recording Control) |
| 2025-12-06 | TASKS-MCP.md | Initial task breakdown for MCP Server |
| 2025-12-10 | PRD-MCP.md | Added Phase 2: Session Query MCP Server (12 tools) |
| 2025-12-11 | TASKS-MCP.md | Phase 2 (Session Query) complete - 13 tools implemented |
| 2025-12-11 | TASKS-MCP.md | Phase 1 (Recording Control) complete - 5 tools added |
| 2025-12-11 | PRD-MCP.md | Removed headless option from recording tools |
| 2025-12-13 | TASKS-MCP.md | Added 2 markdown tools (session_get_markdown, session_regenerate_markdown). Total: 20 tools |
