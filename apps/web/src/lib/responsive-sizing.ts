import type { ResponsiveSize, ResponsiveConstraints } from '../types/ui-builder';

/**
 * Convert a ResponsiveSize to a pixel value
 */
export function calculateResponsiveSize(
  size: ResponsiveSize | undefined,
  fallbackPx: number,
  parentSize: number
): number {
  if (!size) return fallbackPx;

  switch (size.unit) {
    case 'px':
      return size.value;
    case '%':
      return (size.value / 100) * parentSize;
    case 'auto':
      return fallbackPx;
    default:
      return fallbackPx;
  }
}

/**
 * Convert a pixel value to a ResponsiveSize
 */
export function pxToResponsiveSize(value: number): ResponsiveSize {
  return { value, unit: 'px' };
}

/**
 * Convert a percentage value to a ResponsiveSize
 */
export function percentToResponsiveSize(value: number): ResponsiveSize {
  return { value, unit: '%' };
}

/**
 * Format a ResponsiveSize for display
 */
export function formatResponsiveSize(size: ResponsiveSize | undefined): string {
  if (!size) return 'auto';
  if (size.unit === 'auto') return 'auto';
  return `${size.value}${size.unit}`;
}

/**
 * Apply constraints to width/height values
 */
export function applyConstraints(
  width: number,
  height: number,
  constraints: ResponsiveConstraints | undefined,
  parentWidth: number,
  parentHeight: number
): { width: number; height: number } {
  if (!constraints) return { width, height };

  let constrainedWidth = width;
  let constrainedHeight = height;

  // Apply min/max width
  if (constraints.minWidth) {
    const minW = calculateResponsiveSize(constraints.minWidth, 0, parentWidth);
    constrainedWidth = Math.max(constrainedWidth, minW);
  }
  if (constraints.maxWidth) {
    const maxW = calculateResponsiveSize(constraints.maxWidth, Infinity, parentWidth);
    constrainedWidth = Math.min(constrainedWidth, maxW);
  }

  // Apply min/max height
  if (constraints.minHeight) {
    const minH = calculateResponsiveSize(constraints.minHeight, 0, parentHeight);
    constrainedHeight = Math.max(constrainedHeight, minH);
  }
  if (constraints.maxHeight) {
    const maxH = calculateResponsiveSize(constraints.maxHeight, Infinity, parentHeight);
    constrainedHeight = Math.min(constrainedHeight, maxH);
  }

  // Apply aspect ratio (width takes precedence)
  if (constraints.aspectRatio && constraints.aspectRatio > 0) {
    constrainedHeight = constrainedWidth / constraints.aspectRatio;

    // Re-apply height constraints after aspect ratio
    if (constraints.minHeight) {
      const minH = calculateResponsiveSize(constraints.minHeight, 0, parentHeight);
      if (constrainedHeight < minH) {
        constrainedHeight = minH;
        constrainedWidth = constrainedHeight * constraints.aspectRatio;
      }
    }
    if (constraints.maxHeight) {
      const maxH = calculateResponsiveSize(constraints.maxHeight, Infinity, parentHeight);
      if (constrainedHeight > maxH) {
        constrainedHeight = maxH;
        constrainedWidth = constrainedHeight * constraints.aspectRatio;
      }
    }
  }

  return { width: constrainedWidth, height: constrainedHeight };
}

/**
 * Convert pixel dimensions to percentage of parent
 */
export function pxToPercent(pxValue: number, parentSize: number): number {
  if (parentSize === 0) return 0;
  return (pxValue / parentSize) * 100;
}

/**
 * Convert percentage to pixel dimensions
 */
export function percentToPx(percentValue: number, parentSize: number): number {
  return (percentValue / 100) * parentSize;
}

/**
 * Create default constraints for a component
 */
export function createDefaultConstraints(): ResponsiveConstraints {
  return {
    minWidth: { value: 50, unit: 'px' },
    minHeight: { value: 30, unit: 'px' },
    aspectRatio: null,
  };
}

/**
 * Calculate new dimensions when resizing with aspect ratio lock
 */
export function resizeWithAspectRatio(
  originalWidth: number,
  originalHeight: number,
  newWidth: number,
  newHeight: number,
  handle: string,
  aspectRatio: number
): { width: number; height: number } {
  // Corner handles: use the larger change
  if (['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].includes(handle)) {
    const widthChange = Math.abs(newWidth - originalWidth);
    const heightChange = Math.abs(newHeight - originalHeight);

    if (widthChange > heightChange) {
      return { width: newWidth, height: newWidth / aspectRatio };
    } else {
      return { width: newHeight * aspectRatio, height: newHeight };
    }
  }

  // Edge handles: adjust the perpendicular dimension
  if (['left', 'right'].includes(handle)) {
    return { width: newWidth, height: newWidth / aspectRatio };
  }
  if (['top', 'bottom'].includes(handle)) {
    return { width: newHeight * aspectRatio, height: newHeight };
  }

  return { width: newWidth, height: newHeight };
}
