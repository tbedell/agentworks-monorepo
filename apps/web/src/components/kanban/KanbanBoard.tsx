import { useEffect, useState, useCallback, useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useWorkspaceStore } from '../../stores/workspace';
import { Lane, Card as KanbanCardType } from './types';
import { api } from '../../lib/api';
import { useWebSocket } from '../../lib/websocket';
import { useMutation } from '@tanstack/react-query';
import KanbanLane from './KanbanLane';
import KanbanCard from './KanbanCard';
import BoardHeader from './BoardHeader';
import CardDetailModal from './CardDetailModal';
import CardCreateModal from './CardCreateModal';
import LaneSettingsModal from './LaneSettingsModal';
import FloatingWindowsLayer from './FloatingWindowsLayer';
import CompletedSection from './CompletedSection';
import { useFloatingCardsStore } from '../../stores/floatingCards';

// Map old 11-lane numbers to new 7-lane numbers
// Old: 0-4 (Vision, PRD, Research, Arch, Planning) -> 0 (Vision/Planning)
// Old: 5 (Frontend Build) -> 1 (Frontend Build)
// Old: 6 (Backend Build) -> 3 (Workflow Build)
// Old: 7 (Test & QA) -> 4 (Test/Troubleshoot)
// Old: 8 (Deploy) -> 5 (Deploy)
// Old: 9 (Docs) -> 6 (Complete)
// Old: 10 (Optimize) -> 6 (Complete)
const mapOldLaneToNew = (oldLaneNumber: number): number => {
  if (oldLaneNumber <= 4) return 0;  // Vision/Planning
  if (oldLaneNumber === 5) return 1; // Frontend Build
  if (oldLaneNumber === 6) return 3; // Workflow Build (backend)
  if (oldLaneNumber === 7) return 4; // Test/Troubleshoot
  if (oldLaneNumber === 8) return 5; // Deploy
  if (oldLaneNumber >= 9) return 6;  // Complete
  return oldLaneNumber;
};

const defaultLanes: Lane[] = [
  {
    id: 'lane-0',
    name: 'Vision/Planning',
    description: 'Project vision, strategy, PRD, MVP, architecture and planning',
    position: 0,
    color: '#3B82F6',
    wipLimit: 10,
    agentTypes: ['ceo_copilot', 'strategy', 'storyboard_ux', 'prd', 'mvp_scope', 'architect', 'planner', 'research'],
    cards: []
  },
  {
    id: 'lane-1',
    name: 'Frontend Build',
    description: 'Frontend UI development and components',
    position: 1,
    color: '#10B981',
    wipLimit: 10,
    agentTypes: ['dev_frontend'],
    cards: []
  },
  {
    id: 'lane-2',
    name: 'DB Build',
    description: 'Database schema, models, and data layer',
    position: 2,
    color: '#8B5CF6',
    wipLimit: 10,
    agentTypes: ['dev_backend'],
    cards: []
  },
  {
    id: 'lane-3',
    name: 'Workflow Build',
    description: 'Backend workflows, APIs, and infrastructure',
    position: 3,
    color: '#F59E0B',
    wipLimit: 10,
    agentTypes: ['dev_backend', 'devops'],
    cards: []
  },
  {
    id: 'lane-4',
    name: 'Test/Troubleshoot',
    description: 'Testing, QA, debugging, and troubleshooting',
    position: 4,
    color: '#EF4444',
    wipLimit: 10,
    agentTypes: ['qa', 'troubleshooter'],
    cards: []
  },
  {
    id: 'lane-5',
    name: 'Deploy',
    description: 'Production deployment and release management',
    position: 5,
    color: '#06B6D4',
    wipLimit: 5,
    agentTypes: ['devops'],
    cards: []
  },
  {
    id: 'lane-6',
    name: 'Complete',
    description: 'Completed items, documentation, and optimization',
    position: 6,
    color: '#84CC16',
    wipLimit: 0,
    agentTypes: ['docs', 'refactor'],
    cards: []
  }
];

export default function KanbanBoard() {
  const { currentProjectId } = useWorkspaceStore();
  const [lanes, setLanes] = useState<Lane[]>(defaultLanes);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<KanbanCardType | null>(null);
  const [selectedCard, setSelectedCard] = useState<KanbanCardType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCardCreateModal, setShowCardCreateModal] = useState(false);
  const [selectedLaneForCreate, setSelectedLaneForCreate] = useState<Lane | null>(null);
  const [showLaneSettingsModal, setShowLaneSettingsModal] = useState(false);
  const [selectedLaneForSettings, setSelectedLaneForSettings] = useState<Lane | null>(null);
  const [agentRunning, setAgentRunning] = useState<string | null>(null);
  const [agentLogs, setAgentLogs] = useState<Record<string, { agentName: string; status: string; logs: string[] }[]>>({});
  const [batchRunProgress, setBatchRunProgress] = useState<{ running: number; total: number } | null>(null);
  const { subscribe, subscribeTo } = useWebSocket();
  const { openCard, closeCard } = useFloatingCardsStore();

  // Compute card numbers based on creation order (oldest = #1)
  const cardNumbers = useMemo(() => {
    const allCards = lanes.flatMap(lane => lane.cards);
    const sortedByCreation = [...allCards].sort(
      (a, b) => new Date(a.dates?.created || 0).getTime() - new Date(b.dates?.created || 0).getTime()
    );
    return new Map(sortedByCreation.map((card, index) => [card.id, index + 1]));
  }, [lanes]);

  // Agent run mutation
  const runAgentMutation = useMutation({
    mutationFn: async ({ cardId, agentName }: { cardId: string; agentName: string }) => {
      return api.agents.run({ cardId, agentName });
    },
    onMutate: ({ cardId }) => {
      setAgentRunning(cardId);
    },
    onSuccess: (_data, { cardId, agentName }) => {
      // Update card with agent status
      setLanes(prev => prev.map(lane => ({
        ...lane,
        cards: lane.cards.map(card =>
          card.id === cardId ? {
            ...card,
            agentStatus: [
              ...(card.agentStatus || []),
              {
                agentName,
                status: 'running' as const,
                lastUpdate: new Date().toISOString(),
              }
            ]
          } : card
        )
      })));
    },
    onError: (error) => {
      console.error('Failed to run agent:', error);
    },
    onSettled: () => {
      setAgentRunning(null);
    },
  });

  // Card create mutation
  const createCardMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; type: string; laneId: string; priority?: string }) => {
      if (!currentProjectId || !boardId) throw new Error('No project or board selected');
      return api.cards.create({
        ...data,
        projectId: currentProjectId,
        boardId,
      });
    },
    onSuccess: (newCard, variables) => {
      setLanes(prev => prev.map(lane =>
        lane.id === variables.laneId
          ? { ...lane, cards: [...lane.cards, newCard] }
          : lane
      ));
      setShowCardCreateModal(false);
      setSelectedLaneForCreate(null);
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (currentProjectId) {
      loadBoard();
      
      const unsubscribers = [
        subscribe('card-updated', (data) => {
          setLanes(prev => prev.map(lane => ({
            ...lane,
            cards: lane.cards.map(card => 
              card.id === data.card.id ? { ...card, ...data.card } : card
            )
          })));
        }),
        
        subscribe('card-moved', (data) => {
          setLanes(prev => {
            const newLanes = [...prev];
            const sourceLane = newLanes.find(l => l.id === data.sourceLaneId);
            const targetLane = newLanes.find(l => l.id === data.targetLaneId);
            
            if (sourceLane && targetLane) {
              sourceLane.cards = sourceLane.cards.filter(c => c.id !== data.cardId);
              targetLane.cards.splice(data.position, 0, data.card);
            }
            
            return newLanes;
          });
        }),
        
        subscribe('agent-status-updated', (data) => {
          setLanes(prev => prev.map(lane => ({
            ...lane,
            cards: lane.cards.map(card =>
              card.id === data.cardId
                ? { ...card, agentStatus: data.agentStatus }
                : card
            )
          })));
        }),

        // Subscribe to agent log events
        subscribe('agent-log', (data) => {
          const { runId, payload } = data;
          if (!payload) return;

          // Find the card associated with this run
          const cardId = payload.cardId || runId;

          setAgentLogs(prev => {
            const cardLogs = prev[cardId] || [];
            const existingLogIndex = cardLogs.findIndex(l => l.agentName === payload.agentName);

            if (existingLogIndex >= 0) {
              // Update existing agent log
              const updatedLogs = [...cardLogs];
              updatedLogs[existingLogIndex] = {
                ...updatedLogs[existingLogIndex],
                status: payload.data?.status || updatedLogs[existingLogIndex].status,
                logs: [...updatedLogs[existingLogIndex].logs, payload.data?.message || JSON.stringify(payload.data)],
              };
              return { ...prev, [cardId]: updatedLogs };
            } else {
              // Add new agent log entry
              return {
                ...prev,
                [cardId]: [
                  ...cardLogs,
                  {
                    agentName: payload.agentName || 'unknown',
                    status: payload.data?.status || 'running',
                    logs: [payload.data?.message || JSON.stringify(payload.data)],
                  },
                ],
              };
            }
          });
        }),

        // Subscribe to run-started events
        subscribe('run-started', (data) => {
          const { cardId, runId, payload } = data;

          // Initialize empty log entry for the card
          setAgentLogs(prev => ({
            ...prev,
            [cardId]: [
              ...(prev[cardId] || []),
              {
                agentName: payload?.agentName || 'agent',
                status: 'running',
                logs: [`Agent run started: ${runId}`],
              },
            ],
          }));

          // Subscribe to the run's log stream
          subscribeTo({ runId });
        })
      ];

      return () => {
        unsubscribers.forEach(unsubscriber => unsubscriber());
      };
    } else {
      setIsLoading(false);
    }
  }, [currentProjectId, subscribe, subscribeTo]);

  const loadBoard = async () => {
    if (!currentProjectId) return;

    try {
      setIsLoading(true);
      // First get the project to find the board ID
      const project = await api.projects.get(currentProjectId);
      const projectBoardId = project.boards?.[0]?.id;

      if (projectBoardId) {
        setBoardId(projectBoardId);
        const response = await api.boards.get(projectBoardId);
        if (response.lanes && response.lanes.length > 0) {
          // Build a map of laneNumber -> real API lane for quick lookup
          const apiLanesByNumber = new Map<number, any>();
          response.lanes.forEach((apiLane: any) => {
            const laneNumber = apiLane.laneNumber ?? apiLane.position ?? 0;
            const mappedNumber = mapOldLaneToNew(laneNumber);
            // Store the first lane for each mapped number (prefer it as the real ID)
            if (!apiLanesByNumber.has(mappedNumber)) {
              apiLanesByNumber.set(mappedNumber, apiLane);
            }
          });

          // Create lanes using real API IDs but with display properties from defaultLanes
          const newLanes = defaultLanes.map(defaultLane => {
            const apiLane = apiLanesByNumber.get(defaultLane.position);
            return {
              ...defaultLane,
              // Use real API UUID if available, otherwise fall back to default
              id: apiLane?.id || defaultLane.id,
              cards: [] as KanbanCardType[]
            };
          });

          // Collect all cards from API response and map them to new lanes
          response.lanes.forEach((apiLane: any) => {
            const oldLaneNumber = apiLane.laneNumber ?? apiLane.position ?? 0;
            const newLaneNumber = mapOldLaneToNew(oldLaneNumber);
            const targetLane = newLanes.find(l => l.position === newLaneNumber);

            if (targetLane && apiLane.cards) {
              const mappedCards = apiLane.cards.map((card: any) => ({
                ...card,
                laneId: targetLane.id,
                assignedAgents: card.assignedAgents || (card.assignedAgent ? [card.assignedAgent] : []),
                dates: card.dates || {
                  created: card.createdAt || new Date().toISOString(),
                  updated: card.updatedAt || new Date().toISOString(),
                  dueDate: card.dueDate || null,
                  completedDate: card.completedAt || null,
                },
              }));
              targetLane.cards.push(...mappedCards);
            }
          });

          setLanes(newLanes);
        } else {
          setLanes(defaultLanes);
        }
      } else {
        setLanes(defaultLanes);
      }
    } catch (error) {
      console.error('Failed to load board:', error);
      setLanes(defaultLanes);
    } finally {
      setIsLoading(false);
    }
  };


  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = findCard(active.id as string);
    setActiveCard(card);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !active) {
      setActiveCard(null);
      return;
    }

    const cardId = active.id as string;
    const overId = over.id as string;
    
    const card = findCard(cardId);
    if (!card) return;

    const sourceLane = lanes.find(lane => lane.cards.some(c => c.id === cardId));
    const targetLane = lanes.find(lane => lane.id === overId || lane.cards.some(c => c.id === overId));
    
    if (!sourceLane || !targetLane) return;

    if (sourceLane.id !== targetLane.id) {
      const position = targetLane.cards.length;
      
      try {
        await api.cards.move(cardId, targetLane.id, position);
        
        setLanes(prev => {
          const newLanes = [...prev];
          const sourceIndex = newLanes.findIndex(l => l.id === sourceLane.id);
          const targetIndex = newLanes.findIndex(l => l.id === targetLane.id);
          
          newLanes[sourceIndex].cards = newLanes[sourceIndex].cards.filter(c => c.id !== cardId);
          newLanes[targetIndex].cards.push({ ...card, laneId: targetLane.id, position });
          
          return newLanes;
        });
      } catch (error) {
        console.error('Failed to move card:', error);
      }
    }
    
    setActiveCard(null);
  };

  const findCard = (cardId: string): KanbanCardType | null => {
    for (const lane of lanes) {
      const card = lane.cards.find(c => c.id === cardId);
      if (card) return card;
    }
    return null;
  };

  const handleCardClick = useCallback((card: KanbanCardType) => {
    // Open card in floating window instead of modal
    openCard(card);
    // Also subscribe to this card's logs
    subscribeTo({ cardId: card.id });
  }, [openCard, subscribeTo]);

  // Handler for running agents from floating card windows
  const handleFloatingRunAgent = useCallback((cardId: string, agentName: string) => {
    runAgentMutation.mutate({ cardId, agentName });
    // Subscribe to the card's log stream
    subscribeTo({ cardId });
  }, [runAgentMutation, subscribeTo]);

  // Handler for reviewing card context with CoPilot
  const handleReviewContext = useCallback(async (cardId: string) => {
    try {
      const response = await api.copilot.reviewContext({
        cardId,
        prompt: 'Review the execution context for this card and provide a summary of what was done, any issues encountered, and suggestions for next steps.',
      });

      // Update agent logs with the review response
      setAgentLogs(prev => ({
        ...prev,
        [cardId]: [
          ...(prev[cardId] || []),
          {
            agentName: 'ceo_copilot',
            status: 'success',
            logs: [
              '--- CoPilot Review ---',
              response.review || 'No review available',
              `Context size: ${response.contextSize || 0} bytes`,
            ],
          },
        ],
      }));
    } catch (error) {
      console.error('Failed to review context:', error);
      setAgentLogs(prev => ({
        ...prev,
        [cardId]: [
          ...(prev[cardId] || []),
          {
            agentName: 'ceo_copilot',
            status: 'error',
            logs: [`Error reviewing context: ${error instanceof Error ? error.message : 'Unknown error'}`],
          },
        ],
      }));
    }
  }, []);

  // Handler for deleting cards from floating windows
  const handleDeleteCard = useCallback(async (cardId: string) => {
    try {
      await api.cards.delete(cardId);
      // Close the floating window
      closeCard(cardId);
      // Remove from lanes
      setLanes(prev => prev.map(lane => ({
        ...lane,
        cards: lane.cards.filter(card => card.id !== cardId),
      })));
    } catch (error) {
      console.error('Failed to delete card:', error);
    }
  }, [closeCard]);

  // Handler for approving cards from floating windows
  const handleApprove = useCallback(async (cardId: string, data: { notes?: string; advance?: boolean }) => {
    try {
      const result = await api.cards.approve(cardId, data);

      // Update local state
      if (result.advanced && result.nextLane) {
        // Move card to next lane
        setLanes(prev => {
          const sourceCard = prev.flatMap(l => l.cards).find(c => c.id === cardId);
          if (!sourceCard) return prev;

          const sourceLaneId = sourceCard.laneId;
          const destLaneId = `lane-${result.nextLane.position}`;

          return prev.map(lane => {
            if (lane.id === sourceLaneId) {
              // Remove from source lane
              return { ...lane, cards: lane.cards.filter(c => c.id !== cardId) };
            }
            if (lane.id === destLaneId) {
              // Add to destination lane with updated status
              const updatedCard = {
                ...sourceCard,
                laneId: destLaneId,
                reviewStatus: null,
                approvedAt: new Date().toISOString(),
              };
              return { ...lane, cards: [...lane.cards, updatedCard] };
            }
            return lane;
          });
        });
      } else {
        // Just update card status in current lane
        setLanes(prev => prev.map(lane => ({
          ...lane,
          cards: lane.cards.map(card =>
            card.id === cardId
              ? { ...card, reviewStatus: 'approved', approvedAt: new Date().toISOString() }
              : card
          ),
        })));
      }

      // Close floating window
      closeCard(cardId);
    } catch (error) {
      console.error('Failed to approve card:', error);
    }
  }, [closeCard]);

  // Handler for rejecting cards from floating windows
  const handleReject = useCallback(async (cardId: string, data: { notes?: string; returnToPrevious?: boolean }) => {
    try {
      const result = await api.cards.reject(cardId, data);

      // Update local state
      if (result.returnedToPrevious && result.previousLane) {
        // Move card back to previous lane
        setLanes(prev => {
          const sourceCard = prev.flatMap(l => l.cards).find(c => c.id === cardId);
          if (!sourceCard) return prev;

          const sourceLaneId = sourceCard.laneId;
          const destLaneId = `lane-${result.previousLane.position}`;

          return prev.map(lane => {
            if (lane.id === sourceLaneId) {
              return { ...lane, cards: lane.cards.filter(c => c.id !== cardId) };
            }
            if (lane.id === destLaneId) {
              const updatedCard = {
                ...sourceCard,
                laneId: destLaneId,
                reviewStatus: 'needs_revision',
                rejectedAt: new Date().toISOString(),
              };
              return { ...lane, cards: [...lane.cards, updatedCard] };
            }
            return lane;
          });
        });
      } else {
        // Just update card status
        setLanes(prev => prev.map(lane => ({
          ...lane,
          cards: lane.cards.map(card =>
            card.id === cardId
              ? { ...card, reviewStatus: 'rejected', rejectedAt: new Date().toISOString() }
              : card
          ),
        })));
      }

      closeCard(cardId);
    } catch (error) {
      console.error('Failed to reject card:', error);
    }
  }, [closeCard]);

  // Handler for marking cards as complete from floating windows
  const handleMarkComplete = useCallback(async (cardId: string) => {
    try {
      await api.cards.complete(cardId);

      // Move card to completed lane (lane 6 in the new 7-lane system)
      setLanes(prev => {
        const sourceCard = prev.flatMap(l => l.cards).find(c => c.id === cardId);
        if (!sourceCard) return prev;

        const sourceLaneId = sourceCard.laneId;
        const destLaneId = 'lane-6'; // Complete lane

        return prev.map(lane => {
          if (lane.id === sourceLaneId) {
            return { ...lane, cards: lane.cards.filter(c => c.id !== cardId) };
          }
          if (lane.id === destLaneId) {
            const updatedCard: KanbanCardType = {
              ...sourceCard,
              laneId: destLaneId,
              status: 'Done' as const,
              dates: {
                ...sourceCard.dates,
                completedDate: new Date().toISOString(),
              },
            };
            return { ...lane, cards: [...lane.cards, updatedCard] };
          }
          return lane;
        });
      });

      closeCard(cardId);
    } catch (error) {
      console.error('Failed to complete card:', error);
    }
  }, [closeCard]);

  const handleCloseModal = useCallback(() => {
    setSelectedCard(null);
  }, []);

  const handleRunAgent = useCallback((agentName: string) => {
    if (!selectedCard) return;
    runAgentMutation.mutate({ cardId: selectedCard.id, agentName });
  }, [selectedCard, runAgentMutation]);

  // Handler for running all assigned agents on a single card (from card button)
  const handleRunCard = useCallback(async (cardId: string) => {
    const card = lanes.flatMap(l => l.cards).find(c => c.id === cardId);
    if (!card) return;

    // Get all assigned agents - check both assignedAgents array and legacy assignedAgent field
    const agents = card.assignedAgents?.length > 0
      ? card.assignedAgents
      : ((card as any).assignedAgent ? [(card as any).assignedAgent] : []);

    if (agents.length === 0) {
      console.warn('No agents assigned to card:', cardId);
      return;
    }

    // Subscribe to card logs
    subscribeTo({ cardId });

    // Run each assigned agent sequentially
    for (const agentName of agents) {
      await runAgentMutation.mutateAsync({ cardId, agentName });
    }
  }, [lanes, runAgentMutation, subscribeTo]);

  // Handler for "Run All" button - executes all cards in creation order
  const handleRunAll = useCallback(async () => {
    const allCards = lanes.flatMap(lane => lane.cards);
    const sortedCards = [...allCards].sort(
      (a, b) => new Date(a.dates?.created || 0).getTime() - new Date(b.dates?.created || 0).getTime()
    );

    // Filter to only cards with assigned agents
    const cardsWithAgents = sortedCards.filter(card => {
      const agents = card.assignedAgents?.length > 0
        ? card.assignedAgents
        : ((card as any).assignedAgent ? [(card as any).assignedAgent] : []);
      return agents.length > 0;
    });

    if (cardsWithAgents.length === 0) {
      console.warn('No cards with assigned agents to run');
      return;
    }

    setBatchRunProgress({ running: 0, total: cardsWithAgents.length });

    try {
      // For now, run cards sequentially. TODO: Use batch API for parallel execution
      for (let i = 0; i < cardsWithAgents.length; i++) {
        const card = cardsWithAgents[i];
        setBatchRunProgress({ running: i + 1, total: cardsWithAgents.length });

        const agents = card.assignedAgents?.length > 0
          ? card.assignedAgents
          : ((card as any).assignedAgent ? [(card as any).assignedAgent] : []);

        subscribeTo({ cardId: card.id });

        for (const agentName of agents) {
          await runAgentMutation.mutateAsync({ cardId: card.id, agentName });
        }
      }
    } catch (error) {
      console.error('Batch run failed:', error);
    } finally {
      setBatchRunProgress(null);
    }
  }, [lanes, runAgentMutation, subscribeTo]);

  const handleAddCard = useCallback((lane: Lane) => {
    setSelectedLaneForCreate(lane);
    setShowCardCreateModal(true);
  }, []);

  const handleLaneSettings = useCallback((lane: Lane) => {
    setSelectedLaneForSettings(lane);
    setShowLaneSettingsModal(true);
  }, []);

  const handleCreateCard = useCallback((data: { title: string; description: string; type: string; priority?: string }) => {
    if (!selectedLaneForCreate) return;
    createCardMutation.mutate({
      ...data,
      laneId: selectedLaneForCreate.id,
    });
  }, [selectedLaneForCreate, createCardMutation]);

  const handleUpdateLane = useCallback((updates: Partial<Lane>) => {
    if (!selectedLaneForSettings) return;
    // Update lane locally (API call would go here if backend supports it)
    setLanes(prev => prev.map(lane =>
      lane.id === selectedLaneForSettings.id
        ? { ...lane, ...updates }
        : lane
    ));
    setShowLaneSettingsModal(false);
    setSelectedLaneForSettings(null);
  }, [selectedLaneForSettings]);

  const handleMoveCard = useCallback(async (targetLaneId: string) => {
    if (!selectedCard) return;
    
    try {
      await api.cards.move(selectedCard.id, targetLaneId, 0);
      
      setLanes(prev => {
        const newLanes = [...prev];
        const sourceIndex = newLanes.findIndex(l => l.id === selectedCard.laneId);
        const targetIndex = newLanes.findIndex(l => l.id === targetLaneId);
        
        if (sourceIndex !== -1 && targetIndex !== -1) {
          newLanes[sourceIndex].cards = newLanes[sourceIndex].cards.filter(c => c.id !== selectedCard.id);
          newLanes[targetIndex].cards.push({ ...selectedCard, laneId: targetLaneId, position: 0 });
        }
        
        return newLanes;
      });
      
      setSelectedCard(prev => prev ? { ...prev, laneId: targetLaneId } : null);
    } catch (error) {
      console.error('Failed to move card:', error);
    }
  }, [selectedCard]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-slate-600">Loading board...</span>
        </div>
      </div>
    );
  }

  // Show a friendly message when no project is selected
  if (!currentProjectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50 p-8">
        <div className="text-center max-w-md">
          <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">No Project Selected</h2>
          <p className="text-slate-600 mb-6">
            Select a project from the dropdown in the header to view its Kanban board, or create a new project to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <BoardHeader
          onRunAll={handleRunAll}
          runAllProgress={batchRunProgress}
        />
      
      <div className="flex-1 overflow-auto">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 p-4 min-w-max">
            <SortableContext items={lanes.map(l => l.id)} strategy={horizontalListSortingStrategy}>
              {lanes.map((lane) => (
                <KanbanLane
                  key={lane.id}
                  lane={lane}
                  onCardClick={handleCardClick}
                  onAddCard={() => handleAddCard(lane)}
                  onLaneSettings={() => handleLaneSettings(lane)}
                  cardNumbers={cardNumbers}
                  onRunCard={handleRunCard}
                />
              ))}
            </SortableContext>

            {/* Completed Cards Section */}
            <CompletedSection
              cards={lanes.flatMap(lane =>
                lane.cards.filter(card => card.status === 'Done')
              )}
              onCardClick={handleCardClick}
            />
          </div>

          <DragOverlay>
            {activeCard ? (
              <KanbanCard
                card={activeCard}
                onClick={() => {}}
                isDragging={true}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          isOpen={!!selectedCard}
          onClose={handleCloseModal}
          onRunAgent={handleRunAgent}
          onMoveCard={handleMoveCard}
          isAgentRunning={agentRunning === selectedCard.id}
        />
      )}

      {showCardCreateModal && selectedLaneForCreate && (
        <CardCreateModal
          isOpen={showCardCreateModal}
          lane={selectedLaneForCreate}
          onClose={() => {
            setShowCardCreateModal(false);
            setSelectedLaneForCreate(null);
          }}
          onSubmit={handleCreateCard}
          isSubmitting={createCardMutation.isPending}
        />
      )}

      {showLaneSettingsModal && selectedLaneForSettings && (
        <LaneSettingsModal
          isOpen={showLaneSettingsModal}
          lane={selectedLaneForSettings}
          onClose={() => {
            setShowLaneSettingsModal(false);
            setSelectedLaneForSettings(null);
          }}
          onSave={handleUpdateLane}
        />
      )}

      {/* Floating Card Context Windows */}
      <FloatingWindowsLayer
        onRunAgent={handleFloatingRunAgent}
        onReviewContext={handleReviewContext}
        onApprove={handleApprove}
        onReject={handleReject}
        onMarkComplete={handleMarkComplete}
        onDelete={handleDeleteCard}
        agentLogs={agentLogs}
      />
    </div>
  );
}