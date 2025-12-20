import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Grid3X3 } from 'lucide-react';

interface Position {
  x: number;
  y: number;
}

interface InfiniteCanvasProps {
  children: React.ReactNode;
  /** Called when canvas is panned */
  onPan?: (offset: Position) => void;
  /** Called when canvas is zoomed */
  onZoom?: (scale: number) => void;
  /** Show grid background */
  showGrid?: boolean;
  /** Enable snap-to-grid when dragging elements */
  snapToGrid?: boolean;
  /** Grid size in pixels */
  gridSize?: number;
  /** Initial zoom level (default 1) */
  initialZoom?: number;
  /** Initial pan offset */
  initialOffset?: Position;
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Show minimap navigation */
  showMinimap?: boolean;
  /** Show zoom controls */
  showControls?: boolean;
  /** Canvas background color */
  backgroundColor?: string;
  /** Grid line color */
  gridColor?: string;
  /** Additional class names */
  className?: string;
}

const DEFAULT_GRID_SIZE = 20;
const DEFAULT_MIN_ZOOM = 0.1;
const DEFAULT_MAX_ZOOM = 4;
const ZOOM_SENSITIVITY = 0.001;

export default function InfiniteCanvas({
  children,
  onPan,
  onZoom,
  showGrid = true,
  snapToGrid = false,
  gridSize = DEFAULT_GRID_SIZE,
  initialZoom = 1,
  initialOffset = { x: 0, y: 0 },
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
  showMinimap = true,
  showControls = true,
  backgroundColor = '#f8fafc',
  gridColor = '#e2e8f0',
  className = '',
}: InfiniteCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(initialZoom);
  const [offset, setOffset] = useState<Position>(initialOffset);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Position>({ x: 0, y: 0 });
  const [showGridState, setShowGridState] = useState(showGrid);

  // Calculate snapped position
  const snapPosition = useCallback(
    (pos: Position): Position => {
      if (!snapToGrid) return pos;
      return {
        x: Math.round(pos.x / gridSize) * gridSize,
        y: Math.round(pos.y / gridSize) * gridSize,
      };
    },
    [snapToGrid, gridSize]
  );

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Mouse position relative to container
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate new zoom
      const delta = -e.deltaY * ZOOM_SENSITIVITY;
      const newZoom = Math.min(maxZoom, Math.max(minZoom, zoom * (1 + delta)));

      // Adjust offset to zoom toward mouse position
      const zoomRatio = newZoom / zoom;
      const newOffset = {
        x: mouseX - (mouseX - offset.x) * zoomRatio,
        y: mouseY - (mouseY - offset.y) * zoomRatio,
      };

      setZoom(newZoom);
      setOffset(newOffset);
      onZoom?.(newZoom);
      onPan?.(newOffset);
    },
    [zoom, offset, minZoom, maxZoom, onZoom, onPan]
  );

  // Handle pan start
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only pan with middle mouse button or space+click
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        setIsPanning(true);
        setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      }
    },
    [offset]
  );

  // Handle pan move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;

      const newOffset = {
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      };
      setOffset(newOffset);
      onPan?.(newOffset);
    },
    [isPanning, panStart, onPan]
  );

  // Handle pan end
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Handle zoom controls
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(maxZoom, zoom * 1.2);
    setZoom(newZoom);
    onZoom?.(newZoom);
  }, [zoom, maxZoom, onZoom]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(minZoom, zoom / 1.2);
    setZoom(newZoom);
    onZoom?.(newZoom);
  }, [zoom, minZoom, onZoom]);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    onZoom?.(1);
    onPan?.({ x: 0, y: 0 });
  }, [onZoom, onPan]);

  // Add global mouse up listener for pan
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsPanning(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Grid pattern
  const gridPattern = showGridState ? (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    >
      <defs>
        <pattern
          id="grid-pattern"
          width={gridSize * zoom}
          height={gridSize * zoom}
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${offset.x % (gridSize * zoom)}, ${offset.y % (gridSize * zoom)})`}
        >
          <path
            d={`M ${gridSize * zoom} 0 L 0 0 0 ${gridSize * zoom}`}
            fill="none"
            stroke={gridColor}
            strokeWidth={1}
          />
        </pattern>
        <pattern
          id="grid-pattern-large"
          width={gridSize * zoom * 5}
          height={gridSize * zoom * 5}
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${offset.x % (gridSize * zoom * 5)}, ${offset.y % (gridSize * zoom * 5)})`}
        >
          <path
            d={`M ${gridSize * zoom * 5} 0 L 0 0 0 ${gridSize * zoom * 5}`}
            fill="none"
            stroke={gridColor}
            strokeWidth={2}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-pattern)" />
      <rect width="100%" height="100%" fill="url(#grid-pattern-large)" />
    </svg>
  ) : null;

  // Minimap
  const minimap = showMinimap ? (
    <div className="absolute bottom-4 right-4 w-32 h-24 bg-white/90 border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <div className="absolute inset-0 bg-slate-50">
        {/* Simplified content representation */}
        <div
          className="absolute bg-blue-500/20 border border-blue-500/50 rounded"
          style={{
            left: `${50 - (offset.x / 20)}%`,
            top: `${50 - (offset.y / 20)}%`,
            width: `${100 / zoom}%`,
            height: `${100 / zoom}%`,
            transform: 'translate(-50%, -50%)',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        />
      </div>
      <div className="absolute bottom-1 right-1 text-[10px] text-slate-500 font-mono">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  ) : null;

  // Zoom controls
  const controls = showControls ? (
    <div className="absolute top-4 right-4 flex flex-col gap-1 bg-white border border-slate-200 rounded-lg shadow-sm p-1">
      <button
        onClick={handleZoomIn}
        className="p-1.5 hover:bg-slate-100 rounded transition-colors"
        title="Zoom in"
      >
        <ZoomIn className="w-4 h-4 text-slate-600" />
      </button>
      <button
        onClick={handleZoomOut}
        className="p-1.5 hover:bg-slate-100 rounded transition-colors"
        title="Zoom out"
      >
        <ZoomOut className="w-4 h-4 text-slate-600" />
      </button>
      <div className="w-full h-px bg-slate-200" />
      <button
        onClick={handleResetView}
        className="p-1.5 hover:bg-slate-100 rounded transition-colors"
        title="Reset view"
      >
        <Maximize2 className="w-4 h-4 text-slate-600" />
      </button>
      <button
        onClick={() => setShowGridState(!showGridState)}
        className={`p-1.5 rounded transition-colors ${showGridState ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-600'}`}
        title="Toggle grid"
      >
        <Grid3X3 className="w-4 h-4" />
      </button>
    </div>
  ) : null;

  // Context provider for children to access canvas utilities
  const canvasContext = {
    zoom,
    offset,
    snapPosition,
    gridSize,
    toCanvasCoords: (screenX: number, screenY: number): Position => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (screenX - rect.left - offset.x) / zoom,
        y: (screenY - rect.top - offset.y) / zoom,
      };
    },
    toScreenCoords: (canvasX: number, canvasY: number): Position => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: canvasX * zoom + offset.x + rect.left,
        y: canvasY * zoom + offset.y + rect.top,
      };
    },
  };

  return (
    <InfiniteCanvasContext.Provider value={canvasContext}>
      <div
        ref={containerRef}
        className={`relative overflow-hidden select-none ${className}`}
        style={{
          backgroundColor,
          cursor: isPanning ? 'grabbing' : 'default',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {gridPattern}

        {/* Transformed content layer */}
        <div
          className="absolute origin-top-left"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            zIndex: 1,
          }}
        >
          {children}
        </div>

        {controls}
        {minimap}

        {/* Zoom indicator */}
        <div className="absolute bottom-4 left-4 text-xs text-slate-500 font-mono bg-white/80 px-2 py-1 rounded">
          {Math.round(zoom * 100)}% | Pan: Alt+Drag | Zoom: Scroll
        </div>
      </div>
    </InfiniteCanvasContext.Provider>
  );
}

// Context for child components to access canvas utilities
interface CanvasContextValue {
  zoom: number;
  offset: Position;
  snapPosition: (pos: Position) => Position;
  gridSize: number;
  toCanvasCoords: (screenX: number, screenY: number) => Position;
  toScreenCoords: (canvasX: number, canvasY: number) => Position;
}

export const InfiniteCanvasContext = React.createContext<CanvasContextValue>({
  zoom: 1,
  offset: { x: 0, y: 0 },
  snapPosition: (pos) => pos,
  gridSize: DEFAULT_GRID_SIZE,
  toCanvasCoords: () => ({ x: 0, y: 0 }),
  toScreenCoords: () => ({ x: 0, y: 0 }),
});

export function useInfiniteCanvas() {
  return React.useContext(InfiniteCanvasContext);
}
