/**
 * Actions to Markdown - FR-3
 *
 * Converts session.json actions to actions.md with:
 * - Chronological timeline of all actions
 * - Human-readable element descriptions (from FR-1)
 * - Before/After screenshot + HTML links in tables
 * - Inline voice context when associated
 */
/**
 * Session data structure from session.json
 */
interface SessionData {
    sessionId: string;
    startTime: string;
    endTime?: string;
    actions: AnyAction[];
    voiceRecording?: {
        enabled: boolean;
        model?: string;
        device?: string;
        language?: string;
        duration?: number;
    };
}
/**
 * Base action interface
 */
interface BaseAction {
    id: string;
    timestamp: string;
    type: string;
    tabId?: number;
}
/**
 * Recorded action (click, input, etc.)
 */
interface RecordedAction extends BaseAction {
    type: 'click' | 'input' | 'change' | 'submit' | 'keydown' | 'scroll';
    before: {
        html: string;
        screenshot: string;
        url: string;
        viewport?: {
            width: number;
            height: number;
        };
    };
    after: {
        html: string;
        screenshot: string;
        url: string;
        viewport?: {
            width: number;
            height: number;
        };
    };
    action: {
        type: string;
        value?: string;
        key?: string;
        x?: number;
        y?: number;
        button?: string;
        modifiers?: string[];
    };
}
/**
 * Navigation action
 */
interface NavigationAction extends BaseAction {
    type: 'navigation';
    navigation: {
        fromUrl: string;
        toUrl: string;
        navigationType: 'initial' | 'link' | 'typed' | 'reload' | 'back' | 'forward' | 'other';
    };
    snapshot?: {
        html: string;
        screenshot: string;
        url: string;
        viewport?: {
            width: number;
            height: number;
        };
    };
}
/**
 * Voice transcript action
 */
interface VoiceTranscriptAction extends BaseAction {
    type: 'voice_transcript';
    transcript: {
        text: string;
        fullText?: string;
        startTime: string;
        endTime: string;
        confidence?: number;
    };
    associatedActionId?: string;
}
/**
 * Media action
 */
interface MediaAction extends BaseAction {
    type: 'media';
    media: {
        event: string;
        mediaType: string;
        src?: string;
        currentTime?: number;
        duration?: number;
    };
    snapshot?: {
        screenshot: string;
        html?: string;
    };
}
/**
 * Download action
 */
interface DownloadAction extends BaseAction {
    type: 'download';
    download: {
        url: string;
        suggestedFilename: string;
        state: 'started' | 'completed' | 'failed';
        error?: string;
    };
    snapshot?: {
        screenshot: string;
        html?: string;
    };
}
/**
 * Fullscreen action
 */
interface FullscreenAction extends BaseAction {
    type: 'fullscreen';
    fullscreen: {
        state: 'entered' | 'exited';
        element?: string;
    };
    snapshot?: {
        screenshot: string;
        html?: string;
    };
}
/**
 * Print action
 */
interface PrintAction extends BaseAction {
    type: 'print';
    print: {
        event: 'beforeprint' | 'afterprint';
    };
    snapshot?: {
        screenshot: string;
        html?: string;
    };
}
type AnyAction = RecordedAction | NavigationAction | VoiceTranscriptAction | MediaAction | DownloadAction | FullscreenAction | PrintAction;
/**
 * Generate actions.md content from session data
 */
export declare function generateActionsMarkdown(sessionData: SessionData, sessionDir: string): Promise<string>;
/**
 * Read session.json and generate actions.md
 *
 * @param sessionDir - Path to the session directory
 * @returns Path to generated actions.md, or null if generation fails
 */
export declare function generateActionsMarkdownFile(sessionDir: string): Promise<string | null>;
export {};
//# sourceMappingURL=actionsToMarkdown.d.ts.map