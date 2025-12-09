export interface Lane {
  id: string;
  name: string;
  description: string;
  position: number;
  color: string;
  wipLimit?: number;
  agentTypes: string[];
  cards: Card[];
}

export interface Card {
  id: string;
  title: string;
  description?: string;
  laneId: string;
  position: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type: 'feature' | 'bug' | 'task' | 'epic' | 'story';
  status?: 'Draft' | 'Ready' | 'Queued' | 'Running' | 'Done' | 'Error';
  assignedAgents: string[];
  agentStatus?: {
    agentName: string;
    status: 'idle' | 'running' | 'success' | 'error';
    progress?: number;
    lastUpdate: string;
  }[];
  metadata?: {
    estimatedPoints?: number;
    actualPoints?: number;
    labels: string[];
    attachments?: number;
    comments?: number;
    dependencies?: string[];
    blockers?: string[];
  };
  dates: {
    created: string;
    updated: string;
    dueDate?: string;
    completedDate?: string;
  };
  createdBy: string;
  updatedBy: string;
}

export interface AgentRun {
  id: string;
  cardId: string;
  agentName: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  progress: number;
  output?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface KanbanFilters {
  search: string;
  priority: string[];
  type: string[];
  assignedAgents: string[];
  labels: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface KanbanView {
  id: string;
  name: string;
  filters: KanbanFilters;
  isDefault?: boolean;
}