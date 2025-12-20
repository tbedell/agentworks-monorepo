import { useRef, useState, useMemo } from 'react';
import {
  Database,
  Table,
  Key,
  Link,
  Edit3,
  Trash2,
  Camera,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Code,
  Eye,
  Download,
  Bot,
} from 'lucide-react';
import { captureSnapshot } from '../lib/snapshot';
import { useDBBuilder, DBTable, TableRelationship } from '../contexts/DBBuilderContext';
import { useCoPilot } from '../contexts/CoPilotContext';
import clsx from 'clsx';

// SVG Arrow for relationships
function RelationshipArrow({
  fromTable,
  toTable,
  tables,
  relationship,
}: {
  fromTable: string;
  toTable: string;
  tables: DBTable[];
  relationship: TableRelationship;
}) {
  const from = tables.find(t => t.name === fromTable);
  const to = tables.find(t => t.name === toTable);

  if (!from?.position || !to?.position) return null;

  // Calculate connection points (center-right of from, center-left of to)
  const fromX = from.position.x + 300; // Right edge of card (approx width)
  const fromY = from.position.y + 100; // Center height
  const toX = to.position.x;
  const toY = to.position.y + 100;

  // Calculate control points for curved line
  const midX = (fromX + toX) / 2;

  const pathD = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;

  return (
    <g>
      <path
        d={pathD}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeDasharray={relationship.type === 'one-to-one' ? '5,5' : 'none'}
        markerEnd="url(#arrowhead)"
      />
      {/* Relationship type indicator */}
      <text
        x={midX}
        y={(fromY + toY) / 2 - 10}
        textAnchor="middle"
        className="text-xs fill-blue-600 font-medium"
      >
        {relationship.type === 'one-to-many' ? '1:N' : relationship.type === 'many-to-many' ? 'N:N' : '1:1'}
      </text>
    </g>
  );
}

// Main DB Builder content - Provider is in Layout.tsx
export default function DBBuilderPage() {
  const {
    tables,
    relationships,
    selectedTable,
    setSelectedTable,
    viewMode,
    setViewMode,
    builderMode,
    isLoading,
    isIntrospecting,
    isGenerating,
    saveStatus,
    cardId,
    introspectDatabase,
    saveSchema,
    removeTable,
    updateTable,
  } = useDBBuilder();

  const { openDrawer } = useCoPilot();
  const [isCapturing, setIsCapturing] = useState(false);
  const [draggedTable, setDraggedTable] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const diagramRef = useRef<HTMLDivElement>(null);

  // Calculate diagram bounds for SVG
  const diagramBounds = useMemo(() => {
    if (tables.length === 0) return { width: 1200, height: 800 };
    let maxX = 0;
    let maxY = 0;
    tables.forEach(t => {
      if (t.position) {
        maxX = Math.max(maxX, t.position.x + 350);
        maxY = Math.max(maxY, t.position.y + 300);
      }
    });
    return { width: Math.max(1200, maxX + 100), height: Math.max(800, maxY + 100) };
  }, [tables]);

  const handleTakeSnapshot = async () => {
    if (!diagramRef.current) return;
    setIsCapturing(true);
    try {
      await captureSnapshot(diagramRef.current, {
        download: true,
        filename: 'db-schema-snapshot',
      });
    } catch (error) {
      console.error('Failed to capture snapshot:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleMouseDown = (tableId: string, e: React.MouseEvent) => {
    const table = tables.find(t => t.id === tableId);
    if (!table?.position) return;

    setDraggedTable(tableId);
    setDragOffset({
      x: e.clientX - table.position.x,
      y: e.clientY - table.position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedTable) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    updateTable(draggedTable, {
      position: { x: Math.max(0, newX), y: Math.max(0, newY) },
    });
  };

  const handleMouseUp = () => {
    setDraggedTable(null);
  };

  const getTypeColor = (type: string) => {
    if (type.includes('UUID') || type.includes('VARCHAR')) return 'text-blue-600';
    if (type.includes('INTEGER') || type.includes('BIGINT') || type.includes('INT')) return 'text-green-600';
    if (type.includes('TIMESTAMP') || type.includes('DATE')) return 'text-purple-600';
    if (type.includes('TEXT') || type.includes('JSONB') || type.includes('JSON')) return 'text-orange-600';
    if (type.includes('BOOLEAN') || type.includes('BOOL')) return 'text-pink-600';
    return 'text-slate-600';
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading database schema...</p>
        </div>
      </div>
    );
  }

  if (tables.length === 0 && !isGenerating) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
            <Database className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Design Your Database</h3>
          <p className="text-sm text-slate-600 mb-6">
            Use the DB Agent in the left panel to describe your data model. Say something like "Create a user system with roles and permissions" or use the Quick Start buttons.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={openDrawer}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Bot className="h-4 w-4" />
              Open CoPilot
            </button>
            <button
              onClick={() => introspectDatabase()}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Load from DB
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold text-slate-900">
            {builderMode === 'introspect' ? 'Database Structure' : 'Schema Designer'}
            {cardId && <span className="text-sm text-slate-500 ml-2">(Card: {cardId.slice(0, 8)}...)</span>}
          </h1>

          {/* Table count badge */}
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
            <Database className="h-3 w-3" />
            {tables.length} tables
          </span>

          {/* Relationship count badge */}
          {relationships.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
              <Link className="h-3 w-3" />
              {relationships.length} relationships
            </span>
          )}

          {/* Save Status - only in design mode */}
          {builderMode === 'design' && (
            <div className="flex items-center gap-2 text-sm">
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1 text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  Save failed
                </span>
              )}
            </div>
          )}

          {/* Generating indicator */}
          {isGenerating && (
            <span className="flex items-center gap-1 text-green-600 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating schema...
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('diagram')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                viewMode === 'diagram'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="h-4 w-4" />
              Diagram
            </button>
            <button
              onClick={() => setViewMode('schema')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                viewMode === 'schema'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code className="h-4 w-4" />
              SQL
            </button>
            <button
              onClick={() => setViewMode('data')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                viewMode === 'data'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="h-4 w-4" />
              Preview
            </button>
          </div>

          {/* Action Buttons */}
          {builderMode === 'introspect' && (
            <button
              onClick={introspectDatabase}
              disabled={isIntrospecting}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg text-sm hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isIntrospecting ? 'animate-spin' : ''}`} />
              {isIntrospecting ? 'Refreshing...' : 'Refresh'}
            </button>
          )}

          {builderMode === 'design' && (
            <button
              onClick={saveSchema}
              disabled={saveStatus === 'saving'}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg text-sm hover:bg-slate-100 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save
            </button>
          )}

          <button
            onClick={handleTakeSnapshot}
            disabled={isCapturing}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg text-sm hover:bg-slate-100 disabled:opacity-50"
          >
            <Camera className="h-4 w-4" />
            {isCapturing ? 'Capturing...' : 'Snapshot'}
          </button>

          {builderMode === 'design' && tables.length > 0 && (
            <button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              <Download className="h-4 w-4" />
              Export SQL
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'diagram' && (
          <div
            ref={diagramRef}
            className="h-full bg-slate-50 overflow-auto relative"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          >
            {/* SVG layer for relationship lines */}
            <svg
              className="absolute inset-0 pointer-events-none"
              width={diagramBounds.width}
              height={diagramBounds.height}
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                </marker>
              </defs>
              {relationships.map((rel) => (
                <RelationshipArrow
                  key={rel.id}
                  fromTable={rel.fromTable}
                  toTable={rel.toTable}
                  tables={tables}
                  relationship={rel}
                />
              ))}
            </svg>

            {/* Table cards */}
            <div className="relative" style={{ width: diagramBounds.width, height: diagramBounds.height }}>
              {tables.map((table) => (
                <div
                  key={table.id}
                  className={clsx(
                    'absolute bg-white border-2 rounded-lg overflow-hidden shadow-lg transition-shadow cursor-move',
                    selectedTable?.id === table.id
                      ? 'border-green-500 ring-2 ring-green-200'
                      : 'border-slate-200 hover:border-slate-300',
                    draggedTable === table.id && 'shadow-2xl'
                  )}
                  style={{
                    left: table.position?.x || 50,
                    top: table.position?.y || 50,
                    width: 300,
                    zIndex: draggedTable === table.id ? 100 : selectedTable?.id === table.id ? 50 : 1,
                  }}
                  onClick={() => setSelectedTable(table)}
                  onMouseDown={(e) => handleMouseDown(table.id, e)}
                >
                  <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      <span className="font-semibold">{table.name}</span>
                    </div>
                    {builderMode === 'design' && (
                      <div className="flex items-center gap-1">
                        <button
                          className="p-1 hover:bg-slate-700 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Open edit modal
                          }}
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          className="p-1 hover:bg-red-600 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTable(table.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-0 max-h-64 overflow-y-auto">
                    {table.fields.map((field, idx) => (
                      <div
                        key={field.name}
                        className={clsx(
                          'flex items-center justify-between px-3 py-2 border-b border-slate-100 last:border-b-0',
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {field.pk && <span title="Primary Key"><Key className="h-3 w-3 text-yellow-500" /></span>}
                          {field.fk && <span title={`FK: ${field.fk}`}><Link className="h-3 w-3 text-blue-500" /></span>}
                          {field.unique && !field.pk && (
                            <span className="w-3 h-3 text-purple-500 text-xs font-bold" title="Unique">U</span>
                          )}
                          <span className={clsx(
                            'font-medium text-sm',
                            field.pk ? 'text-yellow-700' : field.fk ? 'text-blue-700' : 'text-slate-900'
                          )}>
                            {field.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <span className={`font-medium ${getTypeColor(field.type)}`}>
                            {field.type}
                          </span>
                          {!field.nullable && (
                            <span className="text-red-500 font-bold" title="NOT NULL">*</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Table footer with field count */}
                  <div className="bg-slate-50 px-3 py-1.5 border-t border-slate-200 text-xs text-slate-500">
                    {table.fields.length} fields
                    {table.fields.some(f => f.pk) && ' • PK'}
                    {table.fields.some(f => f.fk) && ` • ${table.fields.filter(f => f.fk).length} FK`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'schema' && (
          <div className="h-full bg-slate-900 text-slate-100 p-6 overflow-auto font-mono text-sm">
            <div className="space-y-6">
              {tables.map((table) => (
                <div key={table.id} className="bg-slate-800 rounded-lg p-4">
                  <div className="text-yellow-300 mb-2">-- Table: {table.name}</div>
                  {table.description && (
                    <div className="text-slate-400 mb-2">-- {table.description}</div>
                  )}
                  <div className="text-blue-300">CREATE TABLE <span className="text-green-300">{table.name}</span> (</div>
                  {table.fields.map((field, index) => (
                    <div key={field.name} className="ml-4 text-white">
                      <span className="text-green-300">{field.name}</span>
                      <span className="text-blue-300"> {field.type}</span>
                      {field.pk && <span className="text-yellow-300"> PRIMARY KEY</span>}
                      {!field.nullable && !field.pk && <span className="text-red-300"> NOT NULL</span>}
                      {field.unique && !field.pk && <span className="text-purple-300"> UNIQUE</span>}
                      {index < table.fields.length - 1 && ','}
                    </div>
                  ))}
                  <div className="text-blue-300">);</div>

                  {table.fields.filter(f => f.fk).map((field) => (
                    <div key={`fk-${field.name}`} className="mt-2 text-orange-300">
                      ALTER TABLE <span className="text-green-300">{table.name}</span> ADD CONSTRAINT <span className="text-purple-300">fk_{table.name}_{field.name}</span>
                      {'\n'}  FOREIGN KEY (<span className="text-green-300">{field.name}</span>) REFERENCES <span className="text-cyan-300">{field.fk}</span>;
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'data' && selectedTable && (
          <div className="h-full p-6 overflow-auto bg-slate-50">
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-slate-900">{selectedTable.name}</h3>
                </div>
                {selectedTable.description && (
                  <p className="text-sm text-slate-600 mt-1">{selectedTable.description}</p>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      {selectedTable.fields.map((field) => (
                        <th key={field.name} className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            {field.pk && <Key className="h-3 w-3 text-yellow-500" />}
                            {field.fk && <Link className="h-3 w-3 text-blue-500" />}
                            {field.name}
                            <span className={`text-xs font-medium ${getTypeColor(field.type)}`}>
                              {field.type}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      {selectedTable.fields.map((field) => (
                        <td key={field.name} className="px-4 py-3 text-sm text-slate-500">
                          {field.type.includes('UUID') ? 'uuid-sample-123' :
                           field.type.includes('VARCHAR') ? 'Sample text' :
                           field.type.includes('INTEGER') || field.type.includes('INT') ? '42' :
                           field.type.includes('TIMESTAMP') ? '2024-01-15 10:30:00' :
                           field.type.includes('BOOLEAN') || field.type.includes('BOOL') ? 'true' :
                           field.type.includes('JSON') ? '{"key": "value"}' :
                           'null'}
                        </td>
                      ))}
                    </tr>
                    <tr className="text-center text-slate-400">
                      <td colSpan={selectedTable.fields.length} className="py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Eye className="h-8 w-8 text-slate-300" />
                          <span>Sample data preview</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'data' && !selectedTable && (
          <div className="h-full flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <Database className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Select a table from the left panel to preview its structure</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
