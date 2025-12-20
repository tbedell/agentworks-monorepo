import { cn } from '../../lib/utils';

interface ResizeHandleProps {
  position: 'top' | 'right' | 'bottom' | 'left' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  isVisible?: boolean;
}

export function ResizeHandle({ position, isVisible = true }: ResizeHandleProps) {
  if (!isVisible) return null;

  const isCorner = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].includes(position);
  const isHorizontal = ['top', 'bottom'].includes(position);
  const isVertical = ['left', 'right'].includes(position);

  const baseStyles = 'absolute bg-white border-2 border-blue-500 shadow-md transition-transform hover:scale-125 z-50';

  // Corner handles: circles
  if (isCorner) {
    const positionStyles = {
      topLeft: '-top-2 -left-2',
      topRight: '-top-2 -right-2',
      bottomLeft: '-bottom-2 -left-2',
      bottomRight: '-bottom-2 -right-2',
    };

    return (
      <div
        className={cn(
          baseStyles,
          'w-4 h-4 rounded-full',
          positionStyles[position as keyof typeof positionStyles]
        )}
      />
    );
  }

  // Edge handles: pills
  if (isHorizontal) {
    const positionStyles = {
      top: '-top-1.5 left-1/2 -translate-x-1/2',
      bottom: '-bottom-1.5 left-1/2 -translate-x-1/2',
    };

    return (
      <div
        className={cn(
          baseStyles,
          'w-8 h-3 rounded-full',
          positionStyles[position as keyof typeof positionStyles]
        )}
      />
    );
  }

  if (isVertical) {
    const positionStyles = {
      left: '-left-1.5 top-1/2 -translate-y-1/2',
      right: '-right-1.5 top-1/2 -translate-y-1/2',
    };

    return (
      <div
        className={cn(
          baseStyles,
          'w-3 h-8 rounded-full',
          positionStyles[position as keyof typeof positionStyles]
        )}
      />
    );
  }

  return null;
}

// Pre-configured handle components for react-rnd
export const ResizeHandles = {
  topLeft: () => <ResizeHandle position="topLeft" />,
  top: () => <ResizeHandle position="top" />,
  topRight: () => <ResizeHandle position="topRight" />,
  right: () => <ResizeHandle position="right" />,
  bottomRight: () => <ResizeHandle position="bottomRight" />,
  bottom: () => <ResizeHandle position="bottom" />,
  bottomLeft: () => <ResizeHandle position="bottomLeft" />,
  left: () => <ResizeHandle position="left" />,
};

// Resize handle styles with larger hit areas for react-rnd
export const resizeHandleStyles = {
  top: {
    height: 20,
    top: -10,
    cursor: 'n-resize',
    left: '10%',
    right: '10%',
    width: '80%',
  },
  right: {
    width: 20,
    right: -10,
    cursor: 'e-resize',
    top: '10%',
    bottom: '10%',
    height: '80%',
  },
  bottom: {
    height: 20,
    bottom: -10,
    cursor: 's-resize',
    left: '10%',
    right: '10%',
    width: '80%',
  },
  left: {
    width: 20,
    left: -10,
    cursor: 'w-resize',
    top: '10%',
    bottom: '10%',
    height: '80%',
  },
  topRight: {
    width: 20,
    height: 20,
    top: -10,
    right: -10,
    cursor: 'ne-resize',
  },
  bottomRight: {
    width: 20,
    height: 20,
    bottom: -10,
    right: -10,
    cursor: 'se-resize',
  },
  bottomLeft: {
    width: 20,
    height: 20,
    bottom: -10,
    left: -10,
    cursor: 'sw-resize',
  },
  topLeft: {
    width: 20,
    height: 20,
    top: -10,
    left: -10,
    cursor: 'nw-resize',
  },
};
