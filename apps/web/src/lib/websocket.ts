import { useCallback, useMemo } from 'react';

const isDevMode = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || (import.meta as any)?.env?.DEV);

class AgentWorksWebSocket {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = isDevMode ? 1 : 5;
  private reconnectInterval = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private isConnecting = false;
  private disabled = false;

  private getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const env = (import.meta as any)?.env || {};

    // Check for explicit WS URL
    const wsUrl = env.VITE_WS_URL;
    if (wsUrl) {
      return wsUrl.replace(/^http/, 'ws') + '/ws';
    }

    // Check for API URL and derive WS URL from it
    const apiUrl = env.VITE_API_URL;
    if (apiUrl) {
      return apiUrl.replace(/^http/, 'ws') + '/ws';
    }

    // In production (not localhost), use the API domain
    if (window.location.hostname !== 'localhost') {
      return `${protocol}//api.agentworksstudio.com/ws`;
    }

    // Local development fallback
    const apiPort = env.VITE_API_PORT || '3010';
    return `${protocol}//${window.location.hostname}:${apiPort}/ws`;
  }

  connect() {
    if (this.disabled || this.isConnecting || (this.socket && this.socket.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    try {
      this.socket = new WebSocket(this.getWebSocketUrl());

      this.socket.onopen = () => {
        if (isDevMode) console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connected');
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type, data.payload);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.socket.onclose = () => {
        if (isDevMode) console.log('WebSocket disconnected');
        this.isConnecting = false;
        this.socket = null;
        this.emit('disconnected');
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.isConnecting = false;
        if (isDevMode) {
          this.disabled = true;
        }
      };
    } catch (error) {
      if (isDevMode) {
        console.warn('WebSocket not available in dev mode');
        this.disabled = true;
      } else {
        console.error('Failed to create WebSocket connection:', error);
      }
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.disabled) return;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
      
      setTimeout(() => {
        if (!this.disabled) {
          this.connect();
        }
      }, delay);
    } else if (isDevMode) {
      this.disabled = true;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  send(type: string, payload: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  subscribe(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
        if (eventListeners.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  private emit(event: string, data?: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  subscribeTo(events: {
    runId?: string;
    cardId?: string;
    projectId?: string;
    workspaceId?: string;
  }) {
    this.send('subscribe', events);
  }

  unsubscribeFrom(events: {
    runId?: string;
    cardId?: string;
    projectId?: string;
    workspaceId?: string;
  }) {
    this.send('unsubscribe', events);
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

export const wsClient = new AgentWorksWebSocket();

export function useWebSocket() {
  const connect = useCallback(() => wsClient.connect(), []);
  const disconnect = useCallback(() => wsClient.disconnect(), []);
  const subscribe = useCallback((event: string, callback: (data: any) => void) => wsClient.subscribe(event, callback), []);
  const send = useCallback((type: string, payload: any) => wsClient.send(type, payload), []);
  const subscribeTo = useCallback((events: any) => wsClient.subscribeTo(events), []);
  const unsubscribeFrom = useCallback((events: any) => wsClient.unsubscribeFrom(events), []);
  const isConnected = useCallback(() => wsClient.isConnected(), []);

  return useMemo(() => ({
    connect,
    disconnect,
    subscribe,
    send,
    subscribeTo,
    unsubscribeFrom,
    isConnected,
  }), [connect, disconnect, subscribe, send, subscribeTo, unsubscribeFrom, isConnected]);
}