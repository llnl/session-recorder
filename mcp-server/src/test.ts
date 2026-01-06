/**
 * Test script for Session Search MCP Server
 *
 * Run with: npx ts-node src/test.ts
 */

import { SessionStore } from './SessionStore';
import * as tools from './tools';

const SESSION_PATH = 'C:\\Workspace\\playwright\\session-recorder\\dist\\output\\session-1765433976846';

async function main() {
  console.log('=== Session Search MCP Server Test ===\n');

  const store = new SessionStore();

  // Test 1: Load session
  console.log('1. Loading session...');
  try {
    const loadResult = await tools.sessionLoad(store, { path: SESSION_PATH });
    console.log('   Session loaded:', loadResult.sessionId);
    console.log('   Duration:', loadResult.duration, 'ms');
    console.log('   Actions:', loadResult.actionCount);
    console.log('   Has voice:', loadResult.hasVoice);
    console.log('   URLs:', loadResult.urls.slice(0, 5).join(', '));
    console.log('   Summary:', JSON.stringify(loadResult.summary));
    console.log('   ✓ session_load works\n');

    // Test 2: Get summary
    console.log('2. Getting summary...');
    const summary = tools.sessionGetSummary(store, { sessionId: loadResult.sessionId });
    console.log('   Total actions:', summary.totalActions);
    console.log('   By type:', JSON.stringify(summary.byType));
    console.log('   Error count:', summary.errorCount);
    console.log('   Features detected:', summary.featuresDetected);
    console.log('   Transcript preview:', summary.transcriptPreview.slice(0, 100) + '...');
    console.log('   ✓ session_get_summary works\n');

    // Test 3: Search
    console.log('3. Searching for "calendar"...');
    const searchResults = tools.sessionSearch(store, {
      sessionId: loadResult.sessionId,
      query: 'calendar',
      limit: 5,
    });
    console.log('   Found', searchResults.length, 'results');
    for (const result of searchResults.slice(0, 3)) {
      console.log(`   - [${result.matchType}] ${result.text.slice(0, 60)}...`);
    }
    console.log('   ✓ session_search works\n');

    // Test 4: Get actions
    console.log('4. Getting actions...');
    const actionsResult = tools.sessionGetActions(store, {
      sessionId: loadResult.sessionId,
      limit: 10,
    });
    console.log('   Total actions:', actionsResult.total);
    console.log('   Returned:', actionsResult.returned);
    for (const action of actionsResult.actions.slice(0, 3)) {
      console.log(`   - [${action.type}] ${action.url?.slice(0, 40) || 'no url'}`);
    }
    console.log('   ✓ session_get_actions works\n');

    // Test 5: Get URLs
    console.log('5. Getting URLs...');
    const urls = tools.sessionGetUrls(store, { sessionId: loadResult.sessionId });
    console.log('   Unique URLs:', urls.length);
    for (const url of urls.slice(0, 5)) {
      console.log(`   - ${url.url.slice(0, 50)} (${url.actionCount} actions)`);
    }
    console.log('   ✓ session_get_urls works\n');

    // Test 6: Get timeline
    console.log('6. Getting timeline...');
    const timeline = tools.sessionGetTimeline(store, {
      sessionId: loadResult.sessionId,
      limit: 10,
    });
    console.log('   Total entries:', timeline.total);
    for (const entry of timeline.entries.slice(0, 5)) {
      console.log(`   - [${entry.type}] ${entry.summary.slice(0, 50)}`);
    }
    console.log('   ✓ session_get_timeline works\n');

    // Test 7: Get errors
    console.log('7. Getting errors...');
    const errors = tools.sessionGetErrors(store, { sessionId: loadResult.sessionId });
    console.log('   Console errors:', errors.console.length);
    console.log('   Network errors:', errors.network.length);
    console.log('   ✓ session_get_errors works\n');

    // Test 8: Get action detail
    if (actionsResult.actions.length > 0) {
      console.log('8. Getting action detail...');
      const actionDetail = tools.sessionGetAction(store, {
        sessionId: loadResult.sessionId,
        actionId: actionsResult.actions[0].id,
      });
      console.log('   Action ID:', actionDetail.id);
      console.log('   Type:', actionDetail.type);
      console.log('   URL:', actionDetail.url?.slice(0, 50));
      console.log('   ✓ session_get_action works\n');
    }

    // Test 9: Unload
    console.log('9. Unloading session...');
    const unloadResult = tools.sessionUnload(store, { sessionId: loadResult.sessionId });
    console.log('   Unload success:', unloadResult.success);
    console.log('   ✓ session_unload works\n');

    console.log('=== All tests passed! ===');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
