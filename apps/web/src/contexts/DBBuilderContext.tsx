import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWorkspaceStore } from '../stores/workspace';
import { api } from '../lib/api';

export interface TableField {
  name: string;
  type: string;
  pk?: boolean;
  fk?: string;
  unique?: boolean;
  nullable: boolean;
  description?: string;
}

export interface DBTable {
  id: string;
  name: string;
  fields: TableField[];
  description?: string;
  position?: { x: number; y: number };
}

export interface TableRelationship {
  id: string;
  fromTable: string;
  fromField: string;
  toTable: string;
  toField: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface DBAgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tables?: DBTable[];
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type BuilderMode = 'design' | 'introspect';
type ViewMode = 'diagram' | 'schema' | 'data';

interface DBStats {
  tableCount: number;
  totalColumns: number;
  foreignKeyCount: number;
}

interface DBBuilderContextType {
  // State
  tables: DBTable[];
  relationships: TableRelationship[];
  selectedTable: DBTable | null;
  viewMode: ViewMode;
  builderMode: BuilderMode;
  isLoading: boolean;
  isIntrospecting: boolean;
  isGenerating: boolean;
  saveStatus: SaveStatus;
  schemaName: string;
  dbStats: DBStats | null;
  tableRowCounts: Map<string, number>;
  cardId: string | null;
  messages: DBAgentMessage[];

  // Actions
  setTables: (tables: DBTable[]) => void;
  setSelectedTable: (table: DBTable | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setBuilderMode: (mode: BuilderMode) => void;
  addTable: (table: DBTable) => void;
  updateTable: (tableId: string, updates: Partial<DBTable>) => void;
  removeTable: (tableId: string) => void;
  addRelationship: (relationship: TableRelationship) => void;
  removeRelationship: (relationshipId: string) => void;
  introspectDatabase: () => Promise<void>;
  saveSchema: () => Promise<void>;
  generateSchemaFromPrompt: (prompt: string) => Promise<{ success: boolean; error?: string }>;
  addMessage: (message: DBAgentMessage) => void;
  clearMessages: () => void;
}

const DBBuilderContext = createContext<DBBuilderContextType | null>(null);

// Helper to parse table definitions from AI response
function parseTablesFromResponse(content: string): { tables: DBTable[]; relationships: TableRelationship[] } {
  const tables: DBTable[] = [];
  const relationships: TableRelationship[] = [];

  // Try to parse [ACTION:CREATE_TABLE] blocks
  const tableActionRegex = /\[ACTION:CREATE_TABLE\]([\s\S]*?)\[\/ACTION\]/g;
  let match;

  while ((match = tableActionRegex.exec(content)) !== null) {
    const actionContent = match[1];
    try {
      // Try to extract JSON from the action
      const jsonMatch = actionContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const tableData = JSON.parse(jsonMatch[0]);
        if (tableData.name && tableData.fields) {
          tables.push({
            id: `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: tableData.name,
            fields: tableData.fields.map((f: any) => ({
              name: f.name,
              type: f.type || 'VARCHAR(255)',
              pk: f.pk || f.primaryKey || false,
              fk: f.fk || f.foreignKey || undefined,
              unique: f.unique || false,
              nullable: f.nullable !== false,
              description: f.description,
            })),
            description: tableData.description,
          });
        }
      }
    } catch (e) {
      console.error('Failed to parse table action:', e);
    }
  }

  // Try to parse [ACTION:CREATE_SCHEMA] block (multiple tables at once)
  const schemaActionMatch = content.match(/\[ACTION:CREATE_SCHEMA\]([\s\S]*?)\[\/ACTION\]/);
  if (schemaActionMatch) {
    try {
      const jsonMatch = schemaActionMatch[1].match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        const schemaData = JSON.parse(jsonMatch[0]);
        const tablesArray = Array.isArray(schemaData) ? schemaData : schemaData.tables;
        if (tablesArray) {
          tablesArray.forEach((tableData: any, index: number) => {
            tables.push({
              id: `table-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
              name: tableData.name,
              fields: (tableData.fields || tableData.columns || []).map((f: any) => ({
                name: f.name,
                type: f.type || 'VARCHAR(255)',
                pk: f.pk || f.primaryKey || false,
                fk: f.fk || f.foreignKey || f.references || undefined,
                unique: f.unique || false,
                nullable: f.nullable !== false,
                description: f.description,
              })),
              description: tableData.description,
            });
          });
        }
        // Parse relationships if present
        if (schemaData.relationships) {
          schemaData.relationships.forEach((rel: any) => {
            relationships.push({
              id: `rel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              fromTable: rel.fromTable || rel.from,
              fromField: rel.fromField || rel.fromColumn,
              toTable: rel.toTable || rel.to,
              toField: rel.toField || rel.toColumn,
              type: rel.type || 'one-to-many',
            });
          });
        }
      }
    } catch (e) {
      console.error('Failed to parse schema action:', e);
    }
  }

  // Fallback: try to parse SQL CREATE TABLE statements
  if (tables.length === 0) {
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?\s*\(([\s\S]*?)\);/gi;
    let sqlMatch;

    while ((sqlMatch = createTableRegex.exec(content)) !== null) {
      const tableName = sqlMatch[1];
      const columnsStr = sqlMatch[2];
      const fields: TableField[] = [];

      // Parse columns
      const lines = columnsStr.split(',').map(l => l.trim()).filter(l => l && !l.startsWith('CONSTRAINT') && !l.startsWith('FOREIGN KEY') && !l.startsWith('PRIMARY KEY'));

      for (const line of lines) {
        const columnMatch = line.match(/["`]?(\w+)["`]?\s+(\w+(?:\([^)]+\))?)/i);
        if (columnMatch) {
          fields.push({
            name: columnMatch[1],
            type: columnMatch[2].toUpperCase(),
            pk: /PRIMARY\s+KEY/i.test(line),
            unique: /UNIQUE/i.test(line),
            nullable: !/NOT\s+NULL/i.test(line),
          });
        }
      }

      // Check for foreign keys
      const fkRegex = /FOREIGN\s+KEY\s*\(["`]?(\w+)["`]?\)\s*REFERENCES\s*["`]?(\w+)["`]?\s*\(["`]?(\w+)["`]?\)/gi;
      let fkMatch: RegExpExecArray | null;
      while ((fkMatch = fkRegex.exec(columnsStr)) !== null) {
        const match = fkMatch; // TypeScript knows this is non-null inside the loop
        const field = fields.find(f => f.name === match[1]);
        if (field) {
          field.fk = `${match[2]}(${match[3]})`;
        }
        relationships.push({
          id: `rel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          fromTable: tableName,
          fromField: match[1],
          toTable: match[2],
          toField: match[3],
          type: 'one-to-many',
        });
      }

      if (fields.length > 0) {
        tables.push({
          id: `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: tableName,
          fields,
        });
      }
    }
  }

  // Auto-detect relationships from foreign key fields
  tables.forEach(table => {
    table.fields.forEach(field => {
      if (field.fk && !relationships.some(r => r.fromTable === table.name && r.fromField === field.name)) {
        // Parse fk format: "tableName(columnName)" or "tableName.columnName"
        const fkMatch = field.fk.match(/(\w+)[\.(](\w+)\)?/);
        if (fkMatch) {
          relationships.push({
            id: `rel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fromTable: table.name,
            fromField: field.name,
            toTable: fkMatch[1],
            toField: fkMatch[2],
            type: 'one-to-many',
          });
        }
      }
    });
  });

  return { tables, relationships };
}

// Storage helpers
const getStorageKey = (projectId: string | null, suffix: string) => {
  return projectId ? `db-builder-${suffix}-${projectId}` : `db-builder-${suffix}-default`;
};

const loadMessages = (projectId: string | null): DBAgentMessage[] => {
  try {
    const saved = localStorage.getItem(getStorageKey(projectId, 'messages'));
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
    }
  } catch (e) {
    console.error('Failed to load DB Agent messages:', e);
  }
  return [];
};

const saveMessages = (projectId: string | null, messages: DBAgentMessage[]) => {
  try {
    localStorage.setItem(getStorageKey(projectId, 'messages'), JSON.stringify(messages));
  } catch (e) {
    console.error('Failed to save DB Agent messages:', e);
  }
};

export function DBBuilderProvider({ children }: { children: React.ReactNode }) {
  const [searchParams] = useSearchParams();
  const cardId = searchParams.get('cardId');
  const { currentProjectId } = useWorkspaceStore();

  const [tables, setTablesState] = useState<DBTable[]>([]);
  const [relationships, setRelationships] = useState<TableRelationship[]>([]);
  const [selectedTable, setSelectedTable] = useState<DBTable | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('diagram');
  const [builderMode, setBuilderMode] = useState<BuilderMode>('design');
  const [isLoading, setIsLoading] = useState(true);
  const [isIntrospecting, setIsIntrospecting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [schemaName, setSchemaName] = useState('main-schema');
  const [dbStats, setDbStats] = useState<DBStats | null>(null);
  const [tableRowCounts, setTableRowCounts] = useState<Map<string, number>>(new Map());
  const [messages, setMessages] = useState<DBAgentMessage[]>(() => loadMessages(currentProjectId));

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  // Save messages when they change
  useEffect(() => {
    saveMessages(currentProjectId, messages);
  }, [messages, currentProjectId]);

  // Update stats when tables change
  useEffect(() => {
    if (tables.length > 0) {
      const totalColumns = tables.reduce((acc, t) => acc + t.fields.length, 0);
      const fkCount = tables.reduce((acc, t) => acc + t.fields.filter(f => f.fk).length, 0);
      setDbStats({
        tableCount: tables.length,
        totalColumns,
        foreignKeyCount: fkCount,
      });
    }
  }, [tables]);

  // Introspect the actual database
  const introspectDatabase = useCallback(async () => {
    setIsIntrospecting(true);
    try {
      const [schemaResult, statsResult] = await Promise.all([
        api.database.getBuilderFormat(),
        api.database.getStats(),
      ]);

      if (schemaResult.tables) {
        setTablesState(schemaResult.tables);

        // Extract relationships from FK fields
        const rels: TableRelationship[] = [];
        schemaResult.tables.forEach((table: DBTable) => {
          table.fields.forEach(field => {
            if (field.fk) {
              const fkMatch = field.fk.match(/(\w+)[\.(](\w+)\)?/);
              if (fkMatch) {
                rels.push({
                  id: `rel-${table.name}-${field.name}`,
                  fromTable: table.name,
                  fromField: field.name,
                  toTable: fkMatch[1],
                  toField: fkMatch[2],
                  type: 'one-to-many',
                });
              }
            }
          });
        });
        setRelationships(rels);
      }

      if (statsResult.stats) {
        const rowCounts = new Map<string, number>();
        statsResult.stats.forEach((s: { table_name: string; row_count: number }) => {
          rowCounts.set(s.table_name, s.row_count);
        });
        setTableRowCounts(rowCounts);
      }
    } catch (error) {
      console.error('Failed to introspect database:', error);
    } finally {
      setIsIntrospecting(false);
    }
  }, []);

  // Load schema on mount
  useEffect(() => {
    const loadSchema = async () => {
      if (builderMode === 'introspect') {
        setIsLoading(true);
        await introspectDatabase();
        setIsLoading(false);
        isInitialLoadRef.current = false;
        return;
      }

      // Design mode - start with empty or saved schema
      if (!currentProjectId) {
        setIsLoading(false);
        isInitialLoadRef.current = false;
        return;
      }

      try {
        const name = cardId ? `card-${cardId}` : 'main-schema';
        setSchemaName(name);
        const component = await api.projects.getComponent(currentProjectId, 'db-schema', name);
        if (component && component.data) {
          if (component.data.tables) {
            setTablesState(component.data.tables);
          }
          if (component.data.relationships) {
            setRelationships(component.data.relationships);
          }
        }
      } catch (error) {
        console.error('Failed to load schema:', error);
      } finally {
        setIsLoading(false);
        isInitialLoadRef.current = false;
      }
    };

    loadSchema();
  }, [currentProjectId, cardId, builderMode, introspectDatabase]);

  // Save schema
  const saveSchema = useCallback(async () => {
    if (!currentProjectId || isInitialLoadRef.current) return;

    setSaveStatus('saving');
    try {
      await api.projects.saveComponent(currentProjectId, {
        type: 'db-schema',
        name: schemaName,
        data: {
          tables,
          relationships,
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
  }, [currentProjectId, tables, relationships, schemaName, cardId]);

  // Auto-save when tables change
  useEffect(() => {
    if (isInitialLoadRef.current || !currentProjectId || builderMode !== 'design') return;

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
  }, [tables, relationships, saveSchema, currentProjectId, builderMode]);

  // Generate schema from prompt
  const generateSchemaFromPrompt = useCallback(async (prompt: string): Promise<{ success: boolean; error?: string }> => {
    setIsGenerating(true);

    // Switch to design mode when generating
    setBuilderMode('design');

    // Build the full prompt with schema generation instructions
    const schemaInstructions = `You are a database schema designer. When the user asks you to create tables or a schema, respond with structured table definitions.

Use this format for creating tables:
[ACTION:CREATE_SCHEMA]
{
  "tables": [
    {
      "name": "table_name",
      "description": "Description of the table",
      "fields": [
        { "name": "id", "type": "UUID", "pk": true, "nullable": false, "description": "Primary key" },
        { "name": "created_at", "type": "TIMESTAMP", "nullable": false },
        { "name": "other_table_id", "type": "UUID", "fk": "other_table(id)", "nullable": false }
      ]
    }
  ],
  "relationships": [
    { "fromTable": "table_name", "fromField": "other_table_id", "toTable": "other_table", "toField": "id", "type": "one-to-many" }
  ]
}
[/ACTION]

Always include:
- Primary key (usually 'id' with UUID type)
- created_at and updated_at timestamps
- Appropriate foreign keys for relationships
- Proper data types (UUID, VARCHAR, TEXT, INTEGER, BOOLEAN, TIMESTAMP, JSONB, etc.)

After the ACTION block, provide a brief explanation of the schema design.

User request: ${prompt}`;

    try {
      const response = await api.copilot.chat({
        message: schemaInstructions,
        context: 'db-schema-generator',
        projectId: currentProjectId || undefined,
      });

      const content = response.message?.content || '';

      // Parse tables from the response
      const { tables: newTables, relationships: newRels } = parseTablesFromResponse(content);

      if (newTables.length > 0) {
        // Calculate positions for new tables in a grid layout
        const existingCount = tables.length;
        const cols = 3;
        newTables.forEach((table, index) => {
          const totalIndex = existingCount + index;
          table.position = {
            x: (totalIndex % cols) * 350 + 50,
            y: Math.floor(totalIndex / cols) * 300 + 50,
          };
        });

        // Add new tables and relationships
        setTablesState(prev => [...prev, ...newTables]);
        if (newRels.length > 0) {
          setRelationships(prev => [...prev, ...newRels]);
        }

        // Add assistant message with the tables
        const assistantMessage: DBAgentMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content,
          timestamp: new Date(),
          tables: newTables,
        };
        setMessages(prev => [...prev, assistantMessage]);

        return { success: true };
      }

      // Even if no tables, add the response as a message
      const assistantMessage: DBAgentMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      return { success: false, error: 'No tables found in response' };
    } catch (error) {
      console.error('Failed to generate schema:', error);
      return { success: false, error: String(error) };
    } finally {
      setIsGenerating(false);
    }
  }, [currentProjectId, tables.length]);

  const setTables = useCallback((newTables: DBTable[]) => {
    setTablesState(newTables);
  }, []);

  const addTable = useCallback((table: DBTable) => {
    // Calculate position if not set
    if (!table.position) {
      const cols = 3;
      const index = tables.length;
      table.position = {
        x: (index % cols) * 350 + 50,
        y: Math.floor(index / cols) * 300 + 50,
      };
    }
    setTablesState(prev => [...prev, table]);
  }, [tables.length]);

  const updateTable = useCallback((tableId: string, updates: Partial<DBTable>) => {
    setTablesState(prev => prev.map(t => t.id === tableId ? { ...t, ...updates } : t));
  }, []);

  const removeTable = useCallback((tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (table) {
      // Remove relationships involving this table
      setRelationships(prev => prev.filter(r =>
        r.fromTable !== table.name && r.toTable !== table.name
      ));
    }
    setTablesState(prev => prev.filter(t => t.id !== tableId));
    setSelectedTable(prev => (prev?.id === tableId ? null : prev));
  }, [tables]);

  const addRelationship = useCallback((relationship: TableRelationship) => {
    setRelationships(prev => [...prev, relationship]);
  }, []);

  const removeRelationship = useCallback((relationshipId: string) => {
    setRelationships(prev => prev.filter(r => r.id !== relationshipId));
  }, []);

  const addMessage = useCallback((message: DBAgentMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <DBBuilderContext.Provider
      value={{
        tables,
        relationships,
        selectedTable,
        viewMode,
        builderMode,
        isLoading,
        isIntrospecting,
        isGenerating,
        saveStatus,
        schemaName,
        dbStats,
        tableRowCounts,
        cardId,
        messages,
        setTables,
        setSelectedTable,
        setViewMode,
        setBuilderMode,
        addTable,
        updateTable,
        removeTable,
        addRelationship,
        removeRelationship,
        introspectDatabase,
        saveSchema,
        generateSchemaFromPrompt,
        addMessage,
        clearMessages,
      }}
    >
      {children}
    </DBBuilderContext.Provider>
  );
}

export function useDBBuilder() {
  const context = useContext(DBBuilderContext);
  if (!context) {
    throw new Error('useDBBuilder must be used within a DBBuilderProvider');
  }
  return context;
}
