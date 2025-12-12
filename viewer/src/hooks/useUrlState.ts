/**
 * URL State Management Hook
 * Syncs session and action selection with URL parameters for deep linking
 */

import { useEffect, useCallback, useRef } from 'react';

export interface UrlState {
  /** Session ID from URL */
  session: string | null;
  /** Action ID from URL */
  action: string | null;
}

/**
 * Parse URL search parameters
 */
export function parseUrlState(): UrlState {
  const params = new URLSearchParams(window.location.search);
  return {
    session: params.get('session'),
    action: params.get('action'),
  };
}

/**
 * Build URL search string from state
 */
function buildUrlSearch(state: Partial<UrlState>): string {
  const params = new URLSearchParams();

  if (state.session) {
    params.set('session', state.session);
  }
  if (state.action) {
    params.set('action', state.action);
  }

  const search = params.toString();
  return search ? `?${search}` : '';
}

/**
 * Hook for managing URL state
 * Provides methods to update URL without page reload
 */
export function useUrlState() {
  const isInitialMount = useRef(true);

  /**
   * Update URL with new session ID
   * Clears action param when session changes
   */
  const setSessionInUrl = useCallback((sessionId: string | null) => {
    const newSearch = sessionId ? buildUrlSearch({ session: sessionId }) : '';
    const newUrl = `${window.location.pathname}${newSearch}`;

    // Use replaceState for initial load, pushState for subsequent changes
    if (isInitialMount.current) {
      window.history.replaceState({ session: sessionId }, '', newUrl);
      isInitialMount.current = false;
    } else {
      window.history.pushState({ session: sessionId }, '', newUrl);
    }
  }, []);

  /**
   * Update URL with action ID
   * Preserves session param
   */
  const setActionInUrl = useCallback((actionId: string | null) => {
    const currentState = parseUrlState();

    if (!currentState.session) {
      // No session in URL, don't add action
      return;
    }

    const newSearch = buildUrlSearch({
      session: currentState.session,
      action: actionId ?? undefined,
    });
    const newUrl = `${window.location.pathname}${newSearch}`;

    // Use replaceState for action changes to avoid cluttering history
    window.history.replaceState(
      { session: currentState.session, action: actionId },
      '',
      newUrl
    );
  }, []);

  /**
   * Clear all URL state
   */
  const clearUrlState = useCallback(() => {
    const newUrl = window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, []);

  /**
   * Get current URL state
   */
  const getUrlState = useCallback((): UrlState => {
    return parseUrlState();
  }, []);

  return {
    setSessionInUrl,
    setActionInUrl,
    clearUrlState,
    getUrlState,
  };
}

/**
 * Hook to listen for browser back/forward navigation
 */
export function useUrlNavigation(
  onSessionChange: (sessionId: string | null) => void,
  onActionChange: (actionId: string | null) => void
) {
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = parseUrlState();

      // Check what changed
      const prevState = event.state as UrlState | null;

      if (prevState?.session !== state.session) {
        onSessionChange(state.session);
      }

      if (prevState?.action !== state.action) {
        onActionChange(state.action);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onSessionChange, onActionChange]);
}
