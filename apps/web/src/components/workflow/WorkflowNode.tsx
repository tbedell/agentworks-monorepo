import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Zap, 
  Play, 
  GitBranch, 
  Database, 
  Globe, 
  Monitor, 
  Bot, 
  Bell 
} from 'lucide-react';
import { type WorkflowNodeData, NODE_TYPE_CONFIG } from './types';

const iconMap = {
  trigger: Zap,
  action: Play,
  condition: GitBranch,
  database: Database,
  api: Globe,
  ui: Monitor,
  agent: Bot,
  notification: Bell,
};

interface WorkflowNodeProps {
  data: WorkflowNodeData;
  selected?: boolean;
}

function WorkflowNodeComponent({ data, selected }: WorkflowNodeProps) {
  const config = NODE_TYPE_CONFIG[data.nodeType];
  const Icon = iconMap[data.nodeType];

  return (
    <div 
      className={`
        px-4 py-3 rounded-lg border-2 shadow-sm min-w-[180px] transition-all
        ${config.bgColor} ${config.borderColor}
        ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white"
      />
      
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-md ${config.bgColor} ${config.color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-semibold uppercase tracking-wide ${config.color} mb-0.5`}>
            {config.label}
          </div>
          <div className="font-medium text-slate-900 text-sm truncate">
            {data.label}
          </div>
          {data.description && (
            <div className="text-xs text-slate-500 mt-1 line-clamp-2">
              {data.description}
            </div>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white"
      />
    </div>
  );
}

export default memo(WorkflowNodeComponent);
