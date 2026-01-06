# Session Search MCP Server

An MCP (Model Context Protocol) server that enables AI assistants to search and analyze recorded browser sessions.

## Features

- Load session.zip files or unzipped session directories
- Full-text search across voice transcripts, descriptions, input values, and URLs
- Browse actions with filtering and pagination
- Get detailed timeline with interleaved actions, voice, and errors
- Search network requests and console logs
- LRU caching for multiple sessions

## Installation

```bash
cd session-recorder/mcp-server
npm install
npm run build
```

## Usage

### With Claude Code

Add to your Claude Code MCP settings (`~/.claude/claude_desktop_config.json`):

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

### Available Tools

| Tool | Description |
|------|-------------|
| `session_load` | Load a session.zip into memory for querying |
| `session_unload` | Unload a session from memory |
| `session_get_summary` | Get detailed session summary with statistics |
| `session_search` | Full-text search across session content |
| `session_get_actions` | Get filtered list of actions with pagination |
| `session_get_action` | Get full details of a single action |
| `session_get_range` | Get a range of actions with combined context |
| `session_get_urls` | Get URL navigation structure |
| `session_get_context` | Get context window around an action |
| `session_get_timeline` | Get chronological timeline of all events |
| `session_get_errors` | Get all console and network errors |
| `session_search_network` | Search network requests |
| `session_search_console` | Search console logs |

### Example Prompts

After configuring the MCP server, you can use natural language:

- "Load the session at C:/recordings/session-123.zip and show me a summary"
- "Search for 'login' in the session transcript"
- "Show me all navigation actions"
- "What errors occurred during the session?"
- "Get the timeline from action nav-5 to nav-10"

## Development

```bash
# Build
npm run build

# Run tests
npx ts-node src/test.ts

# Run server directly (for testing)
npm start
```

## Session Data Format

The server reads session data in the following format:

```
session-XXXXX/
├── session.json       # Main session data with actions
├── transcript.json    # Voice transcription (optional)
├── session.network    # Network requests (JSON Lines)
├── session.console    # Console logs (JSON Lines)
├── screenshots/       # Action screenshots
├── snapshots/         # HTML snapshots
└── audio/             # Audio recordings (optional)
```

Or as a single `session-XXXXX.zip` file containing the above.

## Requirements

- Node.js 18+
- Session files from session-recorder

## License

MIT
