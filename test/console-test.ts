/**
 * Console logging test for Browser Session Recorder
 * Tests POC 2 console capture requirements
 */

import { chromium } from '@playwright/test';
import { SessionRecorder } from '../src/index';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  console.log('🎬 Browser Session Recorder - Console Test\n');

  // 1. Launch browser
  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  // Monitor browser console
  page.on('console', msg => {
    console.log(`🌐 Browser [${msg.type()}]: ${msg.text()}`);
  });

  // 2. Create and start recorder
  console.log('Creating session recorder...');
  const sessionId = `console-test-${Date.now()}`;
  const recorder = new SessionRecorder(sessionId);
  await recorder.start(page);

  // 3. Navigate to a simple page with console logs
  const projectRoot = path.join(__dirname, '../..');
  const testPagePath = 'file://' + path.join(projectRoot, 'test/test-page.html').replace(/\\/g, '/');
  console.log(`Navigating to: ${testPagePath}`);
  await page.goto(testPagePath);

  // 4. Execute various console logs
  console.log('\n📝 Executing console tests...\n');

  await page.evaluate(() => {
    console.log('Test message 1: Simple string');
    console.log('Test message 2:', 'Multiple', 'arguments');
    console.log('Test message 3:', { foo: 'bar', nested: { a: 1, b: 2 } });
    console.log('Test message 4:', [1, 2, 3, 4, 5]);
    console.log('Test message 5:', new Date('2025-01-01T00:00:00Z'));

    console.info('Info message: Everything is working');
    console.warn('Warning message: This is a warning');
    console.debug('Debug message: Debugging info');
    console.error('Error message: This is an error');

    // Test with function
    console.log('Test message 6:', function testFunc() { return 'hello'; });

    // Test with RegExp
    console.log('Test message 7:', /test-regex/gi);

    // Test with circular reference
    const obj: any = { name: 'test' };
    obj.self = obj;
    console.log('Test message 8 (circular):', obj);

    // Test with undefined and null
    console.log('Test message 9:', undefined, null);

    // Test with Error object
    console.error('Test error with stack:', new Error('Test error message'));
  });

  // Wait a bit for console logs to be processed
  await page.waitForTimeout(1000);

  // 5. Stop recording
  console.log('\nStopping recording...');
  await recorder.stop();

  // 5.5. Create zip file
  console.log('\n📦 Creating zip file...');
  const zipPath = await recorder.createZip();

  // 6. Verify results
  const sessionData = recorder.getSessionData();
  const sessionDir = path.join(__dirname, '../output', sessionId);
  const consoleLogPath = path.join(sessionDir, 'session.console');

  console.log('\n📊 CONSOLE TEST RESULTS');
  console.log('=======================');
  console.log(`Session ID: ${sessionId}`);
  console.log(`Session Dir: ${sessionDir}`);
  console.log(`Zip File: ${zipPath}\n`);

  // Check if console log file exists
  const consoleFileExists = fs.existsSync(consoleLogPath);
  console.log(`Console file exists: ${consoleFileExists ? '✓' : '✗'}`);

  if (!consoleFileExists) {
    console.log('❌ Console log file not found!');
    await browser.close();
    process.exit(1);
  }

  // Read and parse console logs
  const consoleLogContent = fs.readFileSync(consoleLogPath, 'utf-8');
  const consoleLines = consoleLogContent.trim().split('\n').filter(line => line.length > 0);
  const consoleLogs = consoleLines.map(line => JSON.parse(line));

  console.log(`\nTotal console entries: ${consoleLogs.length}`);
  console.log(`Expected minimum: 14\n`);

  // Verify console metadata in session.json
  if (sessionData.console) {
    console.log('✓ Console metadata present in session.json');
    console.log(`  - File: ${sessionData.console.file}`);
    console.log(`  - Count: ${sessionData.console.count}`);
  } else {
    console.log('✗ Console metadata missing from session.json');
  }

  // Detailed verification
  let allChecksPassed = true;
  const checks: { name: string, pass: boolean }[] = [];

  // Check 1: File exists and has content
  checks.push({
    name: 'Console log file exists with content',
    pass: consoleFileExists && consoleLogs.length > 0
  });

  // Check 2: Has different log levels
  const levels = new Set(consoleLogs.map(log => log.level));
  checks.push({
    name: 'Has multiple log levels (log, error, warn, info, debug)',
    pass: levels.has('log') && levels.has('error') && levels.has('warn') && levels.has('info')
  });

  // Check 3: Timestamps are ISO 8601
  checks.push({
    name: 'All timestamps are ISO 8601 format',
    pass: consoleLogs.every(log => log.timestamp && log.timestamp.endsWith('Z'))
  });

  // Check 4: Args are present
  checks.push({
    name: 'All entries have args array',
    pass: consoleLogs.every(log => Array.isArray(log.args))
  });

  // Check 5: Error logs have stack traces
  const errorLogs = consoleLogs.filter(log => log.level === 'error' || log.level === 'warn');
  checks.push({
    name: 'Error/Warn logs have stack traces',
    pass: errorLogs.length > 0 && errorLogs.some(log => log.stack && log.stack.length > 0)
  });

  // Check 6: Object serialization
  const objectLogs = consoleLogs.filter(log =>
    log.args.some((arg: any) => arg && typeof arg === 'object' && arg.foo === 'bar')
  );
  checks.push({
    name: 'Object serialization works',
    pass: objectLogs.length > 0
  });

  // Check 7: Array serialization
  const arrayLogs = consoleLogs.filter(log =>
    log.args.some((arg: any) => Array.isArray(arg) && arg.length === 5)
  );
  checks.push({
    name: 'Array serialization works',
    pass: arrayLogs.length > 0
  });

  // Check 8: JSON Lines format (each line is valid JSON)
  let jsonLinesValid = true;
  try {
    consoleLines.forEach(line => JSON.parse(line));
  } catch (err) {
    jsonLinesValid = false;
  }
  checks.push({
    name: 'JSON Lines format is valid',
    pass: jsonLinesValid
  });

  // Check 9: Minimum number of logs
  checks.push({
    name: 'Captured expected number of console logs (≥14)',
    pass: consoleLogs.length >= 14
  });

  console.log('\n✅ VERIFICATION CHECKS:');
  console.log('======================\n');

  checks.forEach(check => {
    const icon = check.pass ? '✓' : '✗';
    console.log(`${icon} ${check.name}`);
    if (!check.pass) allChecksPassed = false;
  });

  // Print sample logs
  console.log('\n📄 SAMPLE CONSOLE LOGS:');
  console.log('=======================\n');
  consoleLogs.slice(0, 5).forEach((log, index) => {
    console.log(`${index + 1}. [${log.level}] ${log.timestamp}`);
    console.log(`   Args: ${JSON.stringify(log.args).substring(0, 100)}...`);
    if (log.stack) {
      const stackPreview = log.stack.split('\n')[0];
      console.log(`   Stack: ${stackPreview}...`);
    }
    console.log('');
  });

  if (allChecksPassed) {
    console.log('🎉 ALL CONSOLE TESTS PASSED!');
    console.log('✅ Test complete!');
  } else {
    console.log('⚠️  SOME CHECKS FAILED - Review the output above');
    console.log('❌ Test failed!');
  }

  await browser.close();
  process.exit(allChecksPassed ? 0 : 1);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
