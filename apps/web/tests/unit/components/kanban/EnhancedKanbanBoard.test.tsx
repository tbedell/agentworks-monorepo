import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DndContext } from '@dnd-kit/core';
import { EnhancedKanbanBoard } from '../../../../src/components/kanban/EnhancedKanbanBoard';
import { mockApiSuccess, mockApiError, mockAuthenticatedUser } from '../../../setup/frontend';

// Mock the API module
jest.mock('../../../../src/lib/api.ts');

const mockBoard = {
  id: 'board-123',
  name: 'Test Board',
  projectId: 'project-123',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  project: {
    id: 'project-123',
    name: 'Test Project',
    workspaceId: 'workspace-123',
  },
  lanes: [
    {
      id: 'lane-0',
      laneNumber: 0,
      name: 'Blueprint',
      boardId: 'board-123',
      wipLimit: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'lane-1',
      laneNumber: 1,
      name: 'PRD',
      boardId: 'board-123',
      wipLimit: 3,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'lane-2',
      laneNumber: 2,
      name: 'Development',
      boardId: 'board-123',
      wipLimit: 5,
      createdAt: new Date().toISOString(),
    },
  ],
  cards: [
    {
      id: 'card-1',
      title: 'Create user authentication system',
      description: 'Implement JWT-based authentication',
      type: 'Epic',
      priority: 'High',
      status: 'Draft',
      laneId: 'lane-0',
      boardId: 'board-123',
      assigneeId: null,
      position: 0,
      parentId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignee: null,
      parent: null,
      children: [],
      agentRuns: [],
    },
    {
      id: 'card-2',
      title: 'Design API endpoints',
      description: 'Define RESTful API structure',
      type: 'Task',
      priority: 'Medium',
      status: 'In Progress',
      laneId: 'lane-1',
      boardId: 'board-123',
      assigneeId: 'user-123',
      position: 0,
      parentId: 'card-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignee: {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      },
      parent: null,
      children: [],
      agentRuns: [],
    },
  ],
};

const mockAgents = [
  {
    id: 'agent-1',
    name: 'ceo-copilot',
    displayName: 'CEO CoPilot',
    description: 'Strategic planning assistant',
    allowedLanes: [0],
    defaultProvider: 'openai',
    defaultModel: 'gpt-4',
    systemPrompt: 'You are a strategic planning assistant.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'agent-2',
    name: 'prd-agent',
    displayName: 'PRD Agent',
    description: 'Product requirements assistant',
    allowedLanes: [1],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-3',
    systemPrompt: 'You are a product requirements assistant.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DndContext>
    {children}
  </DndContext>
);

describe('EnhancedKanbanBoard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticatedUser();
  });

  it('should render board with lanes and cards', async () => {
    mockApiSuccess(mockBoard);
    mockApiSuccess(mockAgents);

    render(
      <TestWrapper>
        <EnhancedKanbanBoard boardId="board-123" />
      </TestWrapper>
    );

    // Wait for board to load
    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    // Check lanes are rendered
    expect(screen.getByText('Blueprint')).toBeInTheDocument();
    expect(screen.getByText('PRD')).toBeInTheDocument();
    expect(screen.getByText('Development')).toBeInTheDocument();

    // Check cards are rendered
    expect(screen.getByText('Create user authentication system')).toBeInTheDocument();
    expect(screen.getByText('Design API endpoints')).toBeInTheDocument();

    // Check card details
    expect(screen.getByText('Epic')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Task')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('should display WIP limits for lanes', async () => {
    mockApiSuccess(mockBoard);
    mockApiSuccess(mockAgents);

    render(
      <TestWrapper>
        <EnhancedKanbanBoard boardId="board-123" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    // Blueprint lane has no WIP limit
    const blueprintLane = screen.getByText('Blueprint').closest('[data-testid*="lane"]');
    expect(blueprintLane).not.toHaveTextContent('WIP: ');

    // PRD lane has WIP limit of 3
    const prdLane = screen.getByText('PRD').closest('[data-testid*="lane"]');
    expect(prdLane).toHaveTextContent('1/3'); // 1 card out of 3 limit

    // Development lane has WIP limit of 5
    const devLane = screen.getByText('Development').closest('[data-testid*="lane"]');
    expect(devLane).toHaveTextContent('0/5'); // 0 cards out of 5 limit
  });

  it('should show add card button for each lane', async () => {
    mockApiSuccess(mockBoard);
    mockApiSuccess(mockAgents);

    render(
      <TestWrapper>
        <EnhancedKanbanBoard boardId="board-123" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    const addButtons = screen.getAllByText(/Add/i);
    expect(addButtons.length).toBeGreaterThan(0);
  });

  it('should open card creation modal when add button is clicked', async () => {
    mockApiSuccess(mockBoard);
    mockApiSuccess(mockAgents);

    render(
      <TestWrapper>
        <EnhancedKanbanBoard boardId="board-123" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    // Click add button in first lane
    const addButton = screen.getAllByTestId(/add-card-button/i)[0];
    fireEvent.click(addButton);

    // Check modal is opened
    await waitFor(() => {
      expect(screen.getByTestId('card-form')).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
  });

  it('should create a new card', async () => {
    mockApiSuccess(mockBoard);
    mockApiSuccess(mockAgents);

    const newCard = {
      id: 'card-3',
      title: 'New Test Card',
      description: 'A new card for testing',
      type: 'Task',
      priority: 'Medium',
      status: 'Draft',
      laneId: 'lane-0',
      boardId: 'board-123',
      assigneeId: null,
      position: 1,
      parentId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignee: null,
      parent: null,
      children: [],
      agentRuns: [],
    };

    render(
      <TestWrapper>
        <EnhancedKanbanBoard boardId="board-123" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    // Open card creation modal
    const addButton = screen.getAllByTestId(/add-card-button/i)[0];
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('card-form')).toBeInTheDocument();
    });

    // Fill out form
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'New Test Card' },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'A new card for testing' },
    });

    // Mock successful card creation
    mockApiSuccess(newCard);

    // Submit form
    fireEvent.click(screen.getByTestId('create-card-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('card-created')).toBeInTheDocument();
    });
  });

  it('should show agent execution buttons for appropriate lanes', async () => {
    mockApiSuccess(mockBoard);
    mockApiSuccess(mockAgents);

    render(
      <TestWrapper>
        <EnhancedKanbanBoard boardId="board-123" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    // Click on a card in lane 0 (Blueprint)
    const blueprintCard = screen.getByText('Create user authentication system');
    fireEvent.click(blueprintCard);

    await waitFor(() => {
      expect(screen.getByTestId('card-details')).toBeInTheDocument();
    });

    // Should show CEO CoPilot option for lane 0
    expect(screen.getByText('CEO CoPilot')).toBeInTheDocument();
  });

  it('should execute agent on card', async () => {
    mockApiSuccess(mockBoard);
    mockApiSuccess(mockAgents);

    const mockRun = {
      id: 'run-123',
      cardId: 'card-1',
      agentId: 'agent-1',
      status: 'pending',
      provider: 'openai',
      model: 'gpt-4',
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      price: 0,
      startedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };

    render(
      <TestWrapper>
        <EnhancedKanbanBoard boardId="board-123" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    // Click on a card
    const card = screen.getByText('Create user authentication system');
    fireEvent.click(card);

    await waitFor(() => {
      expect(screen.getByTestId('card-details')).toBeInTheDocument();
    });

    // Click execute agent button
    fireEvent.click(screen.getByTestId('execute-agent-button'));

    await waitFor(() => {
      expect(screen.getByTestId('agent-selector')).toBeInTheDocument();
    });

    // Select agent
    fireEvent.change(screen.getByTestId('agent-select'), {
      target: { value: 'agent-1' },
    });

    // Mock successful execution start
    mockApiSuccess(mockRun);

    // Submit execution
    fireEvent.click(screen.getByTestId('execute-agent-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('agent-execution-started')).toBeInTheDocument();
    });
  });

  it('should handle card drag and drop between lanes', async () => {
    mockApiSuccess(mockBoard);
    mockApiSuccess(mockAgents);

    render(
      <TestWrapper>
        <EnhancedKanbanBoard boardId="board-123" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    const card = screen.getByTestId('card-card-1');
    const targetLane = screen.getByTestId('lane-1');

    // Mock successful card update
    mockApiSuccess({
      ...mockBoard.cards[0],
      laneId: 'lane-1',
    });

    // Simulate drag and drop
    fireEvent.dragStart(card);
    fireEvent.dragEnter(targetLane);
    fireEvent.dragOver(targetLane);
    fireEvent.drop(targetLane);

    await waitFor(() => {
      // Card should be moved to new lane
      expect(targetLane).toContainElement(card);
    });
  });

  it('should prevent dropping card in lane that exceeds WIP limit', async () => {
    // Create a board with a lane at its WIP limit
    const fullBoard = {
      ...mockBoard,
      cards: [
        ...mockBoard.cards,
        {
          id: 'card-3',
          title: 'Card 3',
          description: 'Third card',
          type: 'Task',
          priority: 'Low',
          status: 'In Progress',
          laneId: 'lane-1',
          boardId: 'board-123',
          assigneeId: null,
          position: 1,
          parentId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          assignee: null,
          parent: null,
          children: [],
          agentRuns: [],
        },
        {
          id: 'card-4',
          title: 'Card 4',
          description: 'Fourth card',
          type: 'Task',
          priority: 'Low',
          status: 'In Progress',
          laneId: 'lane-1',
          boardId: 'board-123',
          assigneeId: null,
          position: 2,
          parentId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          assignee: null,
          parent: null,
          children: [],
          agentRuns: [],
        },
      ],
    };

    mockApiSuccess(fullBoard);
    mockApiSuccess(mockAgents);

    render(
      <TestWrapper>
        <EnhancedKanbanBoard boardId="board-123" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    // PRD lane should show 3/3 (at limit)
    const prdLane = screen.getByText('PRD').closest('[data-testid*="lane"]');
    expect(prdLane).toHaveTextContent('3/3');

    // Try to drag a card from Blueprint to PRD (should be prevented)
    const card = screen.getByTestId('card-card-1');
    const targetLane = screen.getByTestId('lane-1');

    fireEvent.dragStart(card);
    fireEvent.dragEnter(targetLane);

    // Should show WIP limit warning
    await waitFor(() => {
      expect(screen.getByText(/WIP limit exceeded/i)).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    mockApiError(500, 'Internal Server Error');

    render(
      <TestWrapper>
        <EnhancedKanbanBoard boardId="board-123" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Error loading board/i)).toBeInTheDocument();
    });
  });

  it('should show loading state initially', () => {
    // Don't mock API response to test loading state
    render(
      <TestWrapper>
        <EnhancedKanbanBoard boardId="board-123" />
      </TestWrapper>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should show empty state when board has no cards', async () => {
    const emptyBoard = {
      ...mockBoard,
      cards: [],
    };

    mockApiSuccess(emptyBoard);
    mockApiSuccess(mockAgents);

    render(
      <TestWrapper>
        <EnhancedKanbanBoard boardId="board-123" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText(/No cards yet/i)).toBeInTheDocument();
  });

  it('should filter cards by search term', async () => {
    mockApiSuccess(mockBoard);
    mockApiSuccess(mockAgents);

    render(
      <TestWrapper>
        <EnhancedKanbanBoard boardId="board-123" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    // Both cards should be visible initially
    expect(screen.getByText('Create user authentication system')).toBeInTheDocument();
    expect(screen.getByText('Design API endpoints')).toBeInTheDocument();

    // Search for 'authentication'
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'authentication' } });

    await waitFor(() => {
      // Only authentication card should be visible
      expect(screen.getByText('Create user authentication system')).toBeInTheDocument();
      expect(screen.queryByText('Design API endpoints')).not.toBeInTheDocument();
    });
  });

  it('should refresh board data periodically', async () => {
    mockApiSuccess(mockBoard);
    mockApiSuccess(mockAgents);

    jest.useFakeTimers();

    render(
      <TestWrapper>
        <EnhancedKanbanBoard boardId="board-123" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Board')).toBeInTheDocument();
    });

    // Clear mock call count
    jest.clearAllMocks();
    mockApiSuccess(mockBoard);

    // Fast-forward 30 seconds (refresh interval)
    jest.advanceTimersByTime(30000);

    await waitFor(() => {
      // Should have made another API call to refresh data
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('boards/board-123'),
        expect.any(Object)
      );
    });

    jest.useRealTimers();
  });
});