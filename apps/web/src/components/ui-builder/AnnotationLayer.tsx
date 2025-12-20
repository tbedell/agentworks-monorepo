import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Canvas, PencilBrush, IText, Line, Rect, Circle as FabricCircle } from 'fabric';
import type { AnnotationSettings } from '../../types/ui-builder';

interface AnnotationLayerProps {
  width: number;
  height: number;
  settings: AnnotationSettings;
  disabled?: boolean;
  onChange?: (json: string) => void;
}

export interface AnnotationLayerRef {
  clear: () => void;
  toJSON: () => string;
  loadJSON: (json: string) => void;
  toDataURL: () => string;
}

// Helper to convert hex color to rgba with opacity
function hexToRgba(hex: string, opacity: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return hex;
}

export const AnnotationLayer = forwardRef<AnnotationLayerRef, AnnotationLayerProps>(
  ({ width, height, settings, disabled = false, onChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<Canvas | null>(null);
    const isDrawingRef = useRef(false);
    const startPointRef = useRef<{ x: number; y: number } | null>(null);
    const tempShapeRef = useRef<Line | Rect | FabricCircle | null>(null);

    // Initialize fabric canvas
    useEffect(() => {
      if (!canvasRef.current || fabricRef.current) return;

      const canvas = new Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor: 'transparent',
        selection: settings.tool === 'select',
      });

      fabricRef.current = canvas;

      return () => {
        canvas.dispose();
        fabricRef.current = null;
      };
    }, []);

    // Update canvas size when dimensions change
    useEffect(() => {
      if (!fabricRef.current) return;
      fabricRef.current.setDimensions({ width, height });
    }, [width, height]);

    // Update canvas settings based on tool
    useEffect(() => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      const isAnnotationMode = settings.tool !== 'select';
      const opacity = settings.opacity ?? 1;

      // Configure selection mode
      canvas.selection = settings.tool === 'select';
      canvas.forEachObject((obj) => {
        obj.selectable = settings.tool === 'select';
        obj.evented = settings.tool === 'select' || settings.tool === 'eraser';
      });

      // Configure drawing mode for pen and highlighter
      if (settings.tool === 'pen' || settings.tool === 'highlighter') {
        canvas.isDrawingMode = true;
        const brush = new PencilBrush(canvas);

        if (settings.tool === 'highlighter') {
          // Highlighter: wider stroke with low opacity
          brush.color = hexToRgba(settings.color, 0.4);
          brush.width = 20;
        } else {
          // Pen: normal stroke with opacity
          brush.color = hexToRgba(settings.color, opacity);
          brush.width = settings.strokeWidth;
        }
        canvas.freeDrawingBrush = brush;
      } else {
        canvas.isDrawingMode = false;
      }

      // Update cursor based on tool
      if (settings.tool === 'eraser') {
        canvas.defaultCursor = 'not-allowed';
        canvas.hoverCursor = 'pointer';
      } else if (isAnnotationMode && settings.tool !== 'pen' && settings.tool !== 'highlighter') {
        canvas.defaultCursor = 'crosshair';
        canvas.hoverCursor = 'crosshair';
      } else if (settings.tool === 'select') {
        canvas.defaultCursor = 'default';
        canvas.hoverCursor = 'move';
      }
    }, [settings]);

    // Handle mouse events for shapes and arrows
    const handleMouseDown = useCallback(
      (e: MouseEvent) => {
        const canvas = fabricRef.current;
        if (!canvas || disabled) return;
        if (settings.tool === 'select' || settings.tool === 'pen' || settings.tool === 'highlighter') return;

        // Use the upper canvas element for accurate bounding rect
        const rect = canvas.upperCanvasEl?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const opacity = settings.opacity ?? 1;

        // Handle eraser tool - remove clicked object
        if (settings.tool === 'eraser') {
          const pointer = canvas.getPointer(e);
          const objects = canvas.getObjects();
          // Find objects that contain the click point
          for (let i = objects.length - 1; i >= 0; i--) {
            const obj = objects[i];
            if (obj.containsPoint(pointer)) {
              canvas.remove(obj);
              canvas.renderAll();
              onChange?.(JSON.stringify(canvas.toJSON()));
              break;
            }
          }
          return;
        }

        isDrawingRef.current = true;
        startPointRef.current = { x, y };

        // Handle text tool
        if (settings.tool === 'text') {
          const text = new IText('Click to edit', {
            left: x,
            top: y,
            fontSize: settings.fontSize || 16,
            fill: hexToRgba(settings.color, opacity),
            fontFamily: 'Arial',
          });
          canvas.add(text);
          canvas.setActiveObject(text);
          text.enterEditing();
          isDrawingRef.current = false;
          onChange?.(JSON.stringify(canvas.toJSON()));
          return;
        }

        // Handle sticky note tool
        if (settings.tool === 'stickyNote') {
          const noteWidth = 150;
          const noteHeight = 100;
          const fillColor = settings.fillColor || '#FEF08A';
          const fontSize = settings.fontSize || 14;

          // Create sticky note background
          const noteRect = new Rect({
            left: x,
            top: y,
            width: noteWidth,
            height: noteHeight,
            fill: hexToRgba(fillColor, opacity),
            stroke: hexToRgba(settings.color, opacity),
            strokeWidth: 1,
            rx: 4,
            ry: 4,
            selectable: false,
          });

          // Create editable text inside
          const noteText = new IText('Note', {
            left: x + 8,
            top: y + 8,
            fontSize,
            fill: '#000000',
            fontFamily: 'Arial',
            width: noteWidth - 16,
          });

          canvas.add(noteRect, noteText);
          canvas.setActiveObject(noteText);
          noteText.enterEditing();
          isDrawingRef.current = false;
          onChange?.(JSON.stringify(canvas.toJSON()));
          return;
        }

        // Handle marker (numbered annotation) tool
        if (settings.tool === 'marker') {
          const markerNumber = settings.markerNumber || 1;
          const markerRadius = 16;

          // Create marker circle
          const markerCircle = new FabricCircle({
            left: x - markerRadius,
            top: y - markerRadius,
            radius: markerRadius,
            fill: hexToRgba(settings.color, opacity),
            stroke: '#FFFFFF',
            strokeWidth: 2,
            selectable: false,
          });

          // Create number text
          const markerText = new IText(markerNumber.toString(), {
            left: x - (markerNumber > 9 ? 8 : 4),
            top: y - 8,
            fontSize: 14,
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            selectable: false,
          });

          // Group them together
          canvas.add(markerCircle, markerText);
          isDrawingRef.current = false;
          onChange?.(JSON.stringify(canvas.toJSON()));
          return;
        }
      },
      [settings, disabled, onChange]
    );

    const handleMouseMove = useCallback(
      (e: MouseEvent) => {
        const canvas = fabricRef.current;
        if (!canvas || !isDrawingRef.current || !startPointRef.current) return;
        // Skip tools that don't need mouse move drawing
        if (['select', 'pen', 'highlighter', 'text', 'eraser', 'stickyNote', 'marker'].includes(settings.tool))
          return;

        // Use the upper canvas element for accurate bounding rect
        const rect = canvas.upperCanvasEl?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const { x: startX, y: startY } = startPointRef.current;
        const opacity = settings.opacity ?? 1;
        const strokeColor = hexToRgba(settings.color, opacity);
        const fillColor = settings.fillEnabled
          ? hexToRgba(settings.fillColor || settings.color, opacity)
          : 'transparent';

        // Remove temp shape
        if (tempShapeRef.current) {
          canvas.remove(tempShapeRef.current);
        }

        let shape: Line | Rect | FabricCircle | null = null;

        if (settings.tool === 'line') {
          // Simple line without arrowhead
          shape = new Line([startX, startY, x, y], {
            stroke: strokeColor,
            strokeWidth: settings.strokeWidth,
            selectable: false,
          });
          canvas.add(shape);
        } else if (settings.tool === 'arrow') {
          // Draw line with arrowhead
          const angle = Math.atan2(y - startY, x - startX);
          const headLength = 15;

          const line = new Line([startX, startY, x, y], {
            stroke: strokeColor,
            strokeWidth: settings.strokeWidth,
            selectable: false,
          });

          // Create arrowhead points
          const headX1 = x - headLength * Math.cos(angle - Math.PI / 6);
          const headY1 = y - headLength * Math.sin(angle - Math.PI / 6);
          const headX2 = x - headLength * Math.cos(angle + Math.PI / 6);
          const headY2 = y - headLength * Math.sin(angle + Math.PI / 6);

          const head1 = new Line([x, y, headX1, headY1], {
            stroke: strokeColor,
            strokeWidth: settings.strokeWidth,
            selectable: false,
          });
          const head2 = new Line([x, y, headX2, headY2], {
            stroke: strokeColor,
            strokeWidth: settings.strokeWidth,
            selectable: false,
          });

          canvas.add(line, head1, head2);
          shape = line;
        } else if (settings.tool === 'rectangle') {
          const width = Math.abs(x - startX);
          const height = Math.abs(y - startY);
          shape = new Rect({
            left: Math.min(startX, x),
            top: Math.min(startY, y),
            width,
            height,
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth: settings.strokeWidth,
            selectable: false,
          });
          canvas.add(shape);
        } else if (settings.tool === 'circle') {
          const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2)) / 2;
          const centerX = (startX + x) / 2;
          const centerY = (startY + y) / 2;
          shape = new FabricCircle({
            left: centerX - radius,
            top: centerY - radius,
            radius,
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth: settings.strokeWidth,
            selectable: false,
          });
          canvas.add(shape);
        }

        tempShapeRef.current = shape;
        canvas.renderAll();
      },
      [settings]
    );

    const handleMouseUp = useCallback(() => {
      const canvas = fabricRef.current;
      if (!canvas || !isDrawingRef.current) return;

      isDrawingRef.current = false;
      startPointRef.current = null;

      // Make shape selectable now
      if (tempShapeRef.current) {
        tempShapeRef.current.selectable = settings.tool === 'select';
        tempShapeRef.current = null;
      }

      onChange?.(JSON.stringify(canvas.toJSON()));
    }, [settings.tool, onChange]);

    // Add mouse event listeners to the Fabric.js upper canvas
    useEffect(() => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      // Get the upper canvas element that Fabric.js creates for interactions
      const upperCanvas = canvas.upperCanvasEl;
      if (!upperCanvas) return;

      upperCanvas.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        upperCanvas.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }, [handleMouseDown, handleMouseMove, handleMouseUp]);

    // Handle path created event for freehand drawing
    useEffect(() => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      const handlePathCreated = () => {
        onChange?.(JSON.stringify(canvas.toJSON()));
      };

      canvas.on('path:created', handlePathCreated);

      return () => {
        canvas.off('path:created', handlePathCreated);
      };
    }, [onChange]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      clear: () => {
        const canvas = fabricRef.current;
        if (canvas) {
          canvas.clear();
          onChange?.('');
        }
      },
      toJSON: () => {
        const canvas = fabricRef.current;
        return canvas ? JSON.stringify(canvas.toJSON()) : '';
      },
      loadJSON: (json: string) => {
        const canvas = fabricRef.current;
        if (canvas && json) {
          try {
            canvas.loadFromJSON(JSON.parse(json), () => {
              canvas.renderAll();
            });
          } catch (e) {
            console.error('Failed to load annotations:', e);
          }
        }
      },
      toDataURL: () => {
        const canvas = fabricRef.current;
        return canvas ? canvas.toDataURL({ format: 'png', multiplier: 1 }) : '';
      },
    }));

    // Determine if annotation mode is active (any tool except 'select')
    const isAnnotationMode = settings.tool !== 'select';
    // Canvas should be interactive when in annotation mode and not disabled
    const isInteractive = isAnnotationMode && !disabled;

    return (
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{
          pointerEvents: isInteractive ? 'auto' : 'none',
          zIndex: isInteractive ? 100 : 1,
        }}
      >
        <canvas ref={canvasRef} />
      </div>
    );
  }
);

AnnotationLayer.displayName = 'AnnotationLayer';
