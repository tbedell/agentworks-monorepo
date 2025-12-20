/**
 * Card State Machine
 *
 * Manages card lifecycle to prevent duplicate cards and ensure proper
 * state transitions through the Kanban board.
 *
 * Key principles:
 * - One card per document type (Blueprint, PRD, MVP, Playbook)
 * - Cards MOVE through lanes, not get duplicated
 * - All state changes are logged to CardHistory
 */

import { prisma } from '@agentworks/db';
import { createLogger } from '@agentworks/shared';

const logger = createLogger('card-state-machine');

// Document types that get single cards
export const DOCUMENT_TYPES = ['blueprint', 'prd', 'mvp', 'playbook'] as const;
export type DocumentType = typeof DOCUMENT_TYPES[number];

// Card states
export type CardStatus = 'pending' | 'Ready' | 'Running' | 'InProgress' | 'Blocked' | 'Done';

// Lane mappings for document types
export const DOCUMENT_LANE_MAPPING: Record<DocumentType, { initialLane: number; reviewLane: number; completeLane: number }> = {
  blueprint: { initialLane: 0, reviewLane: 6, completeLane: 7 },
  prd: { initialLane: 1, reviewLane: 6, completeLane: 7 },
  mvp: { initialLane: 1, reviewLane: 6, completeLane: 7 },
  playbook: { initialLane: 0, reviewLane: 6, completeLane: 7 },
};

// Document type display names
export const DOCUMENT_TYPE_NAMES: Record<DocumentType, string> = {
  blueprint: 'Blueprint',
  prd: 'PRD',
  mvp: 'MVP',
  playbook: 'Agent Playbook',
};

interface FindOrCreateCardOptions {
  boardId: string;
  documentType: DocumentType;
  projectName: string;
  performedBy: string;
}

interface TransitionCardOptions {
  cardId: string;
  trigger: 'agent_start' | 'agent_complete' | 'human_approve' | 'human_reject' | 'document_generated';
  performedBy: string;
  targetLaneNumber?: number;
  details?: string;
  metadata?: Record<string, any>;
}

/**
 * Find existing card for a document type or create one if it doesn't exist.
 * Prevents duplicate cards by searching for existing cards with the same title pattern.
 */
export async function findOrCreateDocumentCard(options: FindOrCreateCardOptions): Promise<{
  card: any;
  created: boolean;
}> {
  const { boardId, documentType, projectName, performedBy } = options;
  const docTypeName = DOCUMENT_TYPE_NAMES[documentType];

  // Search patterns for this document type
  const titlePatterns = [
    `Review ${docTypeName}`,
    `${projectName} - ${docTypeName}`,
    docTypeName,
  ];

  // Find existing card with any of these titles (case-insensitive)
  const existingCard = await prisma.card.findFirst({
    where: {
      boardId,
      OR: titlePatterns.map(title => ({
        title: {
          equals: title,
          mode: 'insensitive' as const,
        },
      })),
    },
    include: {
      lane: true,
    },
  });

  if (existingCard) {
    logger.info('Found existing card for document type', {
      documentType,
      cardId: existingCard.id,
      title: existingCard.title,
    });
    return { card: existingCard, created: false };
  }

  // Get board and lanes
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: { lanes: true },
  });

  if (!board) {
    throw new Error(`Board ${boardId} not found`);
  }

  // Find the initial lane for this document type
  const laneMapping = DOCUMENT_LANE_MAPPING[documentType];
  const initialLane = board.lanes.find(l => l.laneNumber === laneMapping.initialLane);

  if (!initialLane) {
    throw new Error(`Initial lane ${laneMapping.initialLane} not found for ${documentType}`);
  }

  // Get max position in the lane
  const maxPosition = await prisma.card.aggregate({
    where: { laneId: initialLane.id },
    _max: { position: true },
  });

  // Create the card with standard title
  const card = await prisma.card.create({
    data: {
      boardId,
      laneId: initialLane.id,
      title: `Review ${docTypeName}`,
      description: `Review and approve the ${docTypeName} document for ${projectName}.`,
      type: 'Doc',
      priority: 'high',
      assignedAgent: 'ceo_copilot',
      status: 'pending',
      position: (maxPosition._max.position ?? -1) + 1,
    },
    include: {
      lane: true,
    },
  });

  // Create history entry for card creation
  await prisma.cardHistory.create({
    data: {
      cardId: card.id,
      action: 'created',
      previousValue: null,
      newValue: initialLane.name,
      performedBy,
      details: `Card created for ${docTypeName} document`,
      metadata: { documentType, source: 'card-state-machine' },
    },
  });

  logger.info('Created new card for document type', {
    documentType,
    cardId: card.id,
    title: card.title,
    lane: initialLane.name,
  });

  return { card, created: true };
}

/**
 * Transition a card to a new state, moving it to the appropriate lane
 * and logging the change to CardHistory.
 */
export async function transitionCard(options: TransitionCardOptions): Promise<any> {
  const { cardId, trigger, performedBy, targetLaneNumber, details, metadata } = options;

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      lane: true,
      board: { include: { lanes: true } },
    },
  });

  if (!card) {
    throw new Error(`Card ${cardId} not found`);
  }

  const previousLane = card.lane;
  let newLane = previousLane;
  let newStatus: CardStatus = card.status as CardStatus;

  // Determine target lane and status based on trigger
  if (targetLaneNumber !== undefined) {
    newLane = card.board.lanes.find(l => l.laneNumber === targetLaneNumber) || previousLane;
  } else {
    // Default lane transitions based on trigger
    switch (trigger) {
      case 'agent_start':
        newStatus = 'Running';
        break;
      case 'agent_complete':
        // Move to review lane (6)
        newLane = card.board.lanes.find(l => l.laneNumber === 6) || previousLane;
        newStatus = 'Ready';
        break;
      case 'human_approve':
        // Move to complete lane (7)
        newLane = card.board.lanes.find(l => l.laneNumber === 7) || previousLane;
        newStatus = 'Done';
        break;
      case 'human_reject':
        // Move back to previous lane
        newStatus = 'Blocked';
        break;
      case 'document_generated':
        // Move to review lane (6)
        newLane = card.board.lanes.find(l => l.laneNumber === 6) || previousLane;
        newStatus = 'Ready';
        break;
    }
  }

  const laneChanged = newLane.id !== previousLane.id;
  const statusChanged = newStatus !== card.status;

  // Update card
  const updatedCard = await prisma.card.update({
    where: { id: cardId },
    data: {
      laneId: newLane.id,
      status: newStatus,
      ...(laneChanged && {
        position: await getNextPositionInLane(newLane.id),
      }),
    },
    include: {
      lane: true,
    },
  });

  // Create history entry
  const historyAction = laneChanged ? 'lane_change' : 'status_change';
  await prisma.cardHistory.create({
    data: {
      cardId,
      action: historyAction,
      previousValue: laneChanged ? previousLane.name : card.status,
      newValue: laneChanged ? newLane.name : newStatus,
      performedBy,
      details: details || `Card ${trigger.replace('_', ' ')}`,
      metadata: {
        trigger,
        laneChanged,
        statusChanged,
        previousLaneNumber: previousLane.laneNumber,
        newLaneNumber: newLane.laneNumber,
        ...metadata,
      },
    },
  });

  logger.info('Card transitioned', {
    cardId,
    trigger,
    previousLane: previousLane.name,
    newLane: newLane.name,
    previousStatus: card.status,
    newStatus,
  });

  return updatedCard;
}

/**
 * Get the card associated with a specific document type for a project.
 */
export async function getCardForDocument(projectId: string, documentType: DocumentType): Promise<any | null> {
  const docTypeName = DOCUMENT_TYPE_NAMES[documentType];

  // Find the project's board
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { boards: { include: { cards: { include: { lane: true } } } } },
  });

  if (!project || project.boards.length === 0) {
    return null;
  }

  const board = project.boards[0];

  // Search patterns for this document type
  const titlePatterns = [
    `Review ${docTypeName}`,
    `${project.name} - ${docTypeName}`,
    docTypeName,
  ];

  // Find card with matching title
  const card = board.cards.find(c =>
    titlePatterns.some(pattern =>
      c.title.toLowerCase() === pattern.toLowerCase()
    )
  );

  return card || null;
}

/**
 * Move a card to the completed lane and mark it as done.
 */
export async function markCardComplete(cardId: string, performedBy: string, timestamp?: Date): Promise<any> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { lane: true, board: { include: { lanes: true } } },
  });

  if (!card) {
    throw new Error(`Card ${cardId} not found`);
  }

  // Find complete lane (lane 7 - Test/Troubleshoot, or fallback to highest numbered lane)
  const completeLane = card.board.lanes.find(l => l.laneNumber === 7)
    || card.board.lanes.reduce((a, b) => a.laneNumber > b.laneNumber ? a : b);

  const updatedCard = await prisma.card.update({
    where: { id: cardId },
    data: {
      laneId: completeLane.id,
      status: 'Done',
      position: await getNextPositionInLane(completeLane.id),
    },
    include: { lane: true },
  });

  // Create history entry with timestamp
  await prisma.cardHistory.create({
    data: {
      cardId,
      action: 'completed',
      previousValue: card.lane.name,
      newValue: completeLane.name,
      performedBy,
      details: 'Card marked as complete',
      metadata: {
        completedAt: (timestamp || new Date()).toISOString(),
        previousLaneNumber: card.lane.laneNumber,
        completeLaneNumber: completeLane.laneNumber,
      },
    },
  });

  logger.info('Card marked complete', {
    cardId,
    previousLane: card.lane.name,
    completeLane: completeLane.name,
    timestamp: (timestamp || new Date()).toISOString(),
  });

  return updatedCard;
}

/**
 * Log an event to card history without changing the card's state.
 */
export async function logCardEvent(
  cardId: string,
  action: string,
  performedBy: string,
  details?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await prisma.cardHistory.create({
    data: {
      cardId,
      action,
      previousValue: null,
      newValue: null,
      performedBy,
      details,
      metadata,
    },
  });

  logger.debug('Card event logged', { cardId, action, performedBy });
}

// Helper function to get next position in a lane
async function getNextPositionInLane(laneId: string): Promise<number> {
  const maxPosition = await prisma.card.aggregate({
    where: { laneId },
    _max: { position: true },
  });
  return (maxPosition._max.position ?? -1) + 1;
}
