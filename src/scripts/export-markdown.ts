#!/usr/bin/env node
/**
 * CLI script to generate markdown exports for an existing session
 *
 * Usage:
 *   npx ts-node src/scripts/export-markdown.ts <session-directory>
 *   npm run export:markdown -- <session-directory>
 */

import * as path from 'path';
import * as fs from 'fs';
import { generateMarkdownExports } from '../export';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: npm run export:markdown -- <session-directory>');
    console.error('');
    console.error('Examples:');
    console.error('  npm run export:markdown -- ./sessions/session-1234567890');
    console.error('  npm run export:markdown -- C:\\path\\to\\session-folder');
    process.exit(1);
  }

  const sessionDir = path.resolve(args[0]);

  // Validate directory exists
  if (!fs.existsSync(sessionDir)) {
    console.error(`❌ Directory not found: ${sessionDir}`);
    process.exit(1);
  }

  // Check for session.json
  const sessionJsonPath = path.join(sessionDir, 'session.json');
  if (!fs.existsSync(sessionJsonPath)) {
    console.error(`❌ No session.json found in: ${sessionDir}`);
    console.error('   This does not appear to be a valid session directory.');
    process.exit(1);
  }

  console.log(`📁 Session directory: ${sessionDir}`);
  console.log('');

  try {
    const result = await generateMarkdownExports(sessionDir);

    console.log('');
    console.log('Generated files:');
    if (result.transcript) console.log(`  ✅ ${path.basename(result.transcript)}`);
    if (result.actions) console.log(`  ✅ ${path.basename(result.actions)}`);
    if (result.consoleSummary) console.log(`  ✅ ${path.basename(result.consoleSummary)}`);
    if (result.networkSummary) console.log(`  ✅ ${path.basename(result.networkSummary)}`);

    const fileCount = [result.transcript, result.actions, result.consoleSummary, result.networkSummary]
      .filter(Boolean).length;

    if (fileCount === 0) {
      console.log('  ⚠️  No markdown files generated (missing source data)');
    }
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

main();
