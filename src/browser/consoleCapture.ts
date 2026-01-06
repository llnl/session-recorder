/**
 * Browser-side console capture - Intercepts console methods to log output
 * Captures log, error, warn, info, debug with argument serialization and stack traces
 */

export interface ConsoleEntry {
  level: 'log' | 'error' | 'warn' | 'info' | 'debug';
  timestamp: string; // ISO 8601 UTC
  args: any[]; // Serialized arguments
  stack?: string; // For error/warn
}

export function createConsoleCapture() {
  // Store original console methods
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug
  };

  let isCapturing = false;

  function serializeArgument(arg: any): any {
    // Handle primitives
    if (arg === null) return null;
    if (arg === undefined) return { __type: 'undefined' };

    const type = typeof arg;
    if (type === 'string' || type === 'number' || type === 'boolean') {
      return arg;
    }

    // Handle functions
    if (type === 'function') {
      return {
        __type: 'function',
        name: arg.name || '(anonymous)',
        toString: arg.toString().substring(0, 100) // First 100 chars
      };
    }

    // Handle Date objects
    if (arg instanceof Date) {
      return {
        __type: 'Date',
        value: arg.toISOString()
      };
    }

    // Handle Error objects
    if (arg instanceof Error) {
      return {
        __type: 'Error',
        name: arg.name,
        message: arg.message,
        stack: arg.stack
      };
    }

    // Handle RegExp
    if (arg instanceof RegExp) {
      return {
        __type: 'RegExp',
        source: arg.source,
        flags: arg.flags
      };
    }

    // Handle DOM elements
    if (arg instanceof Element) {
      return {
        __type: 'Element',
        tagName: arg.tagName,
        id: arg.id,
        className: arg.className,
        outerHTML: arg.outerHTML.substring(0, 200) // First 200 chars
      };
    }

    // Handle arrays (with circular reference protection)
    if (Array.isArray(arg)) {
      try {
        return arg.map(item => serializeArgument(item));
      } catch (e) {
        return { __type: 'Array', __error: 'Failed to serialize array' };
      }
    }

    // Handle objects (with circular reference protection)
    if (type === 'object') {
      try {
        // Use JSON.parse(JSON.stringify()) for circular reference handling
        const seen = new WeakSet();
        return JSON.parse(JSON.stringify(arg, (key, value) => {
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular]';
            }
            seen.add(value);
          }
          return value;
        }));
      } catch (e) {
        return {
          __type: 'Object',
          __error: 'Failed to serialize object',
          constructor: arg.constructor?.name || 'Object'
        };
      }
    }

    // Fallback
    return String(arg);
  }

  function captureStackTrace(): string | undefined {
    try {
      const err = new Error();
      const stack = err.stack || '';
      // Remove the first 3 lines (Error, captureStackTrace, interceptConsole)
      const lines = stack.split('\n');
      return lines.slice(3).join('\n');
    } catch (e) {
      return undefined;
    }
  }

  function interceptConsole(
    level: 'log' | 'error' | 'warn' | 'info' | 'debug',
    args: any[]
  ) {
    // Avoid infinite loops if our code logs something
    if (isCapturing) return;
    isCapturing = true;

    try {
      // Serialize all arguments
      const serializedArgs = args.map(arg => serializeArgument(arg));

      // Capture stack trace for errors and warnings
      const stack = (level === 'error' || level === 'warn')
        ? captureStackTrace()
        : undefined;

      // Create console entry
      const entry: ConsoleEntry = {
        level,
        timestamp: new Date().toISOString(),
        args: serializedArgs,
        stack
      };

      // Send to Node.js (async, non-blocking)
      if ((window as any).__recordConsoleLog) {
        (window as any).__recordConsoleLog(entry).catch((err: Error) => {
          // Use original console to avoid recursion
          originalConsole.error('Failed to record console log:', err);
        });
      }
    } catch (err) {
      // Use original console to avoid recursion
      originalConsole.error('Console capture error:', err);
    } finally {
      isCapturing = false;
    }
  }

  function startCapture() {
    // Override console methods
    console.log = function(...args: any[]) {
      originalConsole.log.apply(console, args);
      interceptConsole('log', args);
    };

    console.error = function(...args: any[]) {
      originalConsole.error.apply(console, args);
      interceptConsole('error', args);
    };

    console.warn = function(...args: any[]) {
      originalConsole.warn.apply(console, args);
      interceptConsole('warn', args);
    };

    console.info = function(...args: any[]) {
      originalConsole.info.apply(console, args);
      interceptConsole('info', args);
    };

    console.debug = function(...args: any[]) {
      originalConsole.debug.apply(console, args);
      interceptConsole('debug', args);
    };

    originalConsole.log('✅ Console capture installed');
  }

  function stopCapture() {
    // Restore original console methods
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;

    originalConsole.log('✅ Console capture removed');
  }

  return { startCapture, stopCapture };
}
