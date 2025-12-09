import type { StreamToken } from '../types.js';

export interface SSEMessage {
  event?: string;
  data: string;
  id?: string;
  retry?: number;
}

export function formatSSEMessage(message: SSEMessage): string {
  let output = '';

  if (message.event) {
    output += `event: ${message.event}\n`;
  }

  if (message.id) {
    output += `id: ${message.id}\n`;
  }

  if (message.retry !== undefined) {
    output += `retry: ${message.retry}\n`;
  }

  const lines = message.data.split('\n');
  for (const line of lines) {
    output += `data: ${line}\n`;
  }

  output += '\n';
  return output;
}

export function formatStreamToken(token: StreamToken): SSEMessage {
  return {
    event: token.finishReason ? 'done' : 'token',
    data: JSON.stringify({
      content: token.content,
      finishReason: token.finishReason,
      usage: token.usage,
      model: token.model,
    }),
  };
}

export function formatError(error: Error | string): SSEMessage {
  const message = typeof error === 'string' ? error : error.message;
  return {
    event: 'error',
    data: JSON.stringify({ error: message }),
  };
}

export function formatPing(): SSEMessage {
  return {
    event: 'ping',
    data: JSON.stringify({ timestamp: Date.now() }),
  };
}

export class SSEWriter {
  private encoder = new TextEncoder();
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private closed = false;

  createStream(pingIntervalMs = 15000): ReadableStream<Uint8Array> {
    return new ReadableStream({
      start: (controller) => {
        this.controller = controller;

        if (pingIntervalMs > 0) {
          this.pingInterval = setInterval(() => {
            this.ping();
          }, pingIntervalMs);
        }
      },
      cancel: () => {
        this.close();
      },
    });
  }

  write(message: SSEMessage): void {
    if (this.closed || !this.controller) return;

    try {
      const formatted = formatSSEMessage(message);
      this.controller.enqueue(this.encoder.encode(formatted));
    } catch {
    }
  }

  writeToken(token: StreamToken): void {
    this.write(formatStreamToken(token));
  }

  writeError(error: Error | string): void {
    this.write(formatError(error));
  }

  ping(): void {
    this.write(formatPing());
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.controller) {
      try {
        this.controller.close();
      } catch {
      }
      this.controller = null;
    }
  }
}

export function createSSEResponse(
  body: ReadableStream<Uint8Array>,
  headers: Record<string, string> = {}
): Response {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      ...headers,
    },
  });
}

export async function* parseSSEStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<SSEMessage> {
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const messages = buffer.split('\n\n');
      buffer = messages.pop() ?? '';

      for (const messageStr of messages) {
        if (!messageStr.trim()) continue;

        const message: SSEMessage = { data: '' };
        const lines = messageStr.split('\n');

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            message.event = line.slice(7);
          } else if (line.startsWith('data: ')) {
            message.data += (message.data ? '\n' : '') + line.slice(6);
          } else if (line.startsWith('id: ')) {
            message.id = line.slice(4);
          } else if (line.startsWith('retry: ')) {
            message.retry = parseInt(line.slice(7), 10);
          }
        }

        yield message;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function getSSEHeaders(): Record<string, string> {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  };
}
