import { useState } from 'react';
import {
  Database,
  Table2,
  GitBranch,
  Zap,
  Plus,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  Server,
  Pencil,
  Key,
  Link,
  Loader2,
  Download,
  Settings,
  Upload,
} from 'lucide-react';
import BaseLeftPanel from './BaseLeftPanel';
import { Accordion } from '../../common/Accordion';
import { useDBBuilder } from '../../../contexts/DBBuilderContext';
import DBAgentPanel from '../../agents/DBAgentPanel';
import clsx from 'clsx';

interface DBBuilderLeftPanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function DBBuilderLeftPanel({ collapsed, onToggle }: DBBuilderLeftPanelProps) {
  const {
    tables,
    selectedTable,
    setSelectedTable,
    builderMode,
    setBuilderMode,
    isIntrospecting,
    introspectDatabase,
    tableRowCounts,
    dbStats,
  } = useDBBuilder();

  const [, setShowAddTableModal] = useState(false);

  // Mock migrations data - would come from API in real implementation
  const migrations = [
    { name: '20241201_initial', status: 'applied', date: '2024-12-01' },
    { name: '20241205_add_cards', status: 'applied', date: '2024-12-05' },
    { name: '20241210_add_runs', status: 'pending', date: '2024-12-10' },
  ];

  const agentBadge = (
    <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded text-xs">
      <Database className="h-3 w-3" />
      <span className="font-medium">DB Agent</span>
    </div>
  );

  return (
    <BaseLeftPanel
      collapsed={collapsed}
      onToggle={onToggle}
      title="DB Builder"
      agentButton={agentBadge}
      bottomContent={<DBAgentPanel />}
    >
      {/* Mode Toggle */}
      <div className="px-3 py-2 border-b border-slate-100">
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setBuilderMode('introspect')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-md transition-colors',
              builderMode === 'introspect'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Server className="h-3 w-3" />
            Live DB
          </button>
          <button
            onClick={() => setBuilderMode('design')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-md transition-colors',
              builderMode === 'design'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Pencil className="h-3 w-3" />
            Design
          </button>
        </div>
      </div>

      {/* Stats */}
      {dbStats && builderMode === 'introspect' && (
        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-semibold text-slate-900">{dbStats.tableCount}</div>
              <div className="text-xs text-slate-500">Tables</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-900">{dbStats.totalColumns}</div>
              <div className="text-xs text-slate-500">Columns</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-900">{dbStats.foreignKeyCount}</div>
              <div className="text-xs text-slate-500">FKs</div>
            </div>
          </div>
        </div>
      )}

      {/* Tables */}
      <Accordion
        title={builderMode === 'introspect' ? 'Live Tables' : 'Schema Tables'}
        icon={<Table2 className="h-4 w-4" />}
        defaultOpen={true}
        headerRight={
          builderMode === 'introspect' ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                introspectDatabase();
              }}
              disabled={isIntrospecting}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
              title="Refresh"
            >
              <RefreshCw className={clsx('h-3.5 w-3.5', isIntrospecting && 'animate-spin')} />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAddTableModal(true);
              }}
              className="p-1 text-slate-400 hover:text-green-600 rounded"
              title="Add Table"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )
        }
      >
        <div className="space-y-1.5">
          {isIntrospecting ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-green-600" />
            </div>
          ) : tables.length > 0 ? (
            tables.map((table) => {
              const rowCount = tableRowCounts.get(table.name);
              const isSelected = selectedTable?.id === table.id;
              const pkCount = table.fields.filter(f => f.pk).length;
              const fkCount = table.fields.filter(f => f.fk).length;

              return (
                <button
                  key={table.id}
                  onClick={() => setSelectedTable(table)}
                  className={clsx(
                    'w-full text-left p-2 rounded-lg border transition-all',
                    isSelected
                      ? 'bg-green-50 border-green-300 ring-1 ring-green-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Database className={clsx('h-3.5 w-3.5', isSelected ? 'text-green-600' : 'text-slate-500')} />
                    <span className={clsx('text-xs font-medium', isSelected ? 'text-green-900' : 'text-slate-700')}>
                      {table.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{table.fields.length} cols</span>
                    <div className="flex items-center gap-2">
                      {pkCount > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Key className="h-2.5 w-2.5 text-yellow-500" />
                          {pkCount}
                        </span>
                      )}
                      {fkCount > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Link className="h-2.5 w-2.5 text-blue-500" />
                          {fkCount}
                        </span>
                      )}
                      {builderMode === 'introspect' && rowCount !== undefined && (
                        <span className="text-slate-400">{rowCount.toLocaleString()} rows</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-xs text-slate-400 text-center py-4">
              {builderMode === 'introspect' ? 'No tables found in database' : 'No tables defined yet'}
            </div>
          )}
        </div>
      </Accordion>

      {/* Migrations */}
      <Accordion
        title="Migrations"
        icon={<GitBranch className="h-4 w-4" />}
        defaultOpen={false}
      >
        <div className="space-y-1.5">
          {migrations.length > 0 ? (
            migrations.map((migration) => (
              <div
                key={migration.name}
                className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {migration.status === 'applied' ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  ) : migration.status === 'pending' ? (
                    <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  )}
                  <span className="text-xs font-medium text-slate-700 truncate">
                    {migration.name}
                  </span>
                </div>
                <span className="text-xs text-slate-400 shrink-0">{migration.date}</span>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-400 text-center py-2">
              No migrations found
            </div>
          )}
        </div>
      </Accordion>

      {/* Quick Actions */}
      <Accordion
        title="Quick Actions"
        icon={<Zap className="h-4 w-4" />}
        defaultOpen={false}
      >
        <div className="space-y-1.5">
          {builderMode === 'design' && (
            <button
              onClick={() => setShowAddTableModal(true)}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-slate-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-green-600" />
              Add New Table
            </button>
          )}
          <button className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
            <GitBranch className="h-3.5 w-3.5 text-slate-500" />
            New Migration
          </button>
          <button className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
            <Zap className="h-3.5 w-3.5 text-slate-500" />
            Generate Types
          </button>
          <button className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
            <Download className="h-3.5 w-3.5 text-slate-500" />
            Export Schema
          </button>
          <button className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
            <Upload className="h-3.5 w-3.5 text-slate-500" />
            Import Schema
          </button>
          <button className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
            <Settings className="h-3.5 w-3.5 text-slate-500" />
            Database Settings
          </button>
        </div>
      </Accordion>
    </BaseLeftPanel>
  );
}
