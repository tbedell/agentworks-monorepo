import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { EnhancedTerminal } from '../../../../src/components/terminal/EnhancedTerminal';
import { mockApiSuccess, mockAuthenticatedUser } from '../../../setup/frontend';

// Mock WebSocket
const mockWebSocket = {
  readyState: WebSocket.OPEN,
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock WebSocket constructor
(global as any).WebSocket = jest.fn(() => mockWebSocket);

describe('EnhancedTerminal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticatedUser();
    mockWebSocket.readyState = WebSocket.OPEN;
  });

  it('should render terminal with initial prompt', () => {
    render(<EnhancedTerminal runId="run-123" />);

    expect(screen.getByTestId('terminal-window')).toBeInTheDocument();
    expect(screen.getByTestId('terminal-output')).toBeInTheDocument();
    expect(screen.getByTestId('terminal-input')).toBeInTheDocument();
    
    // Should show initial prompt
    expect(screen.getByText('AgentWorks Terminal')).toBeInTheDocument();
    expect(screen.getByText('Connected to agent run: run-123')).toBeInTheDocument();
  });

  it('should establish WebSocket connection on mount', () => {
    render(<EnhancedTerminal runId="run-123" />);

    expect(WebSocket).toHaveBeenCalledWith(
      expect.stringContaining('ws://'),
      expect.any(Array)
    );

    // Should register event listeners
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('open', expect.any(Function));
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('close', expect.any(Function));
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should display connection status', async () => {
    render(<EnhancedTerminal runId="run-123" />);

    // Find the 'open' event handler and call it
    const openHandler = mockWebSocket.addEventListener.mock.calls.find(
      call => call[0] === 'open'
    )?.[1];

    if (openHandler) {
      openHandler(new Event('open'));
    }

    await waitFor(() => {
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });
  });

  it('should display incoming log messages', async () => {
    render(<EnhancedTerminal runId="run-123" />);

    // Find the 'message' event handler
    const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];

    const mockLogMessage = {
      id: 'log-1',
      level: 'info',
      message: 'Agent execution started',
      timestamp: new Date().toISOString(),
      metadata: {
        agentId: 'agent-123',
      },
    };

    if (messageHandler) {
      messageHandler(new MessageEvent('message', {
        data: JSON.stringify(mockLogMessage),
      }));
    }

    await waitFor(() => {
      expect(screen.getByText('Agent execution started')).toBeInTheDocument();
      expect(screen.getByText(/info/i)).toBeInTheDocument();
    });
  });

  it('should handle different log levels with appropriate styling', async () => {
    render(<EnhancedTerminal runId="run-123" />);

    const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];

    const logLevels = [
      { level: 'error', message: 'Error occurred', className: 'error' },
      { level: 'warn', message: 'Warning message', className: 'warning' },
      { level: 'info', message: 'Info message', className: 'info' },
      { level: 'debug', message: 'Debug message', className: 'debug' },
    ];

    if (messageHandler) {
      logLevels.forEach((log, index) => {
        messageHandler(new MessageEvent('message', {
          data: JSON.stringify({
            id: `log-${index}`,
            level: log.level,
            message: log.message,
            timestamp: new Date().toISOString(),
          }),
        }));
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Error occurred')).toBeInTheDocument();
      expect(screen.getByText('Warning message')).toBeInTheDocument();
      expect(screen.getByText('Info message')).toBeInTheDocument();
      expect(screen.getByText('Debug message')).toBeInTheDocument();
    });

    // Check that error message has appropriate styling
    const errorElement = screen.getByText('Error occurred').closest('.terminal-line');
    expect(errorElement).toHaveClass('level-error');
  });

  it('should auto-scroll to bottom when new messages arrive', async () => {
    render(<EnhancedTerminal runId="run-123" />);

    const terminalOutput = screen.getByTestId('terminal-output');
    const scrollToBottomSpy = jest.spyOn(terminalOutput, 'scrollTo');

    const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];

    if (messageHandler) {
      messageHandler(new MessageEvent('message', {
        data: JSON.stringify({
          id: 'log-1',
          level: 'info',
          message: 'New message',
          timestamp: new Date().toISOString(),
        }),
      }));
    }

    await waitFor(() => {
      expect(scrollToBottomSpy).toHaveBeenCalledWith({
        top: expect.any(Number),
        behavior: 'smooth',
      });
    });
  });

  it('should allow user to pause auto-scroll', async () => {
    render(<EnhancedTerminal runId="run-123" />);

    // Click the pause auto-scroll button
    const pauseButton = screen.getByTestId('pause-autoscroll-button');
    fireEvent.click(pauseButton);

    await waitFor(() => {
      expect(screen.getByText(/Auto-scroll paused/i)).toBeInTheDocument();
    });

    const terminalOutput = screen.getByTestId('terminal-output');
    const scrollToBottomSpy = jest.spyOn(terminalOutput, 'scrollTo');

    const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];

    if (messageHandler) {
      messageHandler(new MessageEvent('message', {
        data: JSON.stringify({
          id: 'log-1',
          level: 'info',
          message: 'New message after pause',
          timestamp: new Date().toISOString(),
        }),
      }));
    }

    await waitFor(() => {
      expect(screen.getByText('New message after pause')).toBeInTheDocument();
    });

    // Should not auto-scroll when paused
    expect(scrollToBottomSpy).not.toHaveBeenCalled();
  });

  it('should filter logs by level', async () => {
    render(<EnhancedTerminal runId="run-123" />);

    const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];

    // Send messages of different levels
    const messages = [
      { level: 'error', message: 'Error message' },
      { level: 'warn', message: 'Warning message' },
      { level: 'info', message: 'Info message' },
      { level: 'debug', message: 'Debug message' },
    ];

    if (messageHandler) {
      messages.forEach((msg, index) => {
        messageHandler(new MessageEvent('message', {
          data: JSON.stringify({
            id: `log-${index}`,
            level: msg.level,
            message: msg.message,
            timestamp: new Date().toISOString(),
          }),
        }));
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.getByText('Warning message')).toBeInTheDocument();
      expect(screen.getByText('Info message')).toBeInTheDocument();
      expect(screen.getByText('Debug message')).toBeInTheDocument();
    });

    // Filter to show only errors
    const levelFilter = screen.getByTestId('level-filter');
    fireEvent.change(levelFilter, { target: { value: 'error' } });

    await waitFor(() => {
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.queryByText('Warning message')).not.toBeInTheDocument();
      expect(screen.queryByText('Info message')).not.toBeInTheDocument();
      expect(screen.queryByText('Debug message')).not.toBeInTheDocument();
    });
  });

  it('should search through log messages', async () => {
    render(<EnhancedTerminal runId="run-123" />);

    const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];

    const messages = [
      'Processing user request',
      'Executing agent logic',
      'Saving results to database',
      'Sending response to client',
    ];

    if (messageHandler) {
      messages.forEach((message, index) => {
        messageHandler(new MessageEvent('message', {
          data: JSON.stringify({
            id: `log-${index}`,
            level: 'info',
            message,
            timestamp: new Date().toISOString(),
          }),
        }));
      });
    }

    await waitFor(() => {
      messages.forEach(message => {
        expect(screen.getByText(message)).toBeInTheDocument();
      });
    });

    // Search for 'agent'
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'agent' } });

    await waitFor(() => {
      expect(screen.getByText('Executing agent logic')).toBeInTheDocument();
      expect(screen.queryByText('Processing user request')).not.toBeInTheDocument();
      expect(screen.queryByText('Saving results to database')).not.toBeInTheDocument();
      expect(screen.queryByText('Sending response to client')).not.toBeInTheDocument();
    });

    // Highlight search term
    const highlightedText = screen.getByText('agent');
    expect(highlightedText).toHaveClass('search-highlight');
  });

  it('should export logs', async () => {
    // Mock URL.createObjectURL
    const mockCreateObjectURL = jest.fn(() => 'mock-url');
    global.URL.createObjectURL = mockCreateObjectURL;

    // Mock link click
    const mockLink = {
      click: jest.fn(),
      href: '',
      download: '',
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

    render(<EnhancedTerminal runId="run-123" />);

    const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];

    if (messageHandler) {
      messageHandler(new MessageEvent('message', {
        data: JSON.stringify({
          id: 'log-1',
          level: 'info',
          message: 'Test log message',
          timestamp: new Date().toISOString(),
        }),
      }));
    }

    await waitFor(() => {
      expect(screen.getByText('Test log message')).toBeInTheDocument();
    });

    // Click export button
    const exportButton = screen.getByTestId('export-logs-button');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.download).toContain('terminal-logs');
    });
  });

  it('should clear logs', async () => {
    render(<EnhancedTerminal runId="run-123" />);

    const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];

    if (messageHandler) {
      messageHandler(new MessageEvent('message', {
        data: JSON.stringify({
          id: 'log-1',
          level: 'info',
          message: 'Test log message',
          timestamp: new Date().toISOString(),
        }),
      }));
    }

    await waitFor(() => {
      expect(screen.getByText('Test log message')).toBeInTheDocument();
    });

    // Click clear button
    const clearButton = screen.getByTestId('clear-logs-button');
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.queryByText('Test log message')).not.toBeInTheDocument();
    });

    // Should show confirmation message
    expect(screen.getByText(/Logs cleared/i)).toBeInTheDocument();
  });

  it('should handle WebSocket connection errors', async () => {
    render(<EnhancedTerminal runId="run-123" />);

    const errorHandler = mockWebSocket.addEventListener.mock.calls.find(
      call => call[0] === 'error'
    )?.[1];

    if (errorHandler) {
      errorHandler(new Event('error'));
    }

    await waitFor(() => {
      expect(screen.getByText(/Connection error/i)).toBeInTheDocument();
    });
  });

  it('should attempt to reconnect on WebSocket close', async () => {
    jest.useFakeTimers();

    render(<EnhancedTerminal runId="run-123" />);

    const closeHandler = mockWebSocket.addEventListener.mock.calls.find(
      call => call[0] === 'close'
    )?.[1];

    if (closeHandler) {
      closeHandler(new CloseEvent('close', { code: 1006, reason: 'Connection lost' }));
    }

    await waitFor(() => {
      expect(screen.getByText(/Connection lost/i)).toBeInTheDocument();
      expect(screen.getByText(/Reconnecting/i)).toBeInTheDocument();
    });

    // Fast-forward reconnection delay
    jest.advanceTimersByTime(3000);

    await waitFor(() => {
      // Should attempt to create new WebSocket connection
      expect(WebSocket).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });

  it('should limit maximum number of displayed logs for performance', async () => {
    render(<EnhancedTerminal runId="run-123" maxLogs={3} />);

    const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];

    // Send 5 messages
    const messages = ['Message 1', 'Message 2', 'Message 3', 'Message 4', 'Message 5'];

    if (messageHandler) {
      messages.forEach((message, index) => {
        messageHandler(new MessageEvent('message', {
          data: JSON.stringify({
            id: `log-${index}`,
            level: 'info',
            message,
            timestamp: new Date().toISOString(),
          }),
        }));
      });
    }

    await waitFor(() => {
      // Should only show last 3 messages
      expect(screen.queryByText('Message 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Message 2')).not.toBeInTheDocument();
      expect(screen.getByText('Message 3')).toBeInTheDocument();
      expect(screen.getByText('Message 4')).toBeInTheDocument();
      expect(screen.getByText('Message 5')).toBeInTheDocument();
    });
  });

  it('should clean up WebSocket connection on unmount', () => {
    const { unmount } = render(<EnhancedTerminal runId="run-123" />);

    unmount();

    expect(mockWebSocket.close).toHaveBeenCalled();
  });

  it('should format timestamps correctly', async () => {
    render(<EnhancedTerminal runId="run-123" />);

    const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];

    const timestamp = new Date('2024-01-15T10:30:45.123Z');

    if (messageHandler) {
      messageHandler(new MessageEvent('message', {
        data: JSON.stringify({
          id: 'log-1',
          level: 'info',
          message: 'Test message',
          timestamp: timestamp.toISOString(),
        }),
      }));
    }

    await waitFor(() => {
      // Should display formatted timestamp
      expect(screen.getByText(/10:30:45/)).toBeInTheDocument();
    });
  });
});