"use strict";
/**
 * Network Summary Markdown - FR-5
 *
 * Converts session.network to network-summary.md with:
 * - Total requests, success rate, size
 * - Breakdown by resource type
 * - Failed requests table with status and error
 * - Slowest requests (top 10)
 * - Cache hit ratio
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
exports.generateNetworkSummary = generateNetworkSummary;
exports.generateNetworkSummaryFile = generateNetworkSummaryFile;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const readline = __importStar(require("readline"));
/**
 * Format bytes to human-readable size
 */
function formatSize(bytes) {
    if (bytes === 0)
        return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}
/**
 * Format timestamp for display (e.g., "06:28:12")
 */
function formatTime(isoTimestamp) {
    const date = new Date(isoTimestamp);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const mins = date.getUTCMinutes().toString().padStart(2, '0');
    const secs = date.getUTCSeconds().toString().padStart(2, '0');
    return `${hours}:${mins}:${secs}`;
}
/**
 * Format duration in milliseconds
 */
function formatDuration(ms) {
    if (ms < 1000) {
        return `${Math.round(ms)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
}
/**
 * Truncate URL for display
 */
function truncateUrl(url, maxLength = 60) {
    if (url.length <= maxLength)
        return url;
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        if (pathname.length > maxLength - 10) {
            return '...' + pathname.slice(-maxLength + 3);
        }
        return pathname;
    }
    catch {
        return url.slice(0, maxLength - 3) + '...';
    }
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
 * Get human-readable resource type
 */
function getResourceTypeName(type) {
    const typeMap = {
        document: 'Documents',
        script: 'Scripts',
        stylesheet: 'Stylesheets',
        image: 'Images',
        font: 'Fonts',
        xhr: 'XHR/Fetch',
        fetch: 'XHR/Fetch',
        websocket: 'WebSockets',
        media: 'Media',
        manifest: 'Manifests',
        other: 'Other'
    };
    return typeMap[type?.toLowerCase()] || 'Other';
}
/**
 * Read network entries from session.network (JSON Lines format)
 */
async function readNetworkEntries(networkPath) {
    const entries = [];
    if (!fs.existsSync(networkPath)) {
        return entries;
    }
    const fileStream = fs.createReadStream(networkPath);
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
 * Generate network-summary.md content
 */
async function generateNetworkSummary(networkPath) {
    const entries = await readNetworkEntries(networkPath);
    if (entries.length === 0) {
        return '# Network Summary\n\n*No network requests recorded.*\n';
    }
    const lines = [];
    // Calculate statistics
    const total = entries.length;
    const successful = entries.filter(e => e.status >= 200 && e.status < 400).length;
    const failed = entries.filter(e => e.status >= 400 || e.status === 0).length;
    const successRate = (successful / total * 100).toFixed(1);
    const totalSize = entries.reduce((sum, e) => sum + (e.size || 0), 0);
    const cached = entries.filter(e => e.fromCache).length;
    const cacheHitRate = total > 0 ? (cached / total * 100).toFixed(1) : '0';
    // Group by resource type
    const byType = new Map();
    for (const entry of entries) {
        const type = getResourceTypeName(entry.resourceType || 'other');
        const existing = byType.get(type) || { type, count: 0, size: 0, cached: 0 };
        existing.count++;
        existing.size += entry.size || 0;
        if (entry.fromCache)
            existing.cached++;
        byType.set(type, existing);
    }
    // Header
    lines.push('# Network Summary');
    lines.push('');
    // Overview stats
    lines.push(`**Total Requests**: ${total.toLocaleString()}`);
    lines.push(`**Successful**: ${successful.toLocaleString()} (${successRate}%) | **Failed**: ${failed} (${(100 - parseFloat(successRate)).toFixed(1)}%)`);
    lines.push(`**Total Size**: ${formatSize(totalSize)}`);
    lines.push('');
    lines.push('---');
    lines.push('');
    // Overview table
    lines.push('## Overview');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    // Sort types by count
    const sortedTypes = Array.from(byType.values()).sort((a, b) => b.count - a.count);
    for (const stat of sortedTypes) {
        lines.push(`| ${stat.type} | ${stat.count} (${formatSize(stat.size)}) |`);
    }
    lines.push(`| Cache Hit Rate | ${cacheHitRate}% (${cached}/${total}) |`);
    lines.push('');
    lines.push('---');
    lines.push('');
    // Failed requests
    const failedRequests = entries
        .filter(e => e.status >= 400 || e.status === 0)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    if (failedRequests.length > 0) {
        lines.push(`## Failed Requests (${failedRequests.length})`);
        lines.push('');
        lines.push('| Time | URL | Status | Error |');
        lines.push('|------|-----|--------|-------|');
        for (const entry of failedRequests.slice(0, 20)) { // Top 20
            const time = formatTime(entry.timestamp);
            const url = escapeMarkdown(truncateUrl(entry.url, 50));
            const status = entry.status || 'N/A';
            const error = escapeMarkdown(entry.statusText || entry.error || 'Unknown');
            lines.push(`| ${time} | \`${url}\` | ${status} | ${error} |`);
        }
        if (failedRequests.length > 20) {
            lines.push(`| ... | *${failedRequests.length - 20} more* | | |`);
        }
        lines.push('');
        lines.push('---');
        lines.push('');
    }
    // Slowest requests (top 10)
    const requestsWithTiming = entries
        .filter(e => e.timing?.total && e.timing.total > 0)
        .sort((a, b) => (b.timing?.total || 0) - (a.timing?.total || 0));
    if (requestsWithTiming.length > 0) {
        lines.push('## Slowest Requests (Top 10)');
        lines.push('');
        lines.push('| Time | URL | Duration | Size |');
        lines.push('|------|-----|----------|------|');
        for (const entry of requestsWithTiming.slice(0, 10)) {
            const time = formatTime(entry.timestamp);
            const url = escapeMarkdown(truncateUrl(entry.url, 45));
            const duration = formatDuration(entry.timing?.total || 0);
            const size = formatSize(entry.size || 0);
            lines.push(`| ${time} | \`${url}\` | ${duration} | ${size} |`);
        }
        lines.push('');
        lines.push('---');
        lines.push('');
    }
    // Resource type breakdown (detailed)
    lines.push('## Resource Type Breakdown');
    lines.push('');
    lines.push('| Type | Count | Size | Cached |');
    lines.push('|------|-------|------|--------|');
    for (const stat of sortedTypes) {
        const cachePercent = stat.count > 0 ? (stat.cached / stat.count * 100).toFixed(0) : '0';
        lines.push(`| ${stat.type} | ${stat.count} | ${formatSize(stat.size)} | ${stat.cached} (${cachePercent}%) |`);
    }
    lines.push('');
    // Timing breakdown (if available)
    const entriesWithDetailedTiming = entries.filter(e => e.timing && (e.timing.dns || e.timing.connect || e.timing.ttfb));
    if (entriesWithDetailedTiming.length > 10) {
        const avgDns = entriesWithDetailedTiming.reduce((sum, e) => sum + (e.timing?.dns || 0), 0) / entriesWithDetailedTiming.length;
        const avgConnect = entriesWithDetailedTiming.reduce((sum, e) => sum + (e.timing?.connect || 0), 0) / entriesWithDetailedTiming.length;
        const avgTtfb = entriesWithDetailedTiming.reduce((sum, e) => sum + (e.timing?.ttfb || 0), 0) / entriesWithDetailedTiming.length;
        const avgDownload = entriesWithDetailedTiming.reduce((sum, e) => sum + (e.timing?.download || 0), 0) / entriesWithDetailedTiming.length;
        lines.push('## Average Timing Breakdown');
        lines.push('');
        lines.push('| Phase | Average Duration |');
        lines.push('|-------|------------------|');
        if (avgDns > 0)
            lines.push(`| DNS Lookup | ${formatDuration(avgDns)} |`);
        if (avgConnect > 0)
            lines.push(`| Connection | ${formatDuration(avgConnect)} |`);
        if (avgTtfb > 0)
            lines.push(`| Time to First Byte | ${formatDuration(avgTtfb)} |`);
        if (avgDownload > 0)
            lines.push(`| Download | ${formatDuration(avgDownload)} |`);
        lines.push('');
    }
    return lines.join('\n');
}
/**
 * Read session.network and generate network-summary.md
 *
 * @param sessionDir - Path to the session directory
 * @returns Path to generated network-summary.md, or null if no network log exists
 */
async function generateNetworkSummaryFile(sessionDir) {
    const networkPath = path.join(sessionDir, 'session.network');
    // Check if session.network exists
    if (!fs.existsSync(networkPath)) {
        console.log('📝 No session.network found, skipping network-summary.md generation');
        return null;
    }
    try {
        // Generate markdown
        const markdown = await generateNetworkSummary(networkPath);
        // Write network-summary.md
        const outputPath = path.join(sessionDir, 'network-summary.md');
        fs.writeFileSync(outputPath, markdown, 'utf-8');
        console.log(`📝 Generated network-summary.md`);
        return outputPath;
    }
    catch (error) {
        console.error('❌ Failed to generate network-summary.md:', error);
        return null;
    }
}
//# sourceMappingURL=networkSummary.js.map