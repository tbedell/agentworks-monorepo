import * as crypto from 'crypto';
import { prisma } from '@agentworks/db';
import { createLogger } from '@agentworks/shared';
import type { AgentName } from '@agentworks/shared';

const logger = createLogger('agents:document-service');

export type DocType = 'Plan' | 'Task' | 'Todo';

export interface AgentDocument {
  id: string;
  projectId: string;
  agentName: string;
  docType: DocType;
  content: string;
  version: number;
  tokenCount: number;
  lastAgentRunId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TodoItem {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high';
  description?: string;
  createdAt: string;
  completedAt?: string;
}

export interface AgentContext {
  plan: AgentDocument | null;
  task: AgentDocument | null;
  todo: AgentDocument | null;
}

export interface TokenBudget {
  systemPrompt: number;
  styleGuide: number;
  agentPlan: number;
  agentTask: number;
  agentTodo: number;
  projectContext: number;
  cardContext: number;
}

const TOKEN_BUDGETS = {
  full: {
    systemPrompt: 4000,
    styleGuide: 800,
    agentPlan: 4000,
    agentTask: 2000,
    agentTodo: 1000,
    projectContext: 2500,
    cardContext: 1000,
  },
  summary: {
    systemPrompt: 2000,
    styleGuide: 300,
    agentPlan: 1500,
    agentTask: 500,
    agentTodo: 300,
    projectContext: 1000,
    cardContext: 500,
  },
} as const;

export class AgentDocumentService {
  async getDocument(
    projectId: string,
    agentName: AgentName,
    docType: DocType
  ): Promise<AgentDocument | null> {
    const doc = await prisma.agentDocument.findUnique({
      where: {
        projectId_agentName_docType: {
          projectId,
          agentName,
          docType,
        },
      },
    });

    return doc ? this.toAgentDocument(doc) : null;
  }

  async getAgentContext(
    projectId: string,
    agentName: AgentName
  ): Promise<AgentContext> {
    const [plan, task, todo] = await Promise.all([
      this.getDocument(projectId, agentName, 'Plan'),
      this.getDocument(projectId, agentName, 'Task'),
      this.getDocument(projectId, agentName, 'Todo'),
    ]);

    return { plan, task, todo };
  }

  async createOrUpdateDocument(
    projectId: string,
    agentName: AgentName,
    docType: DocType,
    content: string,
    agentRunId?: string
  ): Promise<AgentDocument> {
    logger.info('Updating agent document', { projectId, agentName, docType });

    const tokenCount = this.estimateTokenCount(content);

    const doc = await prisma.agentDocument.upsert({
      where: {
        projectId_agentName_docType: {
          projectId,
          agentName,
          docType,
        },
      },
      update: {
        content,
        tokenCount,
        lastAgentRunId: agentRunId,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
      create: {
        projectId,
        agentName,
        docType,
        content,
        tokenCount,
        lastAgentRunId: agentRunId,
      },
    });

    logger.info('Agent document updated', {
      projectId,
      agentName,
      docType,
      version: doc.version,
      tokenCount,
    });

    return this.toAgentDocument(doc);
  }

  async updatePlan(
    projectId: string,
    agentName: AgentName,
    content: string,
    agentRunId?: string
  ): Promise<AgentDocument> {
    return this.createOrUpdateDocument(projectId, agentName, 'Plan', content, agentRunId);
  }

  async updateTask(
    projectId: string,
    agentName: AgentName,
    content: string,
    agentRunId?: string
  ): Promise<AgentDocument> {
    return this.createOrUpdateDocument(projectId, agentName, 'Task', content, agentRunId);
  }

  async updateTodo(
    projectId: string,
    agentName: AgentName,
    items: TodoItem[],
    agentRunId?: string
  ): Promise<AgentDocument> {
    const content = this.formatTodoContent(items);
    return this.createOrUpdateDocument(projectId, agentName, 'Todo', content, agentRunId);
  }

  async appendToTask(
    projectId: string,
    agentName: AgentName,
    entry: string,
    agentRunId?: string
  ): Promise<AgentDocument> {
    const existing = await this.getDocument(projectId, agentName, 'Task');
    const timestamp = new Date().toISOString();
    const newEntry = `\n---\n## ${timestamp}\n\n${entry}\n`;
    const newContent = existing ? existing.content + newEntry : newEntry;

    return this.createOrUpdateDocument(projectId, agentName, 'Task', newContent, agentRunId);
  }

  async addTodoItem(
    projectId: string,
    agentName: AgentName,
    item: Omit<TodoItem, 'id' | 'createdAt'>,
    agentRunId?: string
  ): Promise<AgentDocument> {
    const existing = await this.getDocument(projectId, agentName, 'Todo');
    const existingItems = existing ? this.parseTodoContent(existing.content) : [];

    const newItem: TodoItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    return this.updateTodo(projectId, agentName, [...existingItems, newItem], agentRunId);
  }

  async updateTodoItemStatus(
    projectId: string,
    agentName: AgentName,
    itemId: string,
    status: TodoItem['status'],
    agentRunId?: string
  ): Promise<AgentDocument> {
    const existing = await this.getDocument(projectId, agentName, 'Todo');
    if (!existing) {
      throw new Error('Todo document not found');
    }

    const items = this.parseTodoContent(existing.content);
    const itemIndex = items.findIndex((i) => i.id === itemId);

    if (itemIndex === -1) {
      throw new Error('Todo item not found');
    }

    items[itemIndex].status = status;
    if (status === 'completed') {
      items[itemIndex].completedAt = new Date().toISOString();
    }

    return this.updateTodo(projectId, agentName, items, agentRunId);
  }

  async getTokenOptimizedContext(
    projectId: string,
    agentName: AgentName,
    mode: 'full' | 'summary' = 'full'
  ): Promise<string> {
    const context = await this.getAgentContext(projectId, agentName);
    const budget = TOKEN_BUDGETS[mode];

    let result = '';

    if (context.plan) {
      const planContent = this.truncateToTokens(context.plan.content, budget.agentPlan);
      if (planContent) {
        result += `## Agent Plan\n\n${planContent}\n\n`;
      }
    }

    if (context.task) {
      const taskContent = mode === 'full'
        ? this.truncateToTokens(context.task.content, budget.agentTask)
        : this.getRecentTasks(context.task.content, budget.agentTask);
      if (taskContent) {
        result += `## Recent Tasks\n\n${taskContent}\n\n`;
      }
    }

    if (context.todo) {
      const todoContent = mode === 'full'
        ? this.truncateToTokens(context.todo.content, budget.agentTodo)
        : this.getHighPriorityTodos(context.todo.content, budget.agentTodo);
      if (todoContent) {
        result += `## Pending Items\n\n${todoContent}\n\n`;
      }
    }

    return result;
  }

  async summarizeForHandoff(
    projectId: string,
    fromAgent: AgentName,
    toAgent: AgentName
  ): Promise<string> {
    const fromContext = await this.getAgentContext(projectId, fromAgent);

    let summary = `## Handoff from ${fromAgent} to ${toAgent}\n\n`;

    if (fromContext.plan) {
      const keyDecisions = this.extractKeyDecisions(fromContext.plan.content);
      if (keyDecisions) {
        summary += `### Key Decisions\n${keyDecisions}\n\n`;
      }
    }

    if (fromContext.task) {
      const recentWork = this.getRecentTasks(fromContext.task.content, 500);
      if (recentWork) {
        summary += `### Recent Work\n${recentWork}\n\n`;
      }
    }

    if (fromContext.todo) {
      const pendingItems = this.getHighPriorityTodos(fromContext.todo.content, 300);
      if (pendingItems) {
        summary += `### Pending Items\n${pendingItems}\n\n`;
      }
    }

    return summary;
  }

  async getAllAgentDocuments(projectId: string): Promise<AgentDocument[]> {
    const docs = await prisma.agentDocument.findMany({
      where: { projectId },
      orderBy: [{ agentName: 'asc' }, { docType: 'asc' }],
    });

    return docs.map((d) => this.toAgentDocument(d));
  }

  async deleteAgentDocuments(projectId: string, agentName: AgentName): Promise<void> {
    await prisma.agentDocument.deleteMany({
      where: { projectId, agentName },
    });

    logger.info('Agent documents deleted', { projectId, agentName });
  }

  getTokenBudget(mode: 'full' | 'summary'): TokenBudget {
    return TOKEN_BUDGETS[mode];
  }

  private formatTodoContent(items: TodoItem[]): string {
    const lines: string[] = ['# Agent Todo List\n'];

    const statusOrder = { in_progress: 0, blocked: 1, pending: 2, completed: 3 };
    const sorted = [...items].sort((a, b) => {
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    for (const item of sorted) {
      const checkbox = item.status === 'completed' ? '[x]' : item.status === 'in_progress' ? '[~]' : item.status === 'blocked' ? '[!]' : '[ ]';
      const priority = item.priority === 'high' ? '🔴' : item.priority === 'medium' ? '🟡' : '🟢';
      lines.push(`- ${checkbox} ${priority} ${item.title} (id: ${item.id})`);
      if (item.description) {
        lines.push(`  - ${item.description}`);
      }
    }

    return lines.join('\n');
  }

  private parseTodoContent(content: string): TodoItem[] {
    const items: TodoItem[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/^- \[([ x~!])\] (🔴|🟡|🟢) (.+?) \(id: ([^)]+)\)$/);
      if (match) {
        const [, statusChar, priorityEmoji, title, id] = match;
        const status = statusChar === 'x' ? 'completed' : statusChar === '~' ? 'in_progress' : statusChar === '!' ? 'blocked' : 'pending';
        const priority = priorityEmoji === '🔴' ? 'high' : priorityEmoji === '🟡' ? 'medium' : 'low';

        items.push({
          id,
          title,
          status,
          priority,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return items;
  }

  private truncateToTokens(content: string, maxTokens: number): string {
    const estimatedCharsPerToken = 4;
    const maxChars = maxTokens * estimatedCharsPerToken;

    if (content.length <= maxChars) {
      return content;
    }

    return content.substring(0, maxChars) + '\n\n[... truncated for token budget]';
  }

  private getRecentTasks(content: string, maxTokens: number): string {
    const sections = content.split(/---\n## \d{4}-\d{2}-\d{2}T/);
    const recent = sections.slice(-3);

    let result = recent.join('\n---\n## ');
    if (sections.length > 3) {
      result = `[${sections.length - 3} earlier tasks omitted]\n\n` + result;
    }

    return this.truncateToTokens(result, maxTokens);
  }

  private getHighPriorityTodos(content: string, maxTokens: number): string {
    const items = this.parseTodoContent(content);
    const highPriority = items.filter(
      (i) => i.status !== 'completed' && (i.priority === 'high' || i.status === 'in_progress')
    );

    const formatted = this.formatTodoContent(highPriority);
    return this.truncateToTokens(formatted, maxTokens);
  }

  private extractKeyDecisions(planContent: string): string {
    const decisions: string[] = [];
    const lines = planContent.split('\n');

    let inDecisionSection = false;
    for (const line of lines) {
      if (/^##?\s*(decisions|key decisions|choices|approach)/i.test(line)) {
        inDecisionSection = true;
        continue;
      }
      if (inDecisionSection && line.startsWith('#')) {
        break;
      }
      if (inDecisionSection && line.trim()) {
        decisions.push(line);
      }
    }

    if (decisions.length === 0) {
      return planContent.substring(0, 500);
    }

    return decisions.join('\n');
  }

  private estimateTokenCount(content: string): number {
    return Math.ceil(content.length / 4);
  }

  private toAgentDocument(doc: {
    id: string;
    projectId: string;
    agentName: string;
    docType: string;
    content: string;
    version: number;
    tokenCount: number;
    lastAgentRunId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): AgentDocument {
    return {
      id: doc.id,
      projectId: doc.projectId,
      agentName: doc.agentName,
      docType: doc.docType as DocType,
      content: doc.content,
      version: doc.version,
      tokenCount: doc.tokenCount,
      lastAgentRunId: doc.lastAgentRunId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

export const agentDocumentService = new AgentDocumentService();
