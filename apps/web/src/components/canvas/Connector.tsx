import { useMemo } from 'react';

interface Position {
  x: number;
  y: number;
}

type ConnectorType = 'straight' | 'curved' | 'elbow' | 'bezier';

interface ConnectorProps {
  /** Start position */
  from: Position;
  /** End position */
  to: Position;
  /** Connector style type */
  type?: ConnectorType;
  /** Label to display on the connector */
  label?: string;
  /** Animate the connector */
  animated?: boolean;
  /** Stroke color */
  color?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Show arrow at end */
  showArrow?: boolean;
  /** Show arrow at start */
  showStartArrow?: boolean;
  /** Whether connector is selected */
  selected?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional class name */
  className?: string;
}

export default function Connector({
  from,
  to,
  type = 'curved',
  label,
  animated = false,
  color = '#64748b',
  strokeWidth = 2,
  showArrow = true,
  showStartArrow = false,
  selected = false,
  onClick,
  className = '',
}: ConnectorProps) {
  // Calculate path based on connector type
  const pathData = useMemo(() => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    switch (type) {
      case 'straight':
        return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;

      case 'curved': {
        // Quadratic bezier curve
        const midX = from.x + dx / 2;
        const midY = from.y + dy / 2;
        const offset = Math.min(Math.abs(dx), Math.abs(dy)) * 0.3;
        const controlX = midX + (Math.abs(dy) > Math.abs(dx) ? offset : 0);
        const controlY = midY + (Math.abs(dx) > Math.abs(dy) ? offset : 0);
        return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
      }

      case 'elbow': {
        // Right-angled connector
        const midX = from.x + dx / 2;
        return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
      }

      case 'bezier': {
        // Cubic bezier with horizontal handles
        const controlOffset = Math.max(Math.abs(dx) * 0.5, 50);
        const c1x = from.x + controlOffset;
        const c1y = from.y;
        const c2x = to.x - controlOffset;
        const c2y = to.y;
        return `M ${from.x} ${from.y} C ${c1x} ${c1y} ${c2x} ${c2y} ${to.x} ${to.y}`;
      }

      default:
        return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
    }
  }, [from, to, type]);

  // Calculate label position (midpoint of path)
  const labelPosition = useMemo(() => {
    return {
      x: from.x + (to.x - from.x) / 2,
      y: from.y + (to.y - from.y) / 2,
    };
  }, [from, to]);

  // Generate unique ID for markers
  const markerId = useMemo(() => `connector-${Math.random().toString(36).substr(2, 9)}`, []);

  return (
    <svg
      className={`absolute pointer-events-none overflow-visible ${className}`}
      style={{
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
      }}
    >
      <defs>
        {/* End arrow marker */}
        <marker
          id={`${markerId}-end`}
          markerWidth="12"
          markerHeight="12"
          refX="10"
          refY="6"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M 0 0 L 12 6 L 0 12 L 3 6 Z"
            fill={selected ? '#3b82f6' : color}
          />
        </marker>

        {/* Start arrow marker */}
        <marker
          id={`${markerId}-start`}
          markerWidth="12"
          markerHeight="12"
          refX="2"
          refY="6"
          orient="auto-start-reverse"
          markerUnits="strokeWidth"
        >
          <path
            d="M 0 0 L 12 6 L 0 12 L 3 6 Z"
            fill={selected ? '#3b82f6' : color}
          />
        </marker>

        {/* Animated dash pattern */}
        {animated && (
          <style>
            {`
              @keyframes dash-flow {
                from { stroke-dashoffset: 24; }
                to { stroke-dashoffset: 0; }
              }
            `}
          </style>
        )}
      </defs>

      {/* Invisible wider path for click detection */}
      {onClick && (
        <path
          d={pathData}
          fill="none"
          stroke="transparent"
          strokeWidth={strokeWidth + 10}
          className="pointer-events-auto cursor-pointer"
          onClick={onClick}
        />
      )}

      {/* Main path */}
      <path
        d={pathData}
        fill="none"
        stroke={selected ? '#3b82f6' : color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={showArrow ? `url(#${markerId}-end)` : undefined}
        markerStart={showStartArrow ? `url(#${markerId}-start)` : undefined}
        style={animated ? {
          strokeDasharray: '12 12',
          animation: 'dash-flow 1s linear infinite',
        } : undefined}
        className={onClick ? 'pointer-events-auto cursor-pointer' : ''}
        onClick={onClick}
      />

      {/* Selection highlight */}
      {selected && (
        <path
          d={pathData}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.2}
          className="pointer-events-none"
        />
      )}

      {/* Label */}
      {label && (
        <g transform={`translate(${labelPosition.x}, ${labelPosition.y})`}>
          <rect
            x={-label.length * 4 - 8}
            y={-10}
            width={label.length * 8 + 16}
            height={20}
            rx={4}
            fill="white"
            stroke={selected ? '#3b82f6' : '#e2e8f0'}
            strokeWidth={1}
          />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fill={selected ? '#3b82f6' : '#64748b'}
            fontSize={12}
            fontFamily="system-ui, sans-serif"
          >
            {label}
          </text>
        </g>
      )}
    </svg>
  );
}

// Helper component for relationship connectors between nodes
interface RelationshipConnectorProps {
  fromNode: { x: number; y: number; width: number; height: number };
  toNode: { x: number; y: number; width: number; height: number };
  fromSide?: 'left' | 'right' | 'top' | 'bottom' | 'auto';
  toSide?: 'left' | 'right' | 'top' | 'bottom' | 'auto';
  label?: string;
  type?: ConnectorType;
  color?: string;
  animated?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export function RelationshipConnector({
  fromNode,
  toNode,
  fromSide = 'auto',
  toSide = 'auto',
  label,
  type = 'bezier',
  color = '#64748b',
  animated = false,
  selected = false,
  onClick,
}: RelationshipConnectorProps) {
  // Calculate connection points based on sides
  const from = useMemo(() => {
    const side = fromSide === 'auto' ? getBestSide(fromNode, toNode) : fromSide;
    return getConnectionPoint(fromNode, side);
  }, [fromNode, toNode, fromSide]);

  const to = useMemo(() => {
    const side = toSide === 'auto' ? getBestSide(toNode, fromNode) : toSide;
    return getConnectionPoint(toNode, side);
  }, [fromNode, toNode, toSide]);

  return (
    <Connector
      from={from}
      to={to}
      type={type}
      label={label}
      color={color}
      animated={animated}
      selected={selected}
      onClick={onClick}
      showArrow
    />
  );
}

// Helper functions
function getBestSide(
  fromNode: { x: number; y: number; width: number; height: number },
  toNode: { x: number; y: number; width: number; height: number }
): 'left' | 'right' | 'top' | 'bottom' {
  const fromCenter = {
    x: fromNode.x + fromNode.width / 2,
    y: fromNode.y + fromNode.height / 2,
  };
  const toCenter = {
    x: toNode.x + toNode.width / 2,
    y: toNode.y + toNode.height / 2,
  };

  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'bottom' : 'top';
}

function getConnectionPoint(
  node: { x: number; y: number; width: number; height: number },
  side: 'left' | 'right' | 'top' | 'bottom'
): Position {
  switch (side) {
    case 'left':
      return { x: node.x, y: node.y + node.height / 2 };
    case 'right':
      return { x: node.x + node.width, y: node.y + node.height / 2 };
    case 'top':
      return { x: node.x + node.width / 2, y: node.y };
    case 'bottom':
      return { x: node.x + node.width / 2, y: node.y + node.height };
  }
}
