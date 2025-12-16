#!/usr/bin/env node
/**
 * Session Search MCP Server
 *
 * An MCP server that enables AI assistants to search and analyze
 * recorded browser sessions from session.zip files, as well as
 * control live recording sessions.
 *
 * Phase 1 - Recording Control (5 tools):
 * - start_browser_recording: Start browser-only recording
 * - start_voice_recording: Start voice-only recording
 * - start_combined_recording: Start browser + voice recording
 * - stop_recording: Stop current recording and create zip
 * - get_recording_status: Get current recording status
 *
 * Phase 2 - Session Query (15 tools):
 * - session_load: Load a session.zip into memory
 * - session_unload: Unload a session from memory
 * - session_get_summary: Get detailed session summary
 * - session_search: Full-text search across session content
 * - session_get_actions: Get filtered list of actions
 * - session_get_action: Get details of a single action
 * - session_get_range: Get a range of actions with context
 * - session_get_urls: Get URL navigation structure
 * - session_get_context: Get context around an action
 * - session_get_timeline: Get chronological timeline
 * - session_get_errors: Get all errors (console + network)
 * - session_search_network: Search network requests
 * - session_search_console: Search console logs
 * - session_get_markdown: Get pre-generated markdown summaries
 * - session_regenerate_markdown: Regenerate markdown exports
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SessionStore } from './SessionStore';
import { RecordingManager } from './RecordingManager';
import * as tools from './tools';

// Initialize session store and recording manager
const store = new SessionStore();
const recordingManager = new RecordingManager();

// Create MCP server
const server = new Server(
  {
    name: 'session-search-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tool schemas
const toolDefinitions = [
  // Phase 1: Recording Control Tools
  {
    name: 'start_browser_recording',
    description: 'Start recording a browser session. Opens a new browser window and captures all user interactions (clicks, inputs, navigation). Returns session ID for tracking.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Optional title for the recording session (used in filename)',
        },
        url: {
          type: 'string',
          description: 'Optional URL to navigate to after browser opens',
        },
        browserType: {
          type: 'string',
          enum: ['chromium', 'firefox', 'webkit'],
          description: 'Browser engine to use (default: chromium)',
        },
      },
    },
  },
  {
    name: 'start_voice_recording',
    description: 'Start voice-only recording. Captures audio from microphone with automatic transcription via Whisper. No browser window is opened.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Optional title for the recording session',
        },
        whisperModel: {
          type: 'string',
          enum: ['tiny', 'base', 'small', 'medium', 'large'],
          description: 'Whisper model size for transcription (default: base). Larger = more accurate but slower.',
        },
      },
    },
  },
  {
    name: 'start_combined_recording',
    description: 'Start combined browser + voice recording. Opens a browser and records both user interactions and voice narration. Recommended for capturing complete session context.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Optional title for the recording session',
        },
        url: {
          type: 'string',
          description: 'Optional URL to navigate to after browser opens',
        },
        browserType: {
          type: 'string',
          enum: ['chromium', 'firefox', 'webkit'],
          description: 'Browser engine to use (default: chromium)',
        },
        whisperModel: {
          type: 'string',
          enum: ['tiny', 'base', 'small', 'medium', 'large'],
          description: 'Whisper model size for transcription (default: base)',
        },
      },
    },
  },
  {
    name: 'stop_recording',
    description: 'Stop the current recording session (browser and/or voice). Creates a session.zip archive and returns the file path. Call get_recording_status first to check if a recording is active.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'get_recording_status',
    description: 'Get the current recording status. Returns whether a recording is active, session ID, mode (browser/voice/combined), duration, action count, and last completed session info.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  // Phase 2: Session Query Tools
  {
    name: 'session_load',
    description: 'Load a session.zip file or session directory into memory for querying. Returns session overview including duration, action count, URLs, and summary statistics.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'Path to session.zip file or unzipped session directory',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'session_unload',
    description: 'Unload a session from memory to free resources',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID to unload',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'session_get_summary',
    description: 'Get detailed summary of a loaded session including action counts by type, URLs visited, transcript preview, and detected features',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID (from session_load)',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'session_search',
    description: 'Full-text search across all text content in the session: voice transcripts, descriptions, input values, and URLs',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
        query: {
          type: 'string',
          description: 'Search query string',
        },
        searchIn: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['transcript', 'descriptions', 'notes', 'values', 'urls'],
          },
          description: 'Fields to search in (default: all)',
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return (default: 10, max: 50)',
        },
      },
      required: ['sessionId', 'query'],
    },
  },
  {
    name: 'session_get_actions',
    description: 'Get a list of actions with optional filtering by type or URL. Returns action summaries with pagination support.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
        types: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['click', 'input', 'change', 'submit', 'keydown', 'navigation', 'voice_transcript'],
          },
          description: 'Filter by action types',
        },
        url: {
          type: 'string',
          description: 'Filter by URL (partial match)',
        },
        startIndex: {
          type: 'number',
          description: 'Start index for pagination (default: 0)',
        },
        limit: {
          type: 'number',
          description: 'Max actions to return (default: 20, max: 100)',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'session_get_action',
    description: 'Get full details of a single action including action details, URL, voice context, and more',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
        actionId: {
          type: 'string',
          description: 'Action ID to retrieve',
        },
      },
      required: ['sessionId', 'actionId'],
    },
  },
  {
    name: 'session_get_range',
    description: 'Get a range of actions between two action IDs with combined context including all voice transcripts, descriptions, and URLs in the range',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
        startId: {
          type: 'string',
          description: 'Start action ID',
        },
        endId: {
          type: 'string',
          description: 'End action ID',
        },
      },
      required: ['sessionId', 'startId', 'endId'],
    },
  },
  {
    name: 'session_get_urls',
    description: 'Get URL navigation structure showing all unique URLs visited, visit counts, and action counts per URL',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'session_get_context',
    description: 'Get context window around a specific action including actions before/after and nearby voice transcripts',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
        actionId: {
          type: 'string',
          description: 'Center action ID',
        },
        before: {
          type: 'number',
          description: 'Number of actions before (default: 3)',
        },
        after: {
          type: 'number',
          description: 'Number of actions after (default: 3)',
        },
      },
      required: ['sessionId', 'actionId'],
    },
  },
  {
    name: 'session_get_timeline',
    description: 'Get chronological interleaved timeline of all events (actions, voice, errors) with optional time filtering',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
        startTime: {
          type: 'string',
          description: 'Start time filter (ISO 8601)',
        },
        endTime: {
          type: 'string',
          description: 'End time filter (ISO 8601)',
        },
        limit: {
          type: 'number',
          description: 'Max entries (default: 50, max: 200)',
        },
        offset: {
          type: 'number',
          description: 'Offset for pagination',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'session_get_errors',
    description: 'Get all errors from the session including console errors/warnings and HTTP errors (4xx, 5xx)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'session_search_network',
    description: 'Search network requests with optional filters for URL pattern, HTTP method, status code, and content type',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
        urlPattern: {
          type: 'string',
          description: 'Regex pattern to match URLs',
        },
        method: {
          type: 'string',
          description: 'HTTP method (GET, POST, etc.)',
        },
        status: {
          type: 'number',
          description: 'HTTP status code',
        },
        contentType: {
          type: 'string',
          description: 'Content type (partial match)',
        },
        limit: {
          type: 'number',
          description: 'Max results (default: 20, max: 50)',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'session_search_console',
    description: 'Search console logs with optional filters for log level and message pattern',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID',
        },
        level: {
          type: 'string',
          enum: ['error', 'warn', 'log', 'info', 'debug'],
          description: 'Filter by log level',
        },
        pattern: {
          type: 'string',
          description: 'Regex pattern to match message',
        },
        limit: {
          type: 'number',
          description: 'Max results (default: 20, max: 50)',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'session_get_markdown',
    description: 'Get pre-generated markdown summaries from a session. Returns token-efficient markdown instead of raw JSON. Available types: transcript (voice transcript), actions (user actions with context), console (grouped console logs), network (network request summary).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID (from session_load)',
        },
        type: {
          type: 'string',
          enum: ['transcript', 'actions', 'console', 'network', 'all'],
          description: 'Type of markdown to return (default: all)',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'session_regenerate_markdown',
    description: 'Regenerate markdown exports for a session. Useful when session data has been edited or markdown files are missing. Generates: transcript.md, actions.md, console-summary.md, network-summary.md.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID (from session_load)',
        },
      },
      required: ['sessionId'],
    },
  },
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: toolDefinitions };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;

    switch (name) {
      // Phase 1: Recording Control
      case 'start_browser_recording':
        result = await tools.startBrowserRecording(recordingManager, args as {
          title?: string;
          url?: string;
          browserType?: 'chromium' | 'firefox' | 'webkit';
        });
        break;
      case 'start_voice_recording':
        result = await tools.startVoiceRecording(recordingManager, args as {
          title?: string;
          whisperModel?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
        });
        break;
      case 'start_combined_recording':
        result = await tools.startCombinedRecording(recordingManager, args as {
          title?: string;
          url?: string;
          browserType?: 'chromium' | 'firefox' | 'webkit';
          whisperModel?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
        });
        break;
      case 'stop_recording':
        result = await tools.stopRecording(recordingManager);
        break;
      case 'get_recording_status':
        result = tools.getRecordingStatus(recordingManager);
        break;
      // Phase 2: Session Query
      case 'session_load':
        result = await tools.sessionLoad(store, args as { path: string });
        break;
      case 'session_unload':
        result = tools.sessionUnload(store, args as { sessionId: string });
        break;
      case 'session_get_summary':
        result = tools.sessionGetSummary(store, args as { sessionId: string });
        break;
      case 'session_search':
        result = tools.sessionSearch(store, args as {
          sessionId: string;
          query: string;
          searchIn?: ('transcript' | 'descriptions' | 'notes' | 'values' | 'urls')[];
          limit?: number;
        });
        break;
      case 'session_get_actions':
        result = tools.sessionGetActions(store, args as {
          sessionId: string;
          types?: string[];
          url?: string;
          startIndex?: number;
          limit?: number;
        });
        break;
      case 'session_get_action':
        result = tools.sessionGetAction(store, args as {
          sessionId: string;
          actionId: string;
        });
        break;
      case 'session_get_range':
        result = tools.sessionGetRange(store, args as {
          sessionId: string;
          startId: string;
          endId: string;
        });
        break;
      case 'session_get_urls':
        result = tools.sessionGetUrls(store, args as { sessionId: string });
        break;
      case 'session_get_context':
        result = tools.sessionGetContext(store, args as {
          sessionId: string;
          actionId: string;
          before?: number;
          after?: number;
        });
        break;
      case 'session_get_timeline':
        result = tools.sessionGetTimeline(store, args as {
          sessionId: string;
          startTime?: string;
          endTime?: string;
          limit?: number;
          offset?: number;
        });
        break;
      case 'session_get_errors':
        result = tools.sessionGetErrors(store, args as { sessionId: string });
        break;
      case 'session_search_network':
        result = tools.sessionSearchNetwork(store, args as {
          sessionId: string;
          urlPattern?: string;
          method?: string;
          status?: number;
          contentType?: string;
          limit?: number;
        });
        break;
      case 'session_search_console':
        result = tools.sessionSearchConsole(store, args as {
          sessionId: string;
          level?: 'error' | 'warn' | 'log' | 'info' | 'debug';
          pattern?: string;
          limit?: number;
        });
        break;
      case 'session_get_markdown':
        result = tools.sessionGetMarkdown(store, args as {
          sessionId: string;
          type?: 'transcript' | 'actions' | 'console' | 'network' | 'all';
        });
        break;
      case 'session_regenerate_markdown':
        result = await tools.sessionRegenerateMarkdown(store, args as {
          sessionId: string;
        });
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: errorMessage }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Session Search MCP Server started');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
