/**
 * useLazyResource Hook
 *
 * React hook for lazy loading resources (screenshots, snapshots) using
 * IntersectionObserver to load when elements come into view.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSessionStore } from '@/stores/sessionStore';

export interface UseLazyResourceOptions {
  /** Root margin for IntersectionObserver (default: '100px') */
  rootMargin?: string;
  /** Threshold for IntersectionObserver (default: 0) */
  threshold?: number;
  /** Whether lazy loading is enabled (default: true) */
  enabled?: boolean;
}

export interface UseLazyResourceResult {
  /** The loaded blob, or null if not yet loaded */
  blob: Blob | null;
  /** Whether the resource is currently loading */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Ref to attach to the element for intersection observation */
  ref: React.RefCallback<HTMLElement>;
  /** Object URL for the blob (for use in img src, etc.) */
  url: string | null;
}

/**
 * Hook for lazy loading a single resource
 */
export function useLazyResource(
  resourcePath: string | null | undefined,
  options: UseLazyResourceOptions = {}
): UseLazyResourceResult {
  const { rootMargin = '100px', threshold = 0, enabled } = options;

  const [blob, setBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [isInView, setIsInView] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  const storeLazyLoadEnabled = useSessionStore((state) => state.lazyLoadEnabled);
  // Use explicit enabled option if provided, otherwise fall back to store value
  const lazyLoadEnabled = enabled !== undefined ? enabled : storeLazyLoadEnabled;
  const resources = useSessionStore((state) => state.resources);
  const getResourceLazy = useSessionStore((state) => state.getResourceLazy);

  // Create ref callback for the element
  const setRef = useCallback((element: HTMLElement | null) => {
    // Clean up old observer
    if (observerRef.current && elementRef.current) {
      observerRef.current.unobserve(elementRef.current);
    }

    elementRef.current = element;

    if (element && lazyLoadEnabled) {
      // Create new observer
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry?.isIntersecting) {
            setIsInView(true);
          }
        },
        { rootMargin, threshold }
      );
      observerRef.current.observe(element);
    }
  }, [lazyLoadEnabled, rootMargin, threshold]);

  // Load resource when in view
  useEffect(() => {
    if (!resourcePath) {
      setBlob(null);
      setUrl(null);
      return;
    }

    // If lazy loading is disabled, try to get from resources directly
    if (!lazyLoadEnabled) {
      const cachedBlob = resources.get(resourcePath);
      if (cachedBlob) {
        setBlob(cachedBlob);
        const newUrl = URL.createObjectURL(cachedBlob);
        setUrl(newUrl);
        return () => URL.revokeObjectURL(newUrl);
      }
      return;
    }

    // Check if already cached
    const cachedBlob = resources.get(resourcePath);
    if (cachedBlob) {
      setBlob(cachedBlob);
      const newUrl = URL.createObjectURL(cachedBlob);
      setUrl(newUrl);
      return () => URL.revokeObjectURL(newUrl);
    }

    // Only load if in view
    if (!isInView) {
      return;
    }

    let cancelled = false;

    const loadResource = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const loadedBlob = await getResourceLazy(resourcePath);

        if (cancelled) return;

        if (loadedBlob) {
          setBlob(loadedBlob);
          const newUrl = URL.createObjectURL(loadedBlob);
          setUrl(newUrl);
        } else {
          setError('Failed to load resource');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadResource();

    return () => {
      cancelled = true;
    };
  }, [resourcePath, isInView, lazyLoadEnabled, resources, getResourceLazy]);

  // Clean up URL on unmount or when blob changes
  useEffect(() => {
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [url]);

  // Clean up observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    blob,
    isLoading,
    error,
    ref: setRef,
    url,
  };
}

/**
 * Hook for preloading resources around the current selection
 */
export function usePreloadResources(currentIndex: number | null): void {
  const preloadResourcesAround = useSessionStore((state) => state.preloadResourcesAround);
  const lazyLoadEnabled = useSessionStore((state) => state.lazyLoadEnabled);

  useEffect(() => {
    if (currentIndex !== null && lazyLoadEnabled) {
      preloadResourcesAround(currentIndex);
    }
  }, [currentIndex, lazyLoadEnabled, preloadResourcesAround]);
}

/**
 * Loading spinner component for lazy resources
 */
export function LazyResourcePlaceholder({ className }: { className?: string }) {
  return (
    <div className={`lazy-resource-placeholder ${className || ''}`}>
      <div className="lazy-loading-spinner">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" opacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 12 12"
              to="360 12 12"
              dur="1s"
              repeatCount="indefinite"
            />
          </path>
        </svg>
      </div>
    </div>
  );
}

export default useLazyResource;
