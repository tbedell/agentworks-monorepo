import { prisma } from '@agentworks/db';
import { createLogger } from '@agentworks/shared';
import type { AgentName } from '@agentworks/shared';
import { AGENT_DEFINITIONS } from './definitions.js';
import { AgentDocumentService, agentDocumentService, TokenBudget } from './document-service.js';
import { StyleGuideService, styleGuideService } from '@agentworks/style-guide';

const logger = createLogger('agents:prompt-builder');

export interface PromptContext {
  projectId: string;
  agentName: AgentName;
  cardId?: string;
  cardTitle?: string;
  cardDescription?: string;
  additionalContext?: Record<string, unknown>;
}

export interface BuiltPrompt {
  systemPrompt: string;
  userContext: string;
  totalTokenEstimate: number;
  mode: 'full' | 'summary';
}

export type TaskComplexity = 'simple' | 'moderate' | 'complex';

export class PromptBuilder {
  private documentService: AgentDocumentService;
  private styleGuideService: StyleGuideService;

  constructor(
    documentService?: AgentDocumentService,
    styleGuideServiceInstance?: StyleGuideService
  ) {
    this.documentService = documentService || agentDocumentService;
    this.styleGuideService = styleGuideServiceInstance || styleGuideService;
  }

  async buildPrompt(
    context: PromptContext,
    complexity: TaskComplexity = 'moderate'
  ): Promise<BuiltPrompt> {
    const mode = this.determineMode(complexity);
    const budget = this.documentService.getTokenBudget(mode);

    logger.info('Building prompt', {
      projectId: context.projectId,
      agentName: context.agentName,
      mode,
      complexity,
    });

    const [systemPrompt, userContext] = await Promise.all([
      this.buildSystemPrompt(context.agentName, context.projectId, budget),
      this.buildUserContext(context, budget),
    ]);

    const totalTokenEstimate =
      this.estimateTokens(systemPrompt) + this.estimateTokens(userContext);

    return {
      systemPrompt,
      userContext,
      totalTokenEstimate,
      mode,
    };
  }

  async buildSystemPrompt(
    agentName: AgentName,
    projectId: string,
    budget: TokenBudget
  ): Promise<string> {
    const agentDef = AGENT_DEFINITIONS.find((a) => a.name === agentName);
    if (!agentDef) {
      throw new Error(`Agent definition not found: ${agentName}`);
    }

    let systemPrompt = this.truncateToTokens(agentDef.systemPrompt, budget.systemPrompt);

    const styleGuideSection = await this.getStyleGuideSection(projectId, budget.styleGuide);
    if (styleGuideSection) {
      systemPrompt += `\n\n${styleGuideSection}`;
    }

    const agentDocSection = await this.getAgentDocSection(
      projectId,
      agentName,
      budget
    );
    if (agentDocSection) {
      systemPrompt += `\n\n${agentDocSection}`;
    }

    return systemPrompt;
  }

  private async buildUserContext(
    context: PromptContext,
    budget: TokenBudget
  ): Promise<string> {
    const sections: string[] = [];

    const projectContext = await this.getProjectContext(context.projectId, budget.projectContext);
    if (projectContext) {
      sections.push(projectContext);
    }

    if (context.cardId) {
      const cardContext = await this.getCardContext(context.cardId, budget.cardContext);
      if (cardContext) {
        sections.push(cardContext);
      }
    } else if (context.cardTitle) {
      sections.push(`## Current Task\n\n**${context.cardTitle}**\n\n${context.cardDescription || ''}`);
    }

    if (context.additionalContext) {
      sections.push(
        `## Additional Context\n\n${JSON.stringify(context.additionalContext, null, 2)}`
      );
    }

    return sections.join('\n\n---\n\n');
  }

  private async getStyleGuideSection(
    projectId: string,
    maxTokens: number
  ): Promise<string | null> {
    try {
      const styleGuide = await this.styleGuideService.getStyleGuide(projectId);
      if (!styleGuide) {
        return null;
      }

      const formatted = this.styleGuideService.formatStyleGuideForPrompt(styleGuide);
      return this.truncateToTokens(formatted, maxTokens);
    } catch (error) {
      logger.warn('Failed to get style guide', { projectId, error });
      return null;
    }
  }

  private async getAgentDocSection(
    projectId: string,
    agentName: AgentName,
    budget: TokenBudget
  ): Promise<string | null> {
    try {
      const mode = budget.agentPlan >= 4000 ? 'full' : 'summary';
      const context = await this.documentService.getTokenOptimizedContext(
        projectId,
        agentName,
        mode
      );

      if (!context.trim()) {
        return null;
      }

      return `## Your Current Context\n\n${context}`;
    } catch (error) {
      logger.warn('Failed to get agent documents', { projectId, agentName, error });
      return null;
    }
  }

  private async getProjectContext(
    projectId: string,
    maxTokens: number
  ): Promise<string | null> {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          workspace: { select: { name: true } },
          docs: {
            where: { type: { in: ['blueprint', 'prd', 'mvp'] } },
            orderBy: { type: 'asc' },
          },
        },
      });

      if (!project) {
        return null;
      }

      const sections: string[] = [
        `## Project: ${project.name}`,
        `- **Workspace**: ${project.workspace.name}`,
        `- **Status**: ${project.status}`,
        `- **Phase**: ${project.phase}`,
      ];

      let remainingTokens = maxTokens - this.estimateTokens(sections.join('\n'));

      for (const doc of project.docs) {
        const docTokens = Math.floor(remainingTokens / project.docs.length);
        const truncated = this.truncateToTokens(doc.content, docTokens);
        if (truncated) {
          sections.push(`\n### ${doc.type.toUpperCase()} (v${doc.version})\n\n${truncated}`);
          remainingTokens -= this.estimateTokens(truncated);
        }
      }

      return sections.join('\n');
    } catch (error) {
      logger.warn('Failed to get project context', { projectId, error });
      return null;
    }
  }

  private async getCardContext(
    cardId: string,
    maxTokens: number
  ): Promise<string | null> {
    try {
      const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
          parent: { select: { id: true, title: true, type: true } },
          children: { select: { id: true, title: true, status: true, type: true } },
          lane: { select: { name: true, laneNumber: true } },
        },
      });

      if (!card) {
        return null;
      }

      const sections: string[] = [
        `## Current Card`,
        `- **Title**: ${card.title}`,
        `- **Type**: ${card.type}`,
        `- **Priority**: ${card.priority}`,
        `- **Status**: ${card.status}`,
        `- **Lane**: ${card.lane.name} (${card.lane.laneNumber})`,
      ];

      if (card.description) {
        sections.push(`\n### Description\n\n${card.description}`);
      }

      if (card.parent) {
        sections.push(`\n### Parent Card\n- ${card.parent.type}: ${card.parent.title}`);
      }

      if (card.children.length > 0) {
        sections.push(`\n### Child Cards`);
        for (const child of card.children) {
          sections.push(`- [${child.status}] ${child.type}: ${child.title}`);
        }
      }

      const result = sections.join('\n');
      return this.truncateToTokens(result, maxTokens);
    } catch (error) {
      logger.warn('Failed to get card context', { cardId, error });
      return null;
    }
  }

  private determineMode(complexity: TaskComplexity): 'full' | 'summary' {
    switch (complexity) {
      case 'complex':
        return 'full';
      case 'simple':
        return 'summary';
      default:
        return 'full';
    }
  }

  private truncateToTokens(content: string, maxTokens: number): string {
    const estimatedCharsPerToken = 4;
    const maxChars = maxTokens * estimatedCharsPerToken;

    if (content.length <= maxChars) {
      return content;
    }

    return content.substring(0, maxChars) + '\n\n[... content truncated for context window]';
  }

  private estimateTokens(content: string): number {
    return Math.ceil(content.length / 4);
  }
}

export const promptBuilder = new PromptBuilder();
