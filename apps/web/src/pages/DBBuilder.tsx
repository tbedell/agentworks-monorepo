import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Database,
  Table,
  Key,
  Link,
  Plus,
  Settings,
  Eye,
  Code,
  Download,
  Upload,
  Trash2,
  Edit3,
  Bot,
  Camera,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { captureSnapshot } from '../lib/snapshot';
import { useWorkspaceStore } from '../stores/workspace';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useCoPilot } from '../contexts/CoPilotContext';

interface TableField {
  name: string;
  type: string;
  pk?: boolean;
  fk?: string;
  unique?: boolean;
  nullable: boolean;
}

interface DBTable {
  id: string;
  name: string;
  fields: TableField[];
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function DBBuilderPage() {
  const [searchParams] = useSearchParams();
  const cardId = searchParams.get('cardId');
  const { currentProjectId } = useWorkspaceStore();
  const { openDrawer } = useCoPilot();
  const [tables, setTables] = useState<DBTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<DBTable | null>(null);
  const [viewMode, setViewMode] = useState<'diagram' | 'schema' | 'data'>('diagram');
  const [, setShowAddTable] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [schemaName, setSchemaName] = useState('main-schema');
  const diagramRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  // Load saved schema on mount
  useEffect(() => {
    const loadSchema = async () => {
      if (!currentProjectId) {
        setIsLoading(false);
        return;
      }

      try {
        const name = cardId ? `card-${cardId}` : 'main-schema';
        setSchemaName(name);
        const component = await api.projects.getComponent(currentProjectId, 'db-schema', name);
        if (component && component.data && component.data.tables) {
          setTables(component.data.tables);
        }
      } catch (error) {
        console.error('Failed to load schema:', error);
      } finally {
        setIsLoading(false);
        isInitialLoadRef.current = false;
      }
    };

    loadSchema();
  }, [currentProjectId, cardId]);

  // Auto-save on table changes with debounce
  const saveSchema = useCallback(async () => {
    if (!currentProjectId || isInitialLoadRef.current) return;

    setSaveStatus('saving');
    try {
      await api.projects.saveComponent(currentProjectId, {
        type: 'db-schema',
        name: schemaName,
        data: {
          tables,
          cardId: cardId || undefined,
          lastSaved: new Date().toISOString(),
        },
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save schema:', error);
      setSaveStatus('error');
    }
  }, [currentProjectId, tables, schemaName, cardId]);

  // Debounced auto-save when tables change
  useEffect(() => {
    if (isInitialLoadRef.current || !currentProjectId) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveSchema();
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [tables, saveSchema, currentProjectId]);

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

  useQuery({
    queryKey: ['project-components', currentProjectId],
    queryFn: () => currentProjectId ? api.projects.listComponents(currentProjectId) : [],
    enabled: !!currentProjectId,
  });

  const hasTables = tables.length > 0;

  const getTypeColor = (type: string) => {
    if (type.includes('UUID') || type.includes('VARCHAR')) return 'text-blue-600';
    if (type.includes('INTEGER') || type.includes('BIGINT')) return 'text-green-600';
    if (type.includes('TIMESTAMP') || type.includes('DATE')) return 'text-purple-600';
    if (type.includes('TEXT') || type.includes('JSONB')) return 'text-orange-600';
    return 'text-slate-600';
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading database schema...</p>
        </div>
      </div>
    );
  }

  if (!hasTables) {
    return (
      <div className="h-full flex bg-white">
        <div className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Database Schema</h2>
              <button 
                onClick={() => setShowAddTable(true)}
                className="p-1 text-slate-500 hover:text-slate-700 rounded"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Add Table
              </button>
              <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                <Upload className="h-4 w-4 text-slate-600" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <div className="text-center py-8 text-slate-500 text-sm">
              No tables defined yet
            </div>
          </div>

          <div className="p-4 border-t border-slate-200 bg-white space-y-2">
            <button className="w-full flex items-center gap-2 text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg text-sm hover:bg-slate-50">
              <Download className="h-4 w-4" />
              Export Schema
            </button>
            <button className="w-full flex items-center gap-2 text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg text-sm hover:bg-slate-50">
              <Settings className="h-4 w-4" />
              Database Settings
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
              <Database className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Database Schema Yet</h3>
            <p className="text-sm text-slate-600 mb-6">
              Complete the architecture phase in CoPilot to generate your database schema, or manually add tables to get started.
            </p>
            <button
              onClick={openDrawer}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Bot className="h-4 w-4" />
              Open CoPilot
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-white">
      <div className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Database Schema</h2>
            <button 
              onClick={() => setShowAddTable(true)}
              className="p-1 text-slate-500 hover:text-slate-700 rounded"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Add Table
            </button>
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
              <Upload className="h-4 w-4 text-slate-600" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-2">
            {tables.map((table) => (
              <button
                key={table.id}
                onClick={() => setSelectedTable(table)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selectedTable?.id === table.id
                    ? 'bg-blue-100 border-blue-300 text-blue-900'
                    : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-slate-500" />
                  <span className="font-medium text-sm">{table.name}</span>
                </div>
                <div className="text-xs text-slate-500">
                  {table.fields.length} fields
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {table.fields.filter(f => f.pk).length} PK • {table.fields.filter(f => f.fk).length} FK
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-white space-y-2">
          <button className="w-full flex items-center gap-2 text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg text-sm hover:bg-slate-50">
            <Download className="h-4 w-4" />
            Export Schema
          </button>
          <button className="w-full flex items-center gap-2 text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg text-sm hover:bg-slate-50">
            <Settings className="h-4 w-4" />
            Database Settings
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-4">
            <h1 className="font-semibold text-slate-900">
              Database Designer {cardId && <span className="text-sm text-slate-500">(Card: {cardId.slice(0, 8)}...)</span>}
            </h1>
            <div className="text-sm text-slate-500">{tables.length} tables</div>
            {/* Save Status Indicator */}
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
          </div>

          <div className="flex items-center gap-4">
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
                Schema
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
                Data
              </button>
            </div>

            <button
              onClick={saveSchema}
              disabled={saveStatus === 'saving' || !currentProjectId}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg text-sm hover:bg-slate-100 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save
            </button>
            <button
              onClick={handleTakeSnapshot}
              disabled={isCapturing}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg text-sm hover:bg-slate-100 disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
              {isCapturing ? 'Capturing...' : 'Snapshot'}
            </button>
            <button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              <Download className="h-4 w-4" />
              Generate Migration
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {viewMode === 'diagram' && (
            <div ref={diagramRef} className="h-full bg-slate-50 p-8 overflow-auto">
              <div className="grid grid-cols-2 gap-6">
                {tables.map((table) => (
                  <div
                    key={table.id}
                    className={`bg-white border-2 rounded-lg overflow-hidden transition-all cursor-pointer ${
                      selectedTable?.id === table.id
                        ? 'border-blue-500 shadow-lg'
                        : 'border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}
                    onClick={() => setSelectedTable(table)}
                  >
                    <div className="bg-slate-900 text-white p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        <span className="font-semibold">{table.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button className="p-1 hover:bg-slate-700 rounded">
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button className="p-1 hover:bg-slate-700 rounded">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="p-0">
                      {table.fields.map((field) => (
                        <div
                          key={field.name}
                          className="flex items-center justify-between px-3 py-2 border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-2">
                            {field.pk && <Key className="h-3 w-3 text-yellow-500" />}
                            {field.fk && <Link className="h-3 w-3 text-blue-500" />}
                            <span className="font-medium text-sm text-slate-900">{field.name}</span>
                          </div>
                          <div className="text-xs">
                            <span className={`font-medium ${getTypeColor(field.type)}`}>
                              {field.type}
                            </span>
                            {!field.nullable && (
                              <span className="ml-1 text-red-500 font-medium">*</span>
                            )}
                          </div>
                        </div>
                      ))}
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
                  <div key={table.id}>
                    <div className="text-yellow-300 mb-2">-- Table: {table.name}</div>
                    <div className="text-blue-300">CREATE TABLE {table.name} (</div>
                    {table.fields.map((field, index) => (
                      <div key={field.name} className="ml-4 text-white">
                        <span className="text-green-300">{field.name}</span>
                        <span className="text-blue-300"> {field.type}</span>
                        {field.pk && <span className="text-yellow-300"> PRIMARY KEY</span>}
                        {!field.nullable && !field.pk && <span className="text-red-300"> NOT NULL</span>}
                        {field.unique && <span className="text-purple-300"> UNIQUE</span>}
                        {index < table.fields.length - 1 && ','}
                      </div>
                    ))}
                    <div className="text-blue-300">);</div>
                    <br />
                    
                    {table.fields.filter(f => f.fk).map((field) => (
                      <div key={field.name} className="text-orange-300">
                        ALTER TABLE {table.name} ADD CONSTRAINT fk_{table.name}_{field.name} 
                        FOREIGN KEY ({field.name}) REFERENCES {field.fk};
                      </div>
                    ))}
                    <br />
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'data' && selectedTable && (
            <div className="h-full p-6 overflow-auto">
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <h3 className="font-semibold text-slate-900">{selectedTable.name} - Sample Data</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Preview of table structure and sample data
                  </p>
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
                             field.type.includes('INTEGER') ? '42' :
                             field.type.includes('TIMESTAMP') ? '2023-11-01 10:30:00' :
                             field.type.includes('BOOLEAN') ? 'true' :
                             'null'}
                          </td>
                        ))}
                      </tr>
                      <tr className="text-center text-slate-400">
                        <td colSpan={selectedTable.fields.length} className="py-8">
                          No data yet - this is a schema preview
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
