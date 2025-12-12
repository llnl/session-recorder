/**
 * LazyThumbnail Component
 *
 * Renders a lazy-loaded thumbnail image for the timeline.
 * Uses IntersectionObserver to load images only when they come into view.
 */

import { useLazyResource } from '@/hooks/useLazyResource';
import './LazyThumbnail.css';

interface LazyThumbnailProps {
  /** Path to the screenshot resource */
  screenshotPath: string | null;
  /** Alt text for the image */
  alt: string;
  /** Index number to show as placeholder */
  index: number;
  /** Whether this thumbnail is selected */
  isSelected?: boolean;
  /** Whether this thumbnail is hovered */
  isHovered?: boolean;
  /** Style object for positioning */
  style?: React.CSSProperties;
  /** Click handler */
  onClick?: () => void;
  /** Mouse enter handler */
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  /** Mouse leave handler */
  onMouseLeave?: () => void;
}

export function LazyThumbnail({
  screenshotPath,
  alt,
  index,
  isSelected,
  isHovered,
  style,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: LazyThumbnailProps) {
  const { url, isLoading, error, ref } = useLazyResource(screenshotPath, {
    rootMargin: '200px', // Start loading 200px before entering viewport
    threshold: 0,
  });

  const classNames = [
    'timeline-thumbnail',
    isSelected ? 'selected' : '',
    isHovered ? 'hovered' : '',
    isLoading ? 'loading' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={ref}
      className={classNames}
      style={style}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {isLoading && (
        <div className="timeline-thumbnail-loading">
          <div className="loading-spinner" />
        </div>
      )}
      {error && (
        <div className="timeline-thumbnail-error" title={error}>
          ⚠️
        </div>
      )}
      {url ? (
        <img src={url} alt={alt} loading="lazy" />
      ) : (
        !isLoading && !error && (
          <div className="timeline-thumbnail-placeholder">{index + 1}</div>
        )
      )}
    </div>
  );
}

/**
 * LazyPreviewImage Component
 *
 * Used for the hover zoom preview - loads the image lazily
 */
interface LazyPreviewImageProps {
  screenshotPath: string | null;
  alt: string;
  fallbackText?: string;
}

export function LazyPreviewImage({
  screenshotPath,
  alt,
  fallbackText = 'No preview',
}: LazyPreviewImageProps) {
  const { url, isLoading, error } = useLazyResource(screenshotPath, {
    rootMargin: '0px',
    threshold: 0,
  });

  if (isLoading) {
    return (
      <div className="lazy-preview-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className="timeline-hover-zoom-placeholder">{fallbackText}</div>
    );
  }

  return <img src={url} alt={alt} />;
}

export default LazyThumbnail;
