import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  FileText,
  Terminal,
  Edit3,
  List,
  CheckSquare,
} from 'lucide-react';
import type { ToolCallLogProps, ToolCall } from './types';

const TOOL_ICONS: Record<string, React.ElementType> = {
  read_file: FileText,
  write_file: Edit3,
  list_files: List,
  run_command: Terminal,
  update_docs: FileText,
  update_kanban_card: Edit3,
  append_card_todo: CheckSquare,
  complete_card_todo: CheckCircle,
  update_ui_builder_state: Edit3,
  update_db_builder_state: Edit3,
  update_workflow_builder_state: Edit3,
  log_run_summary: FileText,
};

const STATUS_COLORS = {
  pending: 'text-gray-400',
  running: 'text-blue-500',
  completed: 'text-green-500',
  failed: 'text-red-500',
};

function ToolCallItem({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TOOL_ICONS[toolCall.name] || Terminal;

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="border border-gray-200 rounded-lg mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-gray-50"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
        )}

        {toolCall.status === 'running' ? (
          <Loader2 className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
        ) : toolCall.status === 'completed' ? (
          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
        ) : toolCall.status === 'failed' ? (
          <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
        ) : (
          <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
        )}

        <Icon className={`h-4 w-4 ${STATUS_COLORS[toolCall.status]} flex-shrink-0`} />

        <span className="font-mono text-sm text-gray-700 flex-1">{toolCall.name}</span>

        {toolCall.duration && (
          <span className="text-xs text-gray-400">{formatDuration(toolCall.duration)}</span>
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-100">
          <div className="mt-2">
            <div className="text-xs font-medium text-gray-500 mb-1">Arguments:</div>
            <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>

          {toolCall.result !== undefined && (
            <div className="mt-2">
              <div className="text-xs font-medium text-gray-500 mb-1">Result:</div>
              <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto max-h-40">
                {typeof toolCall.result === 'string'
                  ? toolCall.result
                  : JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}

          {toolCall.error && (
            <div className="mt-2">
              <div className="text-xs font-medium text-red-500 mb-1">Error:</div>
              <pre className="text-xs bg-red-50 text-red-700 p-2 rounded overflow-x-auto">
                {toolCall.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ToolCallLog({ toolCalls, className = '' }: ToolCallLogProps) {
  const completedCount = toolCalls.filter((t) => t.status === 'completed').length;
  const failedCount = toolCalls.filter((t) => t.status === 'failed').length;
  const runningCount = toolCalls.filter((t) => t.status === 'running').length;

  if (toolCalls.length === 0) {
    return (
      <div className={`text-center text-gray-500 py-8 ${className}`}>
        No tool calls yet. Run the agent to see tool execution logs.
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-4 mb-4 text-sm">
        <span className="text-gray-600">Tool Calls:</span>
        <span className="flex items-center gap-1">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-green-600">{completedCount}</span>
        </span>
        {failedCount > 0 && (
          <span className="flex items-center gap-1">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-red-600">{failedCount}</span>
          </span>
        )}
        {runningCount > 0 && (
          <span className="flex items-center gap-1">
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            <span className="text-blue-600">{runningCount}</span>
          </span>
        )}
      </div>

      <div className="space-y-2">
        {toolCalls.map((toolCall) => (
          <ToolCallItem key={toolCall.id} toolCall={toolCall} />
        ))}
      </div>
    </div>
  );
}
