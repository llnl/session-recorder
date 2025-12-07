# OpenSearch Schema Design for Session Recorder

**Version:** 1.0
**Date:** 2025-12-06
**Status:** Design Document
**Purpose:** Enable AI-powered queries over recorded sessions for feature documentation, testing, and question answering.

---

## Executive Summary

This document defines an OpenSearch schema optimized for storing session recordings (browser actions + voice transcripts) to enable:

1. **Example Discovery**: "Show me examples of login flows"
2. **Feature Documentation**: Generate `feature_list.json` with test steps
3. **Question Answering**: "How does authentication work in this app?"
4. **Pattern Recognition**: Identify common user flows across sessions

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Session Recorder                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Browser  │  │  Voice   │  │ Network  │  │ Console  │        │
│  │ Actions  │  │Transcript│  │ Requests │  │   Logs   │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
└───────┼─────────────┼─────────────┼─────────────┼───────────────┘
        │             │             │             │
        └─────────────┴──────┬──────┴─────────────┘
                             │
                    ┌────────▼────────┐
                    │ Ingestion       │
                    │ Pipeline        │
                    │ ┌─────────────┐ │
                    │ │ Embeddings  │ │
                    │ │ (ada-002)   │ │
                    │ └─────────────┘ │
                    │ ┌─────────────┐ │
                    │ │ Intent      │ │
                    │ │ Extraction  │ │
                    │ └─────────────┘ │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐   ┌────────▼────────┐   ┌──────▼───────┐
│   sessions    │   │    actions      │   │   features   │
│   (index)     │   │    (index)      │   │   (index)    │
│               │   │                 │   │              │
│ • Metadata    │   │ • Browser acts  │   │ • Extracted  │
│ • Summary     │   │ • Voice segs    │   │   patterns   │
│ • Embeddings  │   │ • Embeddings    │   │ • Test steps │
└───────────────┘   └─────────────────┘   └──────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────▼────────┐
                    │    AI Query     │
                    │    Layer        │
                    │ (Claude/GPT)    │
                    └─────────────────┘
```

---

## Index Definitions

### 1. Sessions Index

**Purpose:** Top-level session metadata for filtering and session-level semantic search.

```json
PUT sessions
{
  "settings": {
    "index": {
      "knn": true,
      "knn.algo_param.ef_search": 100
    }
  },
  "mappings": {
    "properties": {
      "session_id": { "type": "keyword" },

      "app": {
        "properties": {
          "name": { "type": "keyword" },
          "base_url": { "type": "keyword" },
          "version": { "type": "keyword" }
        }
      },

      "timing": {
        "properties": {
          "start_time": { "type": "date" },
          "end_time": { "type": "date" },
          "duration_ms": { "type": "long" }
        }
      },

      "recording": {
        "properties": {
          "browser_enabled": { "type": "boolean" },
          "voice_enabled": { "type": "boolean" },
          "whisper_model": { "type": "keyword" },
          "language": { "type": "keyword" }
        }
      },

      "stats": {
        "properties": {
          "action_count": { "type": "integer" },
          "voice_segment_count": { "type": "integer" },
          "unique_urls": { "type": "keyword" },
          "network_request_count": { "type": "integer" },
          "console_error_count": { "type": "integer" }
        }
      },

      "content": {
        "properties": {
          "full_transcript": { "type": "text", "analyzer": "english" },
          "full_transcript_embedding": {
            "type": "knn_vector",
            "dimension": 1536,
            "method": {
              "name": "hnsw",
              "space_type": "cosinesimil",
              "engine": "nmslib"
            }
          }
        }
      },

      "ai_derived": {
        "properties": {
          "detected_features": { "type": "keyword" },
          "intent_summary": { "type": "text" },
          "intent_summary_embedding": {
            "type": "knn_vector",
            "dimension": 1536,
            "method": { "name": "hnsw", "space_type": "cosinesimil", "engine": "nmslib" }
          },
          "complexity_score": { "type": "float" },
          "is_error_session": { "type": "boolean" },
          "user_flow_type": { "type": "keyword" }
        }
      },

      "metadata": {
        "properties": {
          "recorded_by": { "type": "keyword" },
          "tags": { "type": "keyword" },
          "project": { "type": "keyword" },
          "environment": { "type": "keyword" }
        }
      }
    }
  }
}
```

**Example Document:**

```json
{
  "session_id": "session-1733500000000",
  "app": {
    "name": "auth-dashboard",
    "base_url": "https://app.example.com",
    "version": "2.1.0"
  },
  "timing": {
    "start_time": "2025-12-06T10:00:00.000Z",
    "end_time": "2025-12-06T10:05:30.000Z",
    "duration_ms": 330000
  },
  "recording": {
    "browser_enabled": true,
    "voice_enabled": true,
    "whisper_model": "base",
    "language": "en"
  },
  "stats": {
    "action_count": 15,
    "voice_segment_count": 8,
    "unique_urls": ["https://app.example.com/login", "https://app.example.com/dashboard"],
    "network_request_count": 42,
    "console_error_count": 0
  },
  "content": {
    "full_transcript": "First I'm going to click the login button. Now I'll enter my email address. After that I'll type my password and submit the form. Great, I'm now on the dashboard.",
    "full_transcript_embedding": [0.023, -0.041, ...]
  },
  "ai_derived": {
    "detected_features": ["login", "authentication", "dashboard-navigation"],
    "intent_summary": "User demonstrates the login flow from the homepage to the dashboard",
    "complexity_score": 0.3,
    "is_error_session": false,
    "user_flow_type": "happy-path"
  },
  "metadata": {
    "recorded_by": "developer@example.com",
    "tags": ["tutorial", "auth-feature"],
    "project": "auth-system",
    "environment": "staging"
  }
}
```

---

### 2. Actions Index

**Purpose:** Individual browser actions and voice segments in a unified timeline. This is the primary index for detailed queries.

```json
PUT actions
{
  "settings": {
    "index": {
      "knn": true,
      "knn.algo_param.ef_search": 100
    }
  },
  "mappings": {
    "properties": {
      "action_id": { "type": "keyword" },
      "session_id": { "type": "keyword" },
      "sequence_number": { "type": "integer" },
      "timestamp": { "type": "date" },

      "type": {
        "properties": {
          "action_type": { "type": "keyword" },
          "is_voice": { "type": "boolean" },
          "is_browser": { "type": "boolean" }
        }
      },

      "session_context": {
        "properties": {
          "app_name": { "type": "keyword" },
          "app_url": { "type": "keyword" },
          "session_tags": { "type": "keyword" }
        }
      },

      "browser": {
        "properties": {
          "element": {
            "properties": {
              "selector": { "type": "keyword" },
              "tag_name": { "type": "keyword" },
              "text_content": { "type": "text" },
              "aria_label": { "type": "text" },
              "placeholder": { "type": "text" },
              "name": { "type": "keyword" },
              "id": { "type": "keyword" },
              "class_list": { "type": "keyword" }
            }
          },
          "input_value": { "type": "text" },
          "key_pressed": { "type": "keyword" },
          "coordinates": {
            "properties": {
              "x": { "type": "integer" },
              "y": { "type": "integer" }
            }
          },
          "url": {
            "properties": {
              "before": { "type": "keyword" },
              "after": { "type": "keyword" },
              "changed": { "type": "boolean" }
            }
          },
          "viewport": {
            "properties": {
              "width": { "type": "integer" },
              "height": { "type": "integer" }
            }
          },
          "snapshots": {
            "properties": {
              "before_html": { "type": "keyword" },
              "after_html": { "type": "keyword" },
              "before_screenshot": { "type": "keyword" },
              "after_screenshot": { "type": "keyword" }
            }
          }
        }
      },

      "voice": {
        "properties": {
          "text": { "type": "text", "analyzer": "english" },
          "text_embedding": {
            "type": "knn_vector",
            "dimension": 1536,
            "method": { "name": "hnsw", "space_type": "cosinesimil", "engine": "nmslib" }
          },
          "timing": {
            "properties": {
              "start_time": { "type": "date" },
              "end_time": { "type": "date" },
              "duration_ms": { "type": "long" }
            }
          },
          "confidence": { "type": "float" },
          "language": { "type": "keyword" },
          "words": {
            "type": "nested",
            "properties": {
              "word": { "type": "keyword" },
              "start_time": { "type": "date" },
              "end_time": { "type": "date" },
              "probability": { "type": "float" }
            }
          }
        }
      },

      "context": {
        "properties": {
          "prev_action_id": { "type": "keyword" },
          "prev_action_type": { "type": "keyword" },
          "next_action_id": { "type": "keyword" },
          "next_action_type": { "type": "keyword" },
          "voice_context_before": { "type": "text" },
          "voice_context_after": { "type": "text" },
          "time_since_prev_ms": { "type": "long" },
          "time_to_next_ms": { "type": "long" }
        }
      },

      "ai_derived": {
        "properties": {
          "intent": { "type": "text" },
          "intent_embedding": {
            "type": "knn_vector",
            "dimension": 1536,
            "method": { "name": "hnsw", "space_type": "cosinesimil", "engine": "nmslib" }
          },
          "feature_tags": { "type": "keyword" },
          "step_description": { "type": "text" },
          "expected_result": { "type": "text" },
          "is_assertion_point": { "type": "boolean" },
          "test_assertion": { "type": "text" }
        }
      }
    }
  }
}
```

**Example Browser Action Document:**

```json
{
  "action_id": "action-3",
  "session_id": "session-1733500000000",
  "sequence_number": 3,
  "timestamp": "2025-12-06T10:00:15.234Z",

  "type": {
    "action_type": "click",
    "is_voice": false,
    "is_browser": true
  },

  "session_context": {
    "app_name": "auth-dashboard",
    "app_url": "https://app.example.com",
    "session_tags": ["tutorial", "auth-feature"]
  },

  "browser": {
    "element": {
      "selector": "button[type='submit']",
      "tag_name": "button",
      "text_content": "Log In",
      "aria_label": "Log in to your account",
      "name": "login-btn",
      "id": "login-button",
      "class_list": ["btn", "btn-primary", "login-btn"]
    },
    "coordinates": { "x": 450, "y": 320 },
    "url": {
      "before": "https://app.example.com/login",
      "after": "https://app.example.com/dashboard",
      "changed": true
    },
    "viewport": { "width": 1920, "height": 1080 },
    "snapshots": {
      "before_html": "snapshots/action-3-before.html",
      "after_html": "snapshots/action-3-after.html",
      "before_screenshot": "screenshots/action-3-before.png",
      "after_screenshot": "screenshots/action-3-after.png"
    }
  },

  "context": {
    "prev_action_id": "action-2",
    "prev_action_type": "input",
    "next_action_id": "voice-4",
    "next_action_type": "voice_transcript",
    "voice_context_before": "After that I'll type my password and submit the form.",
    "voice_context_after": "Great, I'm now on the dashboard.",
    "time_since_prev_ms": 2500,
    "time_to_next_ms": 800
  },

  "ai_derived": {
    "intent": "User submits login form to authenticate",
    "feature_tags": ["login", "authentication", "form-submit"],
    "step_description": "Click the Log In button to submit credentials",
    "expected_result": "User is redirected to the dashboard after successful authentication",
    "is_assertion_point": true,
    "test_assertion": "expect(page.url()).toContain('/dashboard')"
  }
}
```

**Example Voice Action Document:**

```json
{
  "action_id": "voice-2",
  "session_id": "session-1733500000000",
  "sequence_number": 2,
  "timestamp": "2025-12-06T10:00:08.500Z",

  "type": {
    "action_type": "voice_transcript",
    "is_voice": true,
    "is_browser": false
  },

  "session_context": {
    "app_name": "auth-dashboard",
    "app_url": "https://app.example.com",
    "session_tags": ["tutorial", "auth-feature"]
  },

  "voice": {
    "text": "Now I'll enter my email address in the login form.",
    "text_embedding": [0.012, -0.034, ...],
    "timing": {
      "start_time": "2025-12-06T10:00:08.500Z",
      "end_time": "2025-12-06T10:00:11.200Z",
      "duration_ms": 2700
    },
    "confidence": 0.94,
    "language": "en",
    "words": [
      { "word": "Now", "start_time": "2025-12-06T10:00:08.500Z", "end_time": "2025-12-06T10:00:08.720Z", "probability": 0.98 },
      { "word": "I'll", "start_time": "2025-12-06T10:00:08.750Z", "end_time": "2025-12-06T10:00:09.000Z", "probability": 0.95 },
      { "word": "enter", "start_time": "2025-12-06T10:00:09.050Z", "end_time": "2025-12-06T10:00:09.400Z", "probability": 0.97 }
    ]
  },

  "context": {
    "prev_action_id": "action-1",
    "prev_action_type": "click",
    "next_action_id": "action-2",
    "next_action_type": "input"
  },

  "ai_derived": {
    "intent": "User is explaining they will fill in email field",
    "feature_tags": ["login", "form-fill", "email-input"],
    "step_description": "Enter email address in login form"
  }
}
```

---

### 3. Features Index

**Purpose:** Extracted feature patterns derived from multiple sessions. Enables `feature_list.json` generation and feature documentation.

```json
PUT features
{
  "settings": {
    "index": {
      "knn": true,
      "knn.algo_param.ef_search": 100
    }
  },
  "mappings": {
    "properties": {
      "feature_id": { "type": "keyword" },
      "app_name": { "type": "keyword" },

      "identity": {
        "properties": {
          "name": { "type": "keyword" },
          "display_name": { "type": "text" },
          "category": { "type": "keyword" },
          "subcategory": { "type": "keyword" }
        }
      },

      "description": {
        "properties": {
          "short": { "type": "text" },
          "long": { "type": "text" },
          "embedding": {
            "type": "knn_vector",
            "dimension": 1536,
            "method": { "name": "hnsw", "space_type": "cosinesimil", "engine": "nmslib" }
          }
        }
      },

      "sources": {
        "properties": {
          "session_ids": { "type": "keyword" },
          "example_count": { "type": "integer" },
          "confidence_score": { "type": "float" }
        }
      },

      "steps": {
        "type": "nested",
        "properties": {
          "step_number": { "type": "integer" },
          "action_type": { "type": "keyword" },
          "description": { "type": "text" },
          "element_selector": { "type": "keyword" },
          "element_description": { "type": "text" },
          "input_example": { "type": "text" },
          "voice_narration": { "type": "text" },
          "expected_result": { "type": "text" },
          "screenshot_path": { "type": "keyword" }
        }
      },

      "testing": {
        "properties": {
          "preconditions": { "type": "text" },
          "postconditions": { "type": "text" },
          "test_assertions": { "type": "text" },
          "test_data_requirements": { "type": "text" },
          "edge_cases": { "type": "text" }
        }
      },

      "documentation": {
        "properties": {
          "markdown": { "type": "text" },
          "user_story": { "type": "text" },
          "acceptance_criteria": { "type": "text" }
        }
      },

      "relationships": {
        "properties": {
          "related_features": { "type": "keyword" },
          "depends_on": { "type": "keyword" },
          "enables": { "type": "keyword" }
        }
      },

      "timestamps": {
        "properties": {
          "first_seen": { "type": "date" },
          "last_seen": { "type": "date" },
          "updated_at": { "type": "date" }
        }
      }
    }
  }
}
```

**Example Feature Document:**

```json
{
  "feature_id": "auth-dashboard:login",
  "app_name": "auth-dashboard",

  "identity": {
    "name": "login",
    "display_name": "User Login",
    "category": "authentication",
    "subcategory": "credentials"
  },

  "description": {
    "short": "User authentication via email and password",
    "long": "Allows users to authenticate to the application using their email address and password. Upon successful login, users are redirected to the main dashboard.",
    "embedding": [0.015, -0.028, ...]
  },

  "sources": {
    "session_ids": ["session-1733500000000", "session-1733500100000", "session-1733500200000"],
    "example_count": 3,
    "confidence_score": 0.92
  },

  "steps": [
    {
      "step_number": 1,
      "action_type": "navigate",
      "description": "Navigate to the login page",
      "expected_result": "Login form is displayed",
      "voice_narration": "First I'm going to click the login button on the homepage"
    },
    {
      "step_number": 2,
      "action_type": "input",
      "description": "Enter email address",
      "element_selector": "input[name='email']",
      "element_description": "Email input field",
      "input_example": "user@example.com",
      "voice_narration": "Now I'll enter my email address"
    },
    {
      "step_number": 3,
      "action_type": "input",
      "description": "Enter password",
      "element_selector": "input[name='password']",
      "element_description": "Password input field",
      "input_example": "********",
      "voice_narration": "After that I'll type my password"
    },
    {
      "step_number": 4,
      "action_type": "click",
      "description": "Click the Log In button",
      "element_selector": "button[type='submit']",
      "element_description": "Login submit button",
      "expected_result": "User is redirected to dashboard",
      "voice_narration": "and submit the form",
      "screenshot_path": "features/login/step-4-after.png"
    }
  ],

  "testing": {
    "preconditions": "User has a valid account with email and password",
    "postconditions": "User is authenticated and on the dashboard",
    "test_assertions": [
      "expect(page.url()).toContain('/dashboard')",
      "expect(page.locator('.user-profile')).toBeVisible()"
    ],
    "test_data_requirements": "Valid user credentials (email, password)",
    "edge_cases": [
      "Invalid email format",
      "Incorrect password",
      "Account locked after multiple failures",
      "Session timeout"
    ]
  },

  "documentation": {
    "markdown": "## User Login\n\nThe login feature allows users to authenticate...",
    "user_story": "As a user, I want to log in with my email and password so that I can access my dashboard",
    "acceptance_criteria": [
      "User can enter email and password",
      "Invalid credentials show error message",
      "Successful login redirects to dashboard"
    ]
  },

  "relationships": {
    "related_features": ["logout", "password-reset", "signup"],
    "depends_on": [],
    "enables": ["dashboard-access", "profile-management"]
  },

  "timestamps": {
    "first_seen": "2025-12-06T10:00:00.000Z",
    "last_seen": "2025-12-06T15:30:00.000Z",
    "updated_at": "2025-12-06T15:35:00.000Z"
  }
}
```

---

## Query Patterns

### 1. Find Sessions Similar to a Description

**Use Case:** "Show me examples of login flows"

```json
GET sessions/_search
{
  "size": 5,
  "query": {
    "knn": {
      "content.full_transcript_embedding": {
        "vector": [/* embedding of "login flow examples" */],
        "k": 5
      }
    }
  },
  "_source": ["session_id", "ai_derived.intent_summary", "metadata.tags"]
}
```

### 2. Generate feature_list.json

**Use Case:** Export all features for an app

```json
GET features/_search
{
  "size": 100,
  "query": {
    "term": { "app_name": "auth-dashboard" }
  },
  "_source": ["identity", "description.short", "steps", "testing.test_assertions"]
}
```

**Transform to feature_list.json:**

```json
{
  "app": "auth-dashboard",
  "features": [
    {
      "id": "login",
      "name": "User Login",
      "description": "User authentication via email and password",
      "steps": [
        { "action": "input", "element": "input[name='email']", "description": "Enter email" },
        { "action": "input", "element": "input[name='password']", "description": "Enter password" },
        { "action": "click", "element": "button[type='submit']", "description": "Submit form" }
      ],
      "test_assertions": [
        "expect(page.url()).toContain('/dashboard')"
      ]
    }
  ]
}
```

### 3. Correlate Voice with Actions

**Use Case:** Get timeline of what user said while doing actions

```json
GET actions/_search
{
  "size": 50,
  "query": {
    "term": { "session_id": "session-1733500000000" }
  },
  "sort": [{ "timestamp": "asc" }],
  "_source": ["action_id", "type", "timestamp", "browser.element.text_content", "voice.text", "context"]
}
```

### 4. Semantic Search for Intent

**Use Case:** "Find actions where user is trying to authenticate"

```json
GET actions/_search
{
  "size": 10,
  "query": {
    "bool": {
      "must": [
        {
          "knn": {
            "ai_derived.intent_embedding": {
              "vector": [/* embedding of "user authentication" */],
              "k": 10
            }
          }
        }
      ],
      "filter": [
        { "term": { "type.is_browser": true } }
      ]
    }
  }
}
```

### 5. Find All Actions for a Feature

**Use Case:** "What actions relate to the checkout feature?"

```json
GET actions/_search
{
  "size": 100,
  "query": {
    "term": { "ai_derived.feature_tags": "checkout" }
  },
  "sort": [{ "session_id": "asc" }, { "sequence_number": "asc" }]
}
```

### 6. Cross-Session Pattern Analysis

**Use Case:** "How do different users complete checkout?"

```json
GET actions/_search
{
  "size": 0,
  "query": {
    "term": { "ai_derived.feature_tags": "checkout" }
  },
  "aggs": {
    "by_session": {
      "terms": { "field": "session_id", "size": 20 },
      "aggs": {
        "action_sequence": {
          "terms": {
            "field": "type.action_type",
            "order": { "_key": "asc" }
          }
        }
      }
    }
  }
}
```

---

## Ingestion Pipeline

### Step 1: Session Complete Handler

```typescript
async function ingestSession(sessionDir: string): Promise<void> {
  // Load session data
  const sessionJson = JSON.parse(fs.readFileSync(`${sessionDir}/session.json`));
  const transcript = fs.existsSync(`${sessionDir}/transcript.json`)
    ? JSON.parse(fs.readFileSync(`${sessionDir}/transcript.json`))
    : null;

  // Generate embeddings
  const fullTranscript = extractFullTranscript(sessionJson, transcript);
  const transcriptEmbedding = await generateEmbedding(fullTranscript);
  const intentSummary = await generateIntentSummary(sessionJson, transcript);
  const intentEmbedding = await generateEmbedding(intentSummary);

  // Detect features
  const detectedFeatures = await detectFeatures(sessionJson, transcript);

  // Index session document
  await opensearch.index({
    index: 'sessions',
    id: sessionJson.sessionId,
    body: buildSessionDocument(sessionJson, transcript, {
      transcriptEmbedding,
      intentSummary,
      intentEmbedding,
      detectedFeatures
    })
  });

  // Index individual actions
  for (const action of sessionJson.actions) {
    const actionDoc = await buildActionDocument(action, sessionJson, transcript);
    await opensearch.index({
      index: 'actions',
      id: action.id,
      body: actionDoc
    });
  }
}
```

### Step 2: Embedding Generation

```typescript
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text
  });
  return response.data[0].embedding;
}
```

### Step 3: Intent Extraction

```typescript
async function generateIntentSummary(session: any, transcript: any): Promise<string> {
  const prompt = `Analyze this session recording and summarize the user's intent in 1-2 sentences.

Voice transcript: ${transcript?.text || 'None'}
Actions performed: ${session.actions.map(a => a.type).join(', ')}
URLs visited: ${[...new Set(session.actions.map(a => a.after?.url))].join(', ')}

Intent summary:`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 100
  });

  return response.choices[0].message.content;
}
```

### Step 4: Feature Extraction (Batch Job)

```typescript
async function extractFeatures(appName: string): Promise<void> {
  // Find all sessions for this app
  const sessions = await opensearch.search({
    index: 'sessions',
    body: { query: { term: { 'app.name': appName } } }
  });

  // Cluster similar action sequences
  const clusters = await clusterActionSequences(sessions.hits.hits);

  // Generate feature documents from clusters
  for (const cluster of clusters) {
    const featureDoc = await buildFeatureDocument(cluster);
    await opensearch.index({
      index: 'features',
      id: featureDoc.feature_id,
      body: featureDoc
    });
  }
}
```

---

## AI Query Interface

### Query Handler for Natural Language Questions

```typescript
async function handleQuestion(question: string, appName?: string): Promise<string> {
  // Generate embedding for the question
  const questionEmbedding = await generateEmbedding(question);

  // Search across indices
  const [sessions, actions, features] = await Promise.all([
    searchSessions(questionEmbedding, appName),
    searchActions(questionEmbedding, appName),
    searchFeatures(questionEmbedding, appName)
  ]);

  // Build context for AI
  const context = buildContext(sessions, actions, features);

  // Generate answer
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` }
    ]
  });

  return response.choices[0].message.content;
}
```

### System Prompt for AI

```
You are an AI assistant that helps answer questions about an application based on recorded user sessions.

You have access to:
1. Session recordings showing browser actions (clicks, inputs, etc.)
2. Voice transcripts from users explaining what they're doing
3. Extracted features documenting common user flows

When answering questions:
- Reference specific sessions or features when relevant
- Quote voice transcripts to show user intent
- Provide step-by-step instructions when asked "how to"
- Generate test assertions when asked about testing
- Be specific about selectors and element descriptions

If you're asked to generate a feature_list.json, output valid JSON.
If you're asked to document a feature, use markdown format.
```

---

## Use Case Examples

### Use Case 1: "Show me examples of how users log in"

```
Query → Semantic search for "login" + "authentication"
Result → List of session recordings with login flows
Output →
  - Session links with timestamp markers
  - Voice narration: "First I click the login button..."
  - Screenshot thumbnails at key points
```

### Use Case 2: "Generate feature_list.json for the checkout feature"

```
Query → GET features/_search for "checkout" feature
Transform → Convert to feature_list.json format
Output →
{
  "feature": "checkout",
  "steps": [...],
  "test_assertions": [...],
  "selectors": [...]
}
```

### Use Case 3: "Document the new password reset feature"

```
Query → Semantic search for "password reset" sessions
Aggregate → Combine voice narration + action descriptions
Output →
## Password Reset

### Steps
1. Click "Forgot Password" link
2. Enter email address
3. Check email for reset link
...

### Test Cases
- Valid email receives reset link
- Invalid email shows error
...
```

### Use Case 4: "What happens when I click the submit button?"

```
Query → Find actions with element containing "submit"
Correlate → Get before/after snapshots + surrounding voice
Output →
  - Before state: Form with filled fields
  - Action: Click submit button
  - After state: Success message / redirect
  - User said: "and submit the form"
```

---

## Performance Considerations

### Index Settings for Production

```json
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "index.knn": true,
    "index.knn.algo_param.ef_search": 100,
    "refresh_interval": "5s"
  }
}
```

### Embedding Caching

- Cache embeddings at ingest time, not query time
- Store embeddings in dedicated vector indices
- Use approximate kNN for faster searches

### Query Optimization

- Use `filter` context for exact matches (no scoring overhead)
- Limit `_source` fields to reduce data transfer
- Use aggregations for pattern analysis instead of fetching all documents

---

## Migration Path

### Phase 1: Basic Indexing
- Index sessions and actions as documents
- No embeddings yet, just keyword search

### Phase 2: Add Embeddings
- Generate embeddings for voice transcripts
- Enable semantic search

### Phase 3: Feature Extraction
- Implement batch job to extract features
- Build feature index

### Phase 4: AI Integration
- Add natural language query interface
- Implement `feature_list.json` generation

---

## Appendix: Field Mapping Reference

| Field Purpose | OpenSearch Type | Notes |
|--------------|-----------------|-------|
| IDs, selectors | `keyword` | Exact match, aggregations |
| User text, descriptions | `text` | Full-text search |
| Timestamps | `date` | Range queries, sorting |
| Numbers | `integer`, `long`, `float` | Aggregations, range |
| Booleans | `boolean` | Filtering |
| Embeddings | `knn_vector` | Semantic search |
| Word-level data | `nested` | Preserve array relationships |
