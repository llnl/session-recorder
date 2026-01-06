"use strict";
/**
 * Console Summary Markdown - FR-4
 *
 * Converts session.console to console-summary.md with:
 * - Total counts by level (error/warn/info/debug)
 * - Pattern-grouped messages with occurrence counts
 * - First/last timestamps per pattern
 * - Stack traces for errors
 * - Wildcard normalization (URLs, numbers, UUIDs → *)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateConsoleSummary = generateConsoleSummary;
exports.generateConsoleSummaryFile = generateConsoleSummaryFile;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const readline = __importStar(require("readline"));
/**
 * Format timestamp for display (e.g., "06:21:15")
 */
function formatTime(isoTimestamp) {
    const date = new Date(isoTimestamp);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const mins = date.getUTCMinutes().toString().padStart(2, '0');
    const secs = date.getUTCSeconds().toString().padStart(2, '0');
    return `${hours}:${mins}:${secs}`;
}
/**
 * Normalize message to a pattern by replacing dynamic values with *
 * - URLs → *
 * - Numbers → *
 * - UUIDs → *
 * - Timestamps → *
 * - Hashes/tokens → *
 */
function normalizeToPattern(message) {
    if (!message)
        return '[empty]';
    let pattern = String(message);
    // Replace URLs (http://, https://, //, and paths with extensions)
    pattern = pattern.replace(/https?:\/\/[^\s"'<>]+/gi, '*');
    pattern = pattern.replace(/\/\/[^\s"'<>]+\.[^\s"'<>]+/gi, '*');
    // Replace file paths
    pattern = pattern.replace(/[a-zA-Z]:\\[^\s"'<>:]+/g, '*');
    pattern = pattern.replace(/\/[\w\-./]+\.(js|ts|jsx|tsx|css|html|json|png|jpg|svg|woff2?|ttf)/gi, '*');
    // Replace UUIDs
    pattern = pattern.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '*');
    // Replace hex hashes (SHA1, SHA256, etc.)
    pattern = pattern.replace(/\b[0-9a-f]{32,64}\b/gi, '*');
    // Replace ISO timestamps
    pattern = pattern.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[.\d]*Z?/g, '*');
    // Replace timestamps like "12:34:56" or "12:34:56.789"
    pattern = pattern.replace(/\d{1,2}:\d{2}:\d{2}[.\d]*/g, '*');
    // Replace large numbers (keep small numbers for context like "row 3")
    pattern = pattern.replace(/\b\d{5,}\b/g, '*');
    // Replace floating point numbers
    pattern = pattern.replace(/\b\d+\.\d+\b/g, '*');
    // Replace tokens/session IDs (long alphanumeric strings)
    pattern = pattern.replace(/\b[a-zA-Z0-9]{20,}\b/g, '*');
    // Collapse multiple * into single *
    pattern = pattern.replace(/\*+/g, '*');
    // Trim and limit length
    return pattern.trim().slice(0, 200);
}
/**
 * Escape markdown special characters for table cells
 */
function escapeMarkdown(text) {
    return text
        .replace(/\|/g, '\\|')
        .replace(/\n/g, ' ')
        .replace(/`/g, '\\`');
}
/**
 * Read console entries from session.console (JSON Lines format)
 */
async function readConsoleEntries(consolePath) {
    const entries = [];
    if (!fs.existsSync(consolePath)) {
        return entries;
    }
    const fileStream = fs.createReadStream(consolePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
    for await (const line of rl) {
        if (line.trim()) {
            try {
                const entry = JSON.parse(line);
                entries.push(entry);
            }
            catch {
                // Skip malformed lines
            }
        }
    }
    return entries;
}
/**
 * Group console entries by normalized pattern
 */
function groupByPattern(entries) {
    const groups = new Map();
    for (const entry of entries) {
        const pattern = normalizeToPattern(entry.message);
        const key = `${entry.level}:${pattern}`;
        const existing = groups.get(key);
        if (existing) {
            existing.count++;
            existing.lastSeen = entry.timestamp;
            if (entry.stack && !existing.stacks.includes(entry.stack)) {
                existing.stacks.push(entry.stack);
            }
        }
        else {
            groups.set(key, {
                pattern,
                originalMessage: (entry.message || '').slice(0, 200),
                count: 1,
                firstSeen: entry.timestamp,
                lastSeen: entry.timestamp,
                level: entry.level,
                stacks: entry.stack ? [entry.stack] : []
            });
        }
    }
    return groups;
}
/**
 * Generate console-summary.md content
 */
async function generateConsoleSummary(consolePath) {
    const entries = await readConsoleEntries(consolePath);
    if (entries.length === 0) {
        return '# Console Summary\n\n*No console entries recorded.*\n';
    }
    const lines = [];
    // Count by level
    const counts = {
        error: 0,
        warn: 0,
        info: 0,
        debug: 0,
        log: 0,
        trace: 0
    };
    for (const entry of entries) {
        const level = entry.level in counts ? entry.level : 'log';
        counts[level]++;
    }
    // Header
    lines.push('# Console Summary');
    lines.push('');
    // Total counts
    const total = entries.length;
    const countParts = [];
    countParts.push(`**Total Entries**: ${total.toLocaleString()}`);
    if (counts.error > 0)
        countParts.push(`**Errors**: ${counts.error}`);
    if (counts.warn > 0)
        countParts.push(`**Warnings**: ${counts.warn}`);
    if (counts.info > 0)
        countParts.push(`**Info**: ${counts.info.toLocaleString()}`);
    if (counts.debug > 0)
        countParts.push(`**Debug**: ${counts.debug}`);
    if (counts.log > 0)
        countParts.push(`**Log**: ${counts.log.toLocaleString()}`);
    lines.push(countParts.join(' | '));
    lines.push('');
    lines.push('---');
    lines.push('');
    // Group by pattern
    const groups = groupByPattern(entries);
    // Convert to array and sort by count (descending)
    const sortedGroups = Array.from(groups.values()).sort((a, b) => b.count - a.count);
    // Separate by level
    const errors = sortedGroups.filter(g => g.level === 'error');
    const warnings = sortedGroups.filter(g => g.level === 'warn');
    const infos = sortedGroups.filter(g => g.level === 'info' || g.level === 'log');
    const debugs = sortedGroups.filter(g => g.level === 'debug' || g.level === 'trace');
    // Errors section
    if (errors.length > 0) {
        const errorCount = errors.reduce((sum, g) => sum + g.count, 0);
        lines.push(`## Errors (${errorCount})`);
        lines.push('');
        lines.push('| Count | Message | First Seen | Last Seen |');
        lines.push('|-------|---------|------------|-----------|');
        for (const group of errors.slice(0, 20)) { // Top 20
            const message = escapeMarkdown(group.pattern.slice(0, 80));
            lines.push(`| ${group.count} | \`${message}\` | ${formatTime(group.firstSeen)} | ${formatTime(group.lastSeen)} |`);
        }
        lines.push('');
        // Error details with stack traces
        if (errors.some(e => e.stacks.length > 0)) {
            lines.push('### Error Details');
            lines.push('');
            for (const group of errors.slice(0, 10)) {
                if (group.stacks.length > 0) {
                    lines.push(`#### ${escapeMarkdown(group.pattern.slice(0, 60))} (${group.count} occurrences)`);
                    lines.push('');
                    lines.push('**Stack trace**:');
                    lines.push('');
                    lines.push('```');
                    lines.push(group.stacks[0].slice(0, 500)); // First stack trace, limited
                    lines.push('```');
                    lines.push('');
                }
            }
        }
        lines.push('---');
        lines.push('');
    }
    // Warnings section
    if (warnings.length > 0) {
        const warnCount = warnings.reduce((sum, g) => sum + g.count, 0);
        lines.push(`## Warnings (${warnCount.toLocaleString()})`);
        lines.push('');
        lines.push('| Count | Pattern | First Seen |');
        lines.push('|-------|---------|------------|');
        for (const group of warnings.slice(0, 20)) { // Top 20
            const pattern = escapeMarkdown(group.pattern.slice(0, 80));
            lines.push(`| ${group.count.toLocaleString()} | \`${pattern}\` | ${formatTime(group.firstSeen)} |`);
        }
        lines.push('');
        lines.push('---');
        lines.push('');
    }
    // Info highlights (top 10 only)
    if (infos.length > 0) {
        const infoCount = infos.reduce((sum, g) => sum + g.count, 0);
        lines.push(`## Info Highlights (${infoCount.toLocaleString()} total)`);
        lines.push('');
        lines.push('| Count | Pattern |');
        lines.push('|-------|---------|');
        for (const group of infos.slice(0, 10)) { // Top 10
            const pattern = escapeMarkdown(group.pattern.slice(0, 80));
            lines.push(`| ${group.count.toLocaleString()} | \`${pattern}\` |`);
        }
        lines.push('');
    }
    // Debug (if any, brief)
    if (debugs.length > 0) {
        const debugCount = debugs.reduce((sum, g) => sum + g.count, 0);
        lines.push(`## Debug (${debugCount.toLocaleString()} total)`);
        lines.push('');
        lines.push(`*${debugs.length} unique patterns*`);
        lines.push('');
    }
    return lines.join('\n');
}
/**
 * Read session.console and generate console-summary.md
 *
 * @param sessionDir - Path to the session directory
 * @returns Path to generated console-summary.md, or null if no console log exists
 */
async function generateConsoleSummaryFile(sessionDir) {
    const consolePath = path.join(sessionDir, 'session.console');
    // Check if session.console exists
    if (!fs.existsSync(consolePath)) {
        console.log('📝 No session.console found, skipping console-summary.md generation');
        return null;
    }
    try {
        // Generate markdown
        const markdown = await generateConsoleSummary(consolePath);
        // Write console-summary.md
        const outputPath = path.join(sessionDir, 'console-summary.md');
        fs.writeFileSync(outputPath, markdown, 'utf-8');
        console.log(`📝 Generated console-summary.md`);
        return outputPath;
    }
    catch (error) {
        console.error('❌ Failed to generate console-summary.md:', error);
        return null;
    }
}
//# sourceMappingURL=consoleSummary.js.map