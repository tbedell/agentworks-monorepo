import { useState } from 'react';
import {
  MousePointer,
  Pencil,
  Type,
  ArrowUpRight,
  Square,
  Circle,
  Trash2,
  Minus,
  Highlighter,
  Eraser,
  StickyNote,
  Hash,
  ChevronDown,
  Droplets,
  PaintBucket,
} from 'lucide-react';
import type { AnnotationTool, AnnotationSettings } from '../../types/ui-builder';
import { ANNOTATION_COLORS, STROKE_WIDTHS, OPACITY_LEVELS, FONT_SIZES } from '../../types/ui-builder';

interface AnnotationToolbarProps {
  settings: AnnotationSettings;
  onSettingsChange: (settings: Partial<AnnotationSettings>) => void;
  onClear: () => void;
}

interface ToolConfig {
  id: AnnotationTool;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  group: 'select' | 'draw' | 'shapes' | 'annotation';
}

const TOOLS: ToolConfig[] = [
  // Selection
  { id: 'select', icon: MousePointer, label: 'Select', group: 'select' },
  // Drawing tools
  { id: 'pen', icon: Pencil, label: 'Pen', group: 'draw' },
  { id: 'highlighter', icon: Highlighter, label: 'Highlighter', group: 'draw' },
  { id: 'eraser', icon: Eraser, label: 'Eraser', group: 'draw' },
  // Shape tools
  { id: 'line', icon: Minus, label: 'Line', group: 'shapes' },
  { id: 'arrow', icon: ArrowUpRight, label: 'Arrow', group: 'shapes' },
  { id: 'rectangle', icon: Square, label: 'Rectangle', group: 'shapes' },
  { id: 'circle', icon: Circle, label: 'Circle', group: 'shapes' },
  // Annotation tools
  { id: 'text', icon: Type, label: 'Text', group: 'annotation' },
  { id: 'stickyNote', icon: StickyNote, label: 'Sticky Note', group: 'annotation' },
  { id: 'marker', icon: Hash, label: 'Number Marker', group: 'annotation' },
];

export function AnnotationToolbar({ settings, onSettingsChange, onClear }: AnnotationToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const isAnnotationMode = settings.tool !== 'select';
  const isShapeTool = ['rectangle', 'circle', 'line', 'arrow'].includes(settings.tool);
  const isTextTool = settings.tool === 'text' || settings.tool === 'stickyNote';
  const isDrawingTool = ['pen', 'highlighter'].includes(settings.tool);

  const handleToolSelect = (toolId: AnnotationTool) => {
    const updates: Partial<AnnotationSettings> = { tool: toolId };

    // Auto-adjust settings for specific tools
    if (toolId === 'highlighter') {
      updates.opacity = 0.4;
      updates.strokeWidth = 20;
    } else if (toolId === 'pen') {
      updates.opacity = 1;
    } else if (toolId === 'eraser') {
      updates.opacity = 1;
    } else if (toolId === 'stickyNote') {
      updates.fillEnabled = true;
      updates.fillColor = '#FEF08A'; // Yellow sticky note
    }

    onSettingsChange(updates);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Main Tools Grid */}
      <div className="grid grid-cols-4 gap-1">
        {TOOLS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => handleToolSelect(id)}
            className={`p-2 rounded transition-colors flex flex-col items-center gap-1 ${
              settings.tool === id
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title={label}
          >
            <Icon className="h-4 w-4" />
            <span className="text-[10px] leading-none">{label}</span>
          </button>
        ))}
      </div>

      {/* Divider */}
      {isAnnotationMode && <div className="h-px bg-gray-200" />}

      {/* Color Picker - Only show in annotation mode */}
      {isAnnotationMode && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Color</span>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <div
                className="w-4 h-4 rounded border border-gray-300"
                style={{ backgroundColor: settings.color }}
              />
              <ChevronDown className={`h-3 w-3 transition-transform ${showColorPicker ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showColorPicker && (
            <div className="grid grid-cols-5 gap-1">
              {ANNOTATION_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    onSettingsChange({ color });
                    setShowColorPicker(false);
                  }}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    settings.color === color ? 'border-gray-800 scale-110' : 'border-gray-200'
                  } ${color === '#FFFFFF' ? 'bg-white' : ''}`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stroke Width - For drawing and shape tools */}
      {isAnnotationMode && (isDrawingTool || isShapeTool) && settings.tool !== 'highlighter' && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-gray-500">Stroke</span>
          <div className="flex gap-1">
            {STROKE_WIDTHS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => onSettingsChange({ strokeWidth: value })}
                className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                  settings.strokeWidth === value
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Font Size - For text tools */}
      {isTextTool && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-gray-500">Font Size</span>
          <div className="flex gap-1">
            {FONT_SIZES.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => onSettingsChange({ fontSize: value })}
                className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                  settings.fontSize === value
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Opacity - For all annotation tools */}
      {isAnnotationMode && settings.tool !== 'eraser' && (
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <Droplets className="h-3 w-3 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">Opacity</span>
          </div>
          <div className="flex gap-1">
            {OPACITY_LEVELS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => onSettingsChange({ opacity: value })}
                className={`flex-1 px-1 py-1 text-xs font-medium rounded transition-colors ${
                  settings.opacity === value
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fill Control - For shapes */}
      {isShapeTool && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <PaintBucket className="h-3 w-3 text-gray-400" />
              <span className="text-xs font-medium text-gray-500">Fill</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.fillEnabled || false}
                onChange={(e) => onSettingsChange({ fillEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {settings.fillEnabled && (
            <div className="grid grid-cols-5 gap-1">
              {ANNOTATION_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => onSettingsChange({ fillColor: color })}
                  className={`w-5 h-5 rounded border-2 transition-transform hover:scale-110 ${
                    settings.fillColor === color ? 'border-gray-800 scale-110' : 'border-gray-200'
                  } ${color === '#FFFFFF' ? 'bg-white' : ''}`}
                  style={{ backgroundColor: color }}
                  title={`Fill: ${color}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Number Marker Control */}
      {settings.tool === 'marker' && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-gray-500">Next Number</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSettingsChange({ markerNumber: Math.max(1, (settings.markerNumber || 1) - 1) })}
              className="px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            >
              -
            </button>
            <span className="flex-1 text-center font-bold text-lg">{settings.markerNumber || 1}</span>
            <button
              onClick={() => onSettingsChange({ markerNumber: (settings.markerNumber || 1) + 1 })}
              className="px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-gray-200" />

      {/* Clear Button */}
      <button
        onClick={onClear}
        className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
        title="Clear all annotations"
      >
        <Trash2 className="h-4 w-4" />
        Clear All
      </button>
    </div>
  );
}
