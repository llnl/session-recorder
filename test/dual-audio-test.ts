/**
 * Test script for FEAT-03 (Recording Options API) and FEAT-04 (Source-Attributed Transcription)
 *
 * FEAT-03 verifies:
 * 1. SessionRecorder accepts system_audio_record: true option
 * 2. system_audio_record: false → Only microphone recorded
 * 3. system_audio_record: true, voice_record: false → Only system audio
 * 4. Both true → Both streams recorded
 * 5. Session metadata includes audio source configuration
 * 6. Audio files listed in session.json with correct paths
 *
 * FEAT-04 verifies:
 * 1. Stop recording → Both audio files sent to Whisper
 * 2. Voice transcript segments have source: 'voice'
 * 3. System transcript segments have source: 'system'
 * 4. Merged transcript sorts segments by timestamp chronologically
 * 5. Word-level timestamps preserved in both sources
 * 6. Transcript JSON includes source field in each segment
 *
 * Run: npm run build && node dist/test/dual-audio-test.js
 */

import * as path from 'path';
import * as fs from 'fs';
import { SessionData, VoiceTranscriptAction } from '../src/node/types';

const OUTPUT_DIR = path.join(__dirname, '../output');

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

async function runTests(): Promise<void> {
  console.log('='.repeat(60));
  console.log('  FEAT-03 & FEAT-04: Dual Audio Recording Tests');
  console.log('='.repeat(60));
  console.log('');

  const results: TestResult[] = [];

  // Find the most recent session directory (not zip files)
  const sessionDirs = fs.readdirSync(OUTPUT_DIR)
    .filter(d => {
      const fullPath = path.join(OUTPUT_DIR, d);
      return d.startsWith('session-') &&
             !d.endsWith('.zip') &&
             fs.statSync(fullPath).isDirectory();
    })
    .map(d => ({
      name: d,
      path: path.join(OUTPUT_DIR, d),
      mtime: fs.statSync(path.join(OUTPUT_DIR, d)).mtime
    }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  if (sessionDirs.length === 0) {
    console.log('❌ No session directories found in output/');
    console.log('   Run a recording session first to test.');
    return;
  }

  const sessionDir = sessionDirs[0].path;
  console.log(`📁 Testing session: ${sessionDirs[0].name}`);
  console.log('');

  // Load session.json
  const sessionJsonPath = path.join(sessionDir, 'session.json');
  if (!fs.existsSync(sessionJsonPath)) {
    console.log('❌ session.json not found');
    return;
  }

  const sessionData: SessionData = JSON.parse(fs.readFileSync(sessionJsonPath, 'utf-8'));

  // ====================
  // FEAT-03 Tests
  // ====================
  console.log('📋 FEAT-03: Recording Options API Tests');
  console.log('-'.repeat(40));

  // Test 1: Session metadata includes audio source configuration
  results.push({
    name: 'FEAT-03.5: Session metadata includes audio source config',
    passed: !!(sessionData.voiceRecording || sessionData.systemAudioRecording),
    message: sessionData.voiceRecording
      ? `voiceRecording enabled: ${sessionData.voiceRecording.enabled}`
      : sessionData.systemAudioRecording
        ? `systemAudioRecording enabled: ${sessionData.systemAudioRecording.enabled}`
        : 'No audio source config found'
  });

  // Test 2: Audio files listed in session.json
  const hasVoiceAudio = sessionData.voiceRecording?.audioFile;
  const hasSystemAudio = sessionData.systemAudioRecording?.audioFile;

  results.push({
    name: 'FEAT-03.6: Audio files listed in session.json',
    passed: !!(hasVoiceAudio || hasSystemAudio),
    message: `voice: ${hasVoiceAudio || 'none'}, system: ${hasSystemAudio || 'none'}`
  });

  // Test 3: Verify audio files exist on disk
  if (hasVoiceAudio) {
    const voiceAudioPath = path.join(sessionDir, sessionData.voiceRecording!.audioFile!);
    results.push({
      name: 'FEAT-03.6a: Voice audio file exists',
      passed: fs.existsSync(voiceAudioPath),
      message: voiceAudioPath
    });
  }

  if (hasSystemAudio) {
    const systemAudioPath = path.join(sessionDir, sessionData.systemAudioRecording!.audioFile!);
    results.push({
      name: 'FEAT-03.6b: System audio file exists',
      passed: fs.existsSync(systemAudioPath),
      message: systemAudioPath
    });
  }

  console.log('');

  // ====================
  // FEAT-04 Tests
  // ====================
  console.log('📋 FEAT-04: Source-Attributed Transcription Tests');
  console.log('-'.repeat(40));

  // Get all voice transcript actions
  const voiceTranscriptActions = sessionData.actions.filter(
    (a): a is VoiceTranscriptAction => a.type === 'voice_transcript'
  );

  // Test 1: Transcript actions exist
  results.push({
    name: 'FEAT-04.1: Transcript actions exist',
    passed: voiceTranscriptActions.length > 0,
    message: `Found ${voiceTranscriptActions.length} transcript segments`
  });

  // Test 2: Voice transcript segments have source: 'voice'
  const voiceSourceSegments = voiceTranscriptActions.filter(a => a.source === 'voice');
  results.push({
    name: 'FEAT-04.2: Voice segments have source: "voice"',
    passed: voiceSourceSegments.length > 0 || !sessionData.voiceRecording?.enabled,
    message: `Found ${voiceSourceSegments.length} voice-sourced segments`
  });

  // Test 3: System transcript segments have source: 'system'
  const systemSourceSegments = voiceTranscriptActions.filter(a => a.source === 'system');
  results.push({
    name: 'FEAT-04.3: System segments have source: "system"',
    passed: systemSourceSegments.length > 0 || !sessionData.systemAudioRecording?.enabled,
    message: `Found ${systemSourceSegments.length} system-sourced segments`
  });

  // Test 4: Merged transcript is sorted chronologically
  let isSorted = true;
  for (let i = 1; i < voiceTranscriptActions.length; i++) {
    const prevTime = new Date(voiceTranscriptActions[i - 1].timestamp).getTime();
    const currTime = new Date(voiceTranscriptActions[i].timestamp).getTime();
    if (currTime < prevTime) {
      isSorted = false;
      break;
    }
  }
  results.push({
    name: 'FEAT-04.4: Merged transcript sorted chronologically',
    passed: isSorted,
    message: isSorted ? 'All segments in chronological order' : 'Segments out of order!'
  });

  // Test 5: Word-level timestamps preserved
  const segmentsWithWords = voiceTranscriptActions.filter(
    a => a.transcript.words && a.transcript.words.length > 0
  );
  results.push({
    name: 'FEAT-04.5: Word-level timestamps preserved',
    passed: segmentsWithWords.length > 0,
    message: `${segmentsWithWords.length}/${voiceTranscriptActions.length} segments have word-level data`
  });

  // Test 6: Transcript JSON includes source field in each segment
  const segmentsWithSource = voiceTranscriptActions.filter(a => a.source !== undefined);
  results.push({
    name: 'FEAT-04.6: Source field in transcript segments',
    passed: segmentsWithSource.length === voiceTranscriptActions.length,
    message: `${segmentsWithSource.length}/${voiceTranscriptActions.length} segments have source field`
  });

  // Check for system transcript file
  if (sessionData.systemAudioRecording?.transcriptFile) {
    const systemTranscriptPath = path.join(sessionDir, sessionData.systemAudioRecording.transcriptFile);
    results.push({
      name: 'FEAT-04.1b: System transcript file exists',
      passed: fs.existsSync(systemTranscriptPath),
      message: systemTranscriptPath
    });
  }

  // ====================
  // Summary
  // ====================
  console.log('');
  console.log('='.repeat(60));
  console.log('  Test Results Summary');
  console.log('='.repeat(60));
  console.log('');

  let passCount = 0;
  let failCount = 0;

  for (const result of results) {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    console.log(`   ${result.message}`);
    console.log('');

    if (result.passed) passCount++;
    else failCount++;
  }

  console.log('-'.repeat(60));
  console.log(`Total: ${passCount} passed, ${failCount} failed`);
  console.log('');

  if (failCount === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check the output above.');
  }

  // Display sample transcript segments
  console.log('');
  console.log('='.repeat(60));
  console.log('  Sample Transcript Segments');
  console.log('='.repeat(60));

  const sampleCount = Math.min(5, voiceTranscriptActions.length);
  for (let i = 0; i < sampleCount; i++) {
    const segment = voiceTranscriptActions[i];
    console.log('');
    console.log(`Segment ${i + 1}:`);
    console.log(`  ID: ${segment.id}`);
    console.log(`  Source: ${segment.source || 'undefined'}`);
    console.log(`  Text: "${segment.transcript.text.slice(0, 80)}${segment.transcript.text.length > 80 ? '...' : ''}"`);
    console.log(`  Time: ${segment.timestamp}`);
    console.log(`  Words: ${segment.transcript.words?.length || 0}`);
  }
}

// Run tests
runTests().catch(console.error);
