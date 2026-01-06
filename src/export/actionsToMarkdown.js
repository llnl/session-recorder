"use strict";
/**
 * Actions to Markdown - FR-3
 *
 * Converts session.json actions to actions.md with:
 * - Chronological timeline of all actions
 * - Human-readable element descriptions (from FR-1)
 * - Before/After screenshot + HTML links in tables
 * - Inline voice context when associated
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
exports.generateActionsMarkdown = generateActionsMarkdown;
exports.generateActionsMarkdownFile = generateActionsMarkdownFile;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const zlib = __importStar(require("zlib"));
const util_1 = require("util");
const elementContext_1 = require("./elementContext");
const gunzipAsync = (0, util_1.promisify)(zlib.gunzip);
/**
 * Format timestamp for display (e.g., "06:19:51 UTC")
 */
function formatTimestamp(isoTimestamp) {
    const date = new Date(isoTimestamp);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const mins = date.getUTCMinutes().toString().padStart(2, '0');
    const secs = date.getUTCSeconds().toString().padStart(2, '0');
    return `${hours}:${mins}:${secs} UTC`;
}
/**
 * Format duration for display
 */
function formatDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const totalSecs = Math.floor(diffMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
/**
 * Read HTML snapshot content (handles gzip compression)
 */
async function readSnapshotContent(sessionDir, snapshotPath) {
    try {
        const fullPath = path.join(sessionDir, snapshotPath);
        // Check if file exists (try both compressed and uncompressed)
        let actualPath = fullPath;
        if (!fs.existsSync(actualPath)) {
            // Try with .gz extension
            if (fs.existsSync(fullPath + '.gz')) {
                actualPath = fullPath + '.gz';
            }
            else if (fullPath.endsWith('.gz') && fs.existsSync(fullPath.replace('.gz', ''))) {
                actualPath = fullPath.replace('.gz', '');
            }
            else {
                return null;
            }
        }
        const content = fs.readFileSync(actualPath);
        // Decompress if gzipped
        if (actualPath.endsWith('.gz')) {
            const decompressed = await gunzipAsync(content);
            return decompressed.toString('utf-8');
        }
        return content.toString('utf-8');
    }
    catch {
        return null;
    }
}
/**
 * Get action type display name
 */
function getActionTypeName(action) {
    switch (action.type) {
        case 'click': return 'Click';
        case 'input': return 'Input';
        case 'change': return 'Change';
        case 'submit': return 'Submit';
        case 'keydown': return 'Keydown';
        case 'scroll': return 'Scroll';
        case 'navigation': return 'Navigation';
        case 'voice_transcript': return 'Voice';
        case 'media': return `Media (${action.media.event})`;
        case 'download': return `Download (${action.download.state})`;
        case 'fullscreen': return `Fullscreen (${action.fullscreen.state})`;
        case 'print': return `Print (${action.print.event})`;
        default: return action.type;
    }
}
/**
 * Generate markdown for a single action
 */
async function generateActionMarkdown(action, sessionDir, voiceByActionId) {
    const lines = [];
    const timestamp = formatTimestamp(action.timestamp);
    const actionType = getActionTypeName(action);
    lines.push(`### ${timestamp} - ${actionType}`);
    lines.push('');
    // Handle different action types
    if (action.type === 'navigation') {
        const nav = action;
        if (nav.navigation.navigationType === 'initial') {
            lines.push(`Navigated to **${nav.navigation.toUrl}**`);
        }
        else {
            lines.push(`Navigated from ${nav.navigation.fromUrl || '(new tab)'} to **${nav.navigation.toUrl}**`);
        }
        // Add snapshot table if available
        if (nav.snapshot) {
            lines.push('');
            lines.push('| Type | Screenshot | HTML Snapshot |');
            lines.push('|------|------------|---------------|');
            lines.push(`| Page | [View](${nav.snapshot.screenshot}) | [View](${nav.snapshot.html}) |`);
        }
    }
    else if (action.type === 'voice_transcript') {
        const voice = action;
        lines.push(`> ${voice.transcript.text}`);
    }
    else if (action.type === 'media') {
        const media = action;
        lines.push(`Media **${media.media.event}** on ${media.media.mediaType}`);
        if (media.media.src) {
            lines.push(`Source: ${media.media.src}`);
        }
        if (media.snapshot) {
            lines.push('');
            lines.push(`[Screenshot](${media.snapshot.screenshot})`);
        }
    }
    else if (action.type === 'download') {
        const download = action;
        lines.push(`Download **${download.download.state}**: ${download.download.suggestedFilename}`);
        if (download.download.error) {
            lines.push(`Error: ${download.download.error}`);
        }
        if (download.snapshot) {
            lines.push('');
            lines.push(`[Screenshot](${download.snapshot.screenshot})`);
        }
    }
    else if (action.type === 'fullscreen') {
        const fs = action;
        lines.push(`Fullscreen **${fs.fullscreen.state}**${fs.fullscreen.element ? ` (${fs.fullscreen.element})` : ''}`);
        if (fs.snapshot) {
            lines.push('');
            lines.push(`[Screenshot](${fs.snapshot.screenshot})`);
        }
    }
    else if (action.type === 'print') {
        const print = action;
        lines.push(`Print event: **${print.print.event}**`);
        if (print.snapshot) {
            lines.push('');
            lines.push(`[Screenshot](${print.snapshot.screenshot})`);
        }
    }
    else {
        // RecordedAction (click, input, etc.)
        const recorded = action;
        // Try to extract element context from before snapshot
        let elementDescription = 'element';
        const beforeHtml = await readSnapshotContent(sessionDir, recorded.before.html);
        if (beforeHtml) {
            const context = (0, elementContext_1.extractElementContext)(beforeHtml);
            elementDescription = (0, elementContext_1.formatElementContext)(context);
        }
        // Format action description
        switch (recorded.type) {
            case 'click':
                lines.push(`Clicked **${elementDescription}**`);
                break;
            case 'input':
                lines.push(`Typed "${recorded.action.value || ''}" into **${elementDescription}**`);
                break;
            case 'change':
                lines.push(`Changed **${elementDescription}**${recorded.action.value ? ` to "${recorded.action.value}"` : ''}`);
                break;
            case 'submit':
                lines.push(`Submitted **${elementDescription}**`);
                break;
            case 'keydown':
                lines.push(`Pressed **${recorded.action.key || 'key'}** on **${elementDescription}**`);
                break;
            case 'scroll':
                lines.push(`Scrolled **${elementDescription}**`);
                break;
            default:
                lines.push(`Interacted with **${elementDescription}**`);
        }
        // Add before/after table
        lines.push('');
        lines.push('| Type | Screenshot | HTML Snapshot |');
        lines.push('|------|------------|---------------|');
        lines.push(`| Before | [View](${recorded.before.screenshot}) | [View](${recorded.before.html}) |`);
        lines.push(`| After | [View](${recorded.after.screenshot}) | [View](${recorded.after.html}) |`);
    }
    // Add associated voice context (FR-3.3)
    const associatedVoice = voiceByActionId.get(action.id);
    if (associatedVoice && associatedVoice.length > 0) {
        lines.push('');
        for (const voice of associatedVoice) {
            lines.push(`> *Voice context*: "${voice.transcript.text}"`);
        }
    }
    lines.push('');
    return lines.join('\n');
}
/**
 * Generate actions.md content from session data
 */
async function generateActionsMarkdown(sessionData, sessionDir) {
    const lines = [];
    // Header
    lines.push('# Session Actions');
    lines.push('');
    // Metadata
    lines.push(`**Session ID**: ${sessionData.sessionId}`);
    if (sessionData.startTime && sessionData.endTime) {
        const duration = formatDuration(sessionData.startTime, sessionData.endTime);
        const startFormatted = formatTimestamp(sessionData.startTime);
        const endFormatted = formatTimestamp(sessionData.endTime);
        lines.push(`**Duration**: ${duration} (${startFormatted} - ${endFormatted})`);
    }
    // Count non-voice actions
    const nonVoiceActions = sessionData.actions.filter(a => a.type !== 'voice_transcript');
    lines.push(`**Total Actions**: ${nonVoiceActions.length}`);
    lines.push('');
    lines.push('---');
    lines.push('');
    // Build map of voice actions by associated action ID
    const voiceByActionId = new Map();
    for (const action of sessionData.actions) {
        if (action.type === 'voice_transcript') {
            const voice = action;
            if (voice.associatedActionId) {
                const existing = voiceByActionId.get(voice.associatedActionId) || [];
                existing.push(voice);
                voiceByActionId.set(voice.associatedActionId, existing);
            }
        }
    }
    // Timeline
    lines.push('## Timeline');
    lines.push('');
    // Generate markdown for each action (skip voice-only actions that are associated)
    for (const action of sessionData.actions) {
        // Skip voice transcripts that are associated with other actions
        if (action.type === 'voice_transcript') {
            const voice = action;
            if (voice.associatedActionId) {
                continue; // Will be shown inline with associated action
            }
        }
        const actionMarkdown = await generateActionMarkdown(action, sessionDir, voiceByActionId);
        lines.push(actionMarkdown);
    }
    return lines.join('\n');
}
/**
 * Read session.json and generate actions.md
 *
 * @param sessionDir - Path to the session directory
 * @returns Path to generated actions.md, or null if generation fails
 */
async function generateActionsMarkdownFile(sessionDir) {
    const sessionJsonPath = path.join(sessionDir, 'session.json');
    // Check if session.json exists
    if (!fs.existsSync(sessionJsonPath)) {
        console.log('📝 No session.json found, skipping actions.md generation');
        return null;
    }
    try {
        // Read session.json
        const sessionData = JSON.parse(fs.readFileSync(sessionJsonPath, 'utf-8'));
        // Generate markdown
        const markdown = await generateActionsMarkdown(sessionData, sessionDir);
        // Write actions.md
        const outputPath = path.join(sessionDir, 'actions.md');
        fs.writeFileSync(outputPath, markdown, 'utf-8');
        console.log(`📝 Generated actions.md`);
        return outputPath;
    }
    catch (error) {
        console.error('❌ Failed to generate actions.md:', error);
        return null;
    }
}
//# sourceMappingURL=actionsToMarkdown.js.map