# Epic: MCP Server

<epic>
  <id>search-mcp</id>
  <initiative>session-search</initiative>
  <status>tested</status>
  <name>Session Search MCP Server</name>
  <goal>MCP server enabling AI assistants to control recording and search session data</goal>
  <original_prd>PRDs/PRD-MCP.md</original_prd>
  <original_tasks>PRDs/TASKS-MCP.md</original_tasks>

  <requirements>
    <requirement id="Phase1" status="done">Recording Control - 5 tools for start/stop recording</requirement>
    <requirement id="Phase2" status="done">Session Query - 15 tools for searching and analyzing sessions</requirement>
  </requirements>

  <dependencies>
    <dependency type="epic">recorder-core</dependency>
    <dependency type="epic">recorder-voice</dependency>
  </dependencies>
</epic>

---

## Overview

This epic implements a Model Context Protocol server with 20 tools that enables AI coding assistants to start/stop recordings and query session data.

## Key Files

| Component | File | Purpose |
|-----------|------|---------|
| Server Entry | mcp-server/src/index.ts | MCP server entry point |
| Recording Tools | mcp-server/src/tools/recording/ | Start/stop tools |
| Query Tools | mcp-server/src/tools/query/ | Search/analyze tools |
| Recording Manager | mcp-server/src/recording/RecordingManager.ts | State management |

## MCP Tools (20 Total)

### Recording Control (5 tools)
- start_browser_recording
- start_voice_recording
- start_combined_recording
- stop_recording
- get_recording_status

### Session Query (15 tools)
- session_load, session_unload
- session_search, session_get_summary
- session_get_actions, session_get_action
- session_get_range, session_get_urls
- session_get_errors, session_get_timeline
- session_get_context
- session_search_network, session_search_console
- session_get_markdown, session_regenerate_markdown

---

## Change Log (from TASKS-MCP.md)

| Date | Changes |
|------|---------|
| 2025-12-06 | Initial task breakdown for MCP Server |
| 2025-12-10 | Updated to follow template, added Table of Contents |
| 2025-12-11 | Phase 2 (Session Query) complete - 13 tools implemented in mcp-server/ |
| 2025-12-11 | Phase 1 (Recording Control) complete - 5 tools added |
| 2025-12-11 | Removed headless option from recording tools |
| 2025-12-13 | Added 2 markdown tools. Total: 20 tools |
