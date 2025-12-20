import { Rnd } from 'react-rnd';
import type { CanvasComponent } from '../../types/ui-builder';
import { ComponentRenderer } from './ComponentRenderer';
import { ResizeHandles, resizeHandleStyles } from './ResizeHandle';

interface ResizableComponentProps {
  component: CanvasComponent;
  isSelected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<CanvasComponent>) => void;
  children?: React.ReactNode;
}

export function ResizableComponent({
  component,
  isSelected,
  disabled = false,
  onSelect,
  onUpdate,
  children,
}: ResizableComponentProps) {
  return (
    <Rnd
      position={{ x: component.x, y: component.y }}
      size={{ width: component.width, height: component.height }}
      minWidth={50}
      minHeight={30}
      bounds="parent"
      disableDragging={disabled || component.locked}
      enableResizing={!disabled && !component.locked}
      onDragStop={(_e, d) => {
        onUpdate({ x: d.x, y: d.y });
      }}
      onResizeStop={(_e, _direction, ref, _delta, position) => {
        onUpdate({
          width: parseInt(ref.style.width),
          height: parseInt(ref.style.height),
          x: position.x,
          y: position.y,
        });
      }}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`transition-shadow ${
        isSelected
          ? 'ring-2 ring-blue-500 shadow-lg'
          : 'hover:ring-1 hover:ring-gray-400'
      } ${disabled ? 'pointer-events-none' : 'cursor-move'}`}
      style={{
        backgroundColor: component.properties.backgroundColor,
        padding: component.properties.padding,
        borderRadius: '4px',
        zIndex: component.zIndex || 1,
      }}
      resizeHandleStyles={resizeHandleStyles}
      resizeHandleComponent={
        isSelected
          ? {
              topLeft: <ResizeHandles.topLeft />,
              top: <ResizeHandles.top />,
              topRight: <ResizeHandles.topRight />,
              right: <ResizeHandles.right />,
              bottomRight: <ResizeHandles.bottomRight />,
              bottom: <ResizeHandles.bottom />,
              bottomLeft: <ResizeHandles.bottomLeft />,
              left: <ResizeHandles.left />,
            }
          : undefined
      }
    >
      <ComponentRenderer component={component} />
      {children}
    </Rnd>
  );
}
