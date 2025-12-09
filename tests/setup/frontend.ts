import '@testing-library/jest-dom';
import { beforeAll, afterAll, beforeEach } from '@jest/globals';
import { cleanup } from '@testing-library/react';
import { server } from '../mocks/server';

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock WebSocket
global.WebSocket = class MockWebSocket {
  constructor(url: string) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 0);
  }
  
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number;
  onopen?: (event: Event) => void;
  onmessage?: (event: MessageEvent) => void;
  onclose?: (event: CloseEvent) => void;
  onerror?: (event: Event) => void;

  send(data: string) {
    // Simulate message sending
    setTimeout(() => {
      this.onmessage?.(new MessageEvent('message', { data }));
    }, 0);
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  addEventListener(type: string, listener: EventListener) {
    if (type === 'open') this.onopen = listener;
    if (type === 'message') this.onmessage = listener;
    if (type === 'close') this.onclose = listener;
    if (type === 'error') this.onerror = listener;
  }

  removeEventListener() {}
} as any;

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Mock sessionStorage
global.sessionStorage = localStorageMock as any;

// Mock crypto.randomUUID
global.crypto = {
  randomUUID: jest.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9)),
} as any;

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

beforeAll(() => {
  // Start MSW server
  server.listen();
});

afterAll(() => {
  // Clean up after all tests
  server.close();
});

beforeEach(() => {
  // Clear mocks before each test
  jest.clearAllMocks();
  localStorageMock.clear.mockClear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  
  // Reset MSW handlers
  server.resetHandlers();
});

afterEach(() => {
  // Cleanup DOM after each test
  cleanup();
});

// Helper function to mock successful API responses
export function mockApiSuccess(data: any) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => data,
    headers: new Headers(),
    status: 200,
    statusText: 'OK',
  });
}

// Helper function to mock API errors
export function mockApiError(status: number, message: string) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    json: async () => ({ error: message }),
    headers: new Headers(),
    status,
    statusText: message,
  });
}

// Helper to mock authenticated user
export function mockAuthenticatedUser() {
  localStorageMock.getItem.mockImplementation((key: string) => {
    if (key === 'auth-token') return 'mock-jwt-token';
    if (key === 'user') return JSON.stringify({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    });
    return null;
  });
}