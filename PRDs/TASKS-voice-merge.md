# TASKS-Voice-Merge: Consecutive Voice Transcript Merging

**PRD:** N/A (Enhancement to [PRD-4.md](./PRD-4.md))
**Last Updated:** 2025-12-13
**Overall Status:** ✅ Complete
**Estimated Effort:** 4-6 hours

---

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Solution Design](#solution-design)
- [Implementation Tasks](#implementation-tasks)
- [File Reference](#file-reference)
- [Document Change Log](#document-change-log)

---

## Overview

Merge consecutive voice transcript actions into single combined transcripts for cleaner action lists and better user experience.

**Current Behavior:**
- Whisper produces many small transcript segments (e.g., 20 segments for 2 minutes of speech)
- Each segment becomes a separate `voice_transcript` action in session.json
- Action list shows 20 voice entries interspersed, cluttering the timeline

**Desired Behavior:**
- Consecutive voice transcripts (no browser action between them) merge into one
- Combined transcript contains all text concatenated
- Word-level timestamps preserved for playback highlighting
- Audio playback works across the entire merged segment

---

## Problem Statement

### Current Data Flow

```
Whisper Output (transcript.json)
    ↓
VoiceRecorder.convertToVoiceActions() → 20 VoiceTranscriptAction objects
    ↓
SessionRecorder._alignVoiceWithActions() → May split further around browser actions
    ↓
session.json actions[] → 20+ voice_transcript entries cluttering action list
```

### Example: Current Output

```json
{
  "actions": [
    { "id": "click-1", "type": "click", "timestamp": "10:00:00" },
    { "id": "voice-1", "type": "voice_transcript", "text": "Now I'm going to" },
    { "id": "voice-2", "type": "voice_transcript", "text": "click the submit button" },
    { "id": "voice-3", "type": "voice_transcript", "text": "to complete the form." },
    { "id": "click-2", "type": "click", "timestamp": "10:00:15" },
    { "id": "voice-4", "type": "voice_transcript", "text": "Great, that worked." },
    { "id": "voice-5", "type": "voice_transcript", "text": "Now let me check" },
    { "id": "voice-6", "type": "voice_transcript", "text": "the confirmation page." }
  ]
}
```

### Example: Desired Output

```json
{
  "actions": [
    { "id": "click-1", "type": "click", "timestamp": "10:00:00" },
    {
      "id": "voice-1",
      "type": "voice_transcript",
      "text": "Now I'm going to click the submit button to complete the form.",
      "mergedFrom": ["voice-1", "voice-2", "voice-3"]
    },
    { "id": "click-2", "type": "click", "timestamp": "10:00:15" },
    {
      "id": "voice-4",
      "type": "voice_transcript",
      "text": "Great, that worked. Now let me check the confirmation page.",
      "mergedFrom": ["voice-4", "voice-5", "voice-6"]
    }
  ]
}
```

---

## Solution Design

### Merge Algorithm

1. After `_alignVoiceWithActions()` produces the sorted action list
2. Iterate through actions, identifying consecutive `voice_transcript` runs
3. For each run of 2+ consecutive voice transcripts:
   - Concatenate text with space separator
   - Combine word arrays maintaining original timestamps
   - Use earliest startTime and latest endTime
   - Average confidence scores (weighted by word count)
   - Keep first segment's ID, track merged IDs in metadata
4. Replace the run with a single merged transcript

### Data Structure Changes

Add optional metadata to `VoiceTranscriptAction`:

```typescript
interface VoiceTranscriptAction {
  // ... existing fields ...
  transcript: {
    text: string;
    startTime: string;
    endTime: string;
    confidence: number;
    words?: Word[];
    // NEW: Merge metadata
    mergedSegments?: {
      count: number;           // Number of original segments merged
      originalIds: string[];   // Original segment IDs
    };
  };
}
```

### Implementation Location

**Option A: SessionRecorder (Server-side)** ← Recommended
- Add `_mergeConsecutiveVoice()` method after `_alignVoiceWithActions()`
- Merged data stored in session.json
- Viewer gets clean data without extra processing

**Option B: Viewer (Client-side)**
- Merge in `sessionStore.ts` when loading session
- Original granular data preserved in session.json
- More processing on each load

**Recommendation:** Option A - merge server-side for cleaner data and faster viewer loads.

---

## Implementation Tasks

### Task 1: Add Merge Method to SessionRecorder (2 hours)

**Priority:** HIGH
**File:** `src/node/SessionRecorder.ts`

#### 1.1 Create merge helper method

```typescript
/**
 * Merge consecutive voice transcript actions that have no browser actions between them.
 * This reduces clutter in the action list while preserving all word-level data for playback.
 */
private _mergeConsecutiveVoiceTranscripts(actions: AnyAction[]): AnyAction[] {
  const result: AnyAction[] = [];
  let voiceRun: VoiceTranscriptAction[] = [];

  const flushVoiceRun = () => {
    if (voiceRun.length === 0) return;

    if (voiceRun.length === 1) {
      result.push(voiceRun[0]);
    } else {
      result.push(this._mergeVoiceSegments(voiceRun));
    }
    voiceRun = [];
  };

  for (const action of actions) {
    if (action.type === 'voice_transcript') {
      voiceRun.push(action as VoiceTranscriptAction);
    } else {
      flushVoiceRun();
      result.push(action);
    }
  }

  flushVoiceRun(); // Don't forget trailing voice segments
  return result;
}
```

#### 1.2 Create segment merger

```typescript
/**
 * Merge multiple voice segments into a single combined segment.
 */
private _mergeVoiceSegments(segments: VoiceTranscriptAction[]): VoiceTranscriptAction {
  if (segments.length === 0) throw new Error('Cannot merge empty segments');
  if (segments.length === 1) return segments[0];

  const first = segments[0];
  const last = segments[segments.length - 1];

  // Concatenate text with space separator
  const combinedText = segments
    .map(s => s.transcript.text.trim())
    .join(' ');

  // Combine all word arrays (already have absolute timestamps)
  const combinedWords = segments
    .flatMap(s => s.transcript.words || []);

  // Calculate weighted average confidence
  const totalWords = combinedWords.length || segments.length;
  const weightedConfidence = segments.reduce((sum, s) => {
    const wordCount = s.transcript.words?.length || 1;
    return sum + (s.transcript.confidence * wordCount);
  }, 0) / totalWords;

  return {
    id: first.id,
    type: 'voice_transcript',
    timestamp: first.timestamp,
    transcript: {
      text: combinedText,
      startTime: first.transcript.startTime,
      endTime: last.transcript.endTime,
      confidence: weightedConfidence,
      words: combinedWords.length > 0 ? combinedWords : undefined,
      mergedSegments: {
        count: segments.length,
        originalIds: segments.map(s => s.id)
      }
    },
    audioFile: first.audioFile,
    nearestSnapshotId: first.nearestSnapshotId,
    associatedActionId: last.associatedActionId // Use last segment's association
  };
}
```

#### 1.3 Integrate into stop() method

Update the voice processing section in `stop()` (~line 1060):

```typescript
// After _alignVoiceWithActions
this.sessionData.actions = this._alignVoiceWithActions(allActions);

// NEW: Merge consecutive voice transcripts
const beforeMerge = this.sessionData.actions.filter(a => a.type === 'voice_transcript').length;
this.sessionData.actions = this._mergeConsecutiveVoiceTranscripts(this.sessionData.actions);
const afterMerge = this.sessionData.actions.filter(a => a.type === 'voice_transcript').length;

console.log(`🎙️  Voice segments: ${voiceActions.length} raw → ${beforeMerge} aligned → ${afterMerge} merged`);
```

#### Acceptance Criteria

- [x] `_mergeConsecutiveVoiceTranscripts()` method implemented
- [x] `_mergeVoiceSegments()` helper implemented
- [x] Integration in `stop()` method
- [x] Console logging shows merge statistics
- [x] Merged transcript has correct combined text
- [x] Word arrays combined with preserved timestamps
- [x] Confidence averaged correctly

---

### Task 2: Update Type Definitions (0.5 hours)

**Priority:** HIGH
**Files:**
- `src/node/types.ts`
- `src/voice/VoiceRecorder.ts`
- `viewer/src/types/session.ts`

#### 2.1 Add mergedSegments to VoiceTranscriptAction

```typescript
// In VoiceTranscriptAction.transcript
mergedSegments?: {
  count: number;           // Number of original segments merged
  originalIds: string[];   // Original segment IDs for debugging
};
```

#### Acceptance Criteria

- [x] Type updated in `src/node/types.ts`
- [x] Type updated in `src/voice/VoiceRecorder.ts`
- [x] Type updated in `viewer/src/types/session.ts`
- [x] TypeScript compiles without errors

---

### Task 3: Update Viewer Display (1 hour)

**Priority:** MEDIUM
**Files:**
- `viewer/src/components/ActionList/ActionList.tsx`
- `viewer/src/components/VoiceTranscriptViewer/VoiceTranscriptViewer.tsx`

#### 3.1 Show merge indicator in ActionList

```tsx
// In ActionList voice item rendering
{action.transcript.mergedSegments && (
  <span className="merged-indicator" title={`Merged from ${action.transcript.mergedSegments.count} segments`}>
    ({action.transcript.mergedSegments.count} segments)
  </span>
)}
```

#### 3.2 Add styling for merged indicator

```css
.merged-indicator {
  font-size: 0.75rem;
  color: #888;
  margin-left: 0.5rem;
}
```

#### 3.3 Update VoiceTranscriptViewer for merged segments

The existing word-level playback should work automatically since words maintain their original timestamps. Verify this works correctly.

#### Acceptance Criteria

- [x] Merged segments show segment count in action list
- [x] Word highlighting works correctly across merged segments (words preserved with timestamps)
- [x] Audio playback spans full merged duration
- [x] Click-to-seek works for any word in merged segment

---

### Task 4: Testing (1-2 hours)

**Priority:** HIGH

#### 4.1 Unit tests for merge logic

```typescript
// test/voice-merge.test.ts
describe('Voice Transcript Merging', () => {
  it('merges consecutive voice segments', () => {
    const actions = [
      createVoiceAction('v1', 'Hello'),
      createVoiceAction('v2', 'world'),
      createClickAction('c1'),
      createVoiceAction('v3', 'Goodbye'),
    ];

    const merged = recorder._mergeConsecutiveVoiceTranscripts(actions);

    expect(merged.length).toBe(3);
    expect(merged[0].type).toBe('voice_transcript');
    expect(merged[0].transcript.text).toBe('Hello world');
    expect(merged[0].transcript.mergedSegments.count).toBe(2);
    expect(merged[1].type).toBe('click');
    expect(merged[2].transcript.text).toBe('Goodbye');
  });

  it('preserves single voice segments', () => {
    const actions = [
      createClickAction('c1'),
      createVoiceAction('v1', 'Single'),
      createClickAction('c2'),
    ];

    const merged = recorder._mergeConsecutiveVoiceTranscripts(actions);

    expect(merged.length).toBe(3);
    expect(merged[1].transcript.mergedSegments).toBeUndefined();
  });

  it('combines word arrays correctly', () => {
    const v1 = createVoiceAction('v1', 'Hello', [
      { word: 'Hello', startTime: '10:00:00', endTime: '10:00:01', probability: 0.9 }
    ]);
    const v2 = createVoiceAction('v2', 'world', [
      { word: 'world', startTime: '10:00:01', endTime: '10:00:02', probability: 0.8 }
    ]);

    const merged = recorder._mergeVoiceSegments([v1, v2]);

    expect(merged.transcript.words.length).toBe(2);
    expect(merged.transcript.words[0].word).toBe('Hello');
    expect(merged.transcript.words[1].word).toBe('world');
  });
});
```

#### 4.2 Integration test with real recording

- [ ] Record session with continuous narration
- [ ] Verify merged output in session.json
- [ ] Load in viewer and test playback
- [ ] Verify word highlighting works across merged segment

#### 4.3 Edge cases to test

- [ ] Session with only voice (no browser actions) → single merged segment
- [ ] Session with no voice → unchanged
- [ ] Voice segments with missing word arrays → text-only merge
- [ ] Very long merged segments (10+ originals) → verify performance

#### Acceptance Criteria

- [ ] Unit tests pass
- [ ] Integration test with real recording works
- [ ] Edge cases handled correctly
- [ ] Viewer playback works for merged segments

---

### Task 5: Documentation Update (0.5 hours)

**Priority:** LOW
**File:** `docs/VOICE_RECORDING.md`

#### Updates needed

- [ ] Document mergedSegments field in transcript structure
- [ ] Explain merge behavior (consecutive segments merged)
- [ ] Note that original segment IDs preserved for debugging

---

## Summary

### Total Estimated Effort: 5-6 hours

| Task | Hours | Priority |
|------|-------|----------|
| Task 1: Merge Method Implementation | 2 | HIGH |
| Task 2: Type Definitions | 0.5 | HIGH |
| Task 3: Viewer Display | 1 | MEDIUM |
| Task 4: Testing | 1.5 | HIGH |
| Task 5: Documentation | 0.5 | LOW |

### Success Metrics

| Metric | Before | After |
|--------|--------|-------|
| Voice actions for 2-min narration | 15-25 | 2-5 |
| Action list readability | Cluttered | Clean |
| Word-level playback | Works | Works |
| Audio seeking | Works | Works |

---

## File Reference

### Files to Modify

- [SessionRecorder.ts](../src/node/SessionRecorder.ts) - Add merge methods
- [types.ts](../src/node/types.ts) - Add mergedSegments type
- [VoiceRecorder.ts](../src/voice/VoiceRecorder.ts) - Update VoiceTranscriptAction type
- [session.ts](../viewer/src/types/session.ts) - Update viewer types
- [ActionList.tsx](../viewer/src/components/ActionList/ActionList.tsx) - Show merge indicator
- [VOICE_RECORDING.md](../docs/VOICE_RECORDING.md) - Document changes

### Files to Create

- `test/voice-merge.test.ts` - Unit tests for merge logic

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-11 | Initial task breakdown for voice transcript merging |
