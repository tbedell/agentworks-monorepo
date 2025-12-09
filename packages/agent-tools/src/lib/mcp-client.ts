/**
 * MCP (Model Context Protocol) Client
 *
 * Provides a unified interface for connecting to MCP servers running in
 * dev environments. Supports filesystem, terminal, and git operations.
 *
 * MCP servers run inside dev environment containers and expose JSON-RPC
 * endpoints for tool execution.
 */

import { createLogger } from '@agentworks/shared';

const logger = createLogger('agent-tools:mcp-client');

// MCP Protocol Types
export interface McpRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface McpResponse<T = unknown> {
  jsonrpc: '2.0';
  id: string | number;
  result?: T;
  error?: McpError;
}

export interface McpError {
  code: number;
  message: string;
  data?: unknown;
}

// MCP Server Types
export type McpServerType = 'filesystem' | 'terminal' | 'git';

export interface McpServerConfig {
  type: McpServerType;
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'ws' | 'wss';
}

export interface McpConnectionConfig {
  devEnvId: string;
  projectId: string;
  tenantId: string;
  servers: McpServerConfig[];
  timeout?: number;
}

// Filesystem MCP Types
export interface McpFileReadParams {
  path: string;
  encoding?: 'utf-8' | 'base64';
  [key: string]: unknown;
}

export interface McpFileReadResult {
  content: string;
  size: number;
  encoding: string;
}

export interface McpFileWriteParams {
  path: string;
  content: string;
  encoding?: 'utf-8' | 'base64';
  createDirectories?: boolean;
  [key: string]: unknown;
}

export interface McpFileWriteResult {
  path: string;
  size: number;
  created: boolean;
}

export interface McpListFilesParams {
  path: string;
  recursive?: boolean;
  pattern?: string;
  [key: string]: unknown;
}

export interface McpFileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink';
  size?: number;
  modified?: string;
}

export interface McpListFilesResult {
  entries: McpFileEntry[];
  totalCount: number;
}

// Terminal MCP Types
export interface McpRunCommandParams {
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  [key: string]: unknown;
}

export interface McpRunCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

// Git MCP Types
export interface McpGitStatusResult {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  modified: string[];
  untracked: string[];
}

export interface McpGitCommitParams {
  message: string;
  files?: string[];
  [key: string]: unknown;
}

export interface McpGitCommitResult {
  sha: string;
  message: string;
  author: string;
  timestamp: string;
}

/**
 * MCP Client for communicating with MCP servers in dev environments
 */
export class McpClient {
  private config: McpConnectionConfig;
  private requestId = 0;
  private serverConnections: Map<McpServerType, McpServerConfig> = new Map();

  constructor(config: McpConnectionConfig) {
    this.config = config;
    this.config.timeout = config.timeout || 30000;

    // Index servers by type for quick access
    for (const server of config.servers) {
      this.serverConnections.set(server.type, server);
    }

    logger.debug('MCP client initialized', {
      devEnvId: config.devEnvId,
      serverCount: config.servers.length,
      serverTypes: config.servers.map((s) => s.type),
    });
  }

  /**
   * Get the base URL for an MCP server
   */
  private getServerUrl(serverType: McpServerType): string {
    const server = this.serverConnections.get(serverType);
    if (!server) {
      throw new Error(`MCP server not configured for type: ${serverType}`);
    }
    return `${server.protocol}://${server.host}:${server.port}`;
  }

  /**
   * Send a JSON-RPC request to an MCP server
   */
  private async sendRequest<T>(
    serverType: McpServerType,
    method: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    const url = this.getServerUrl(serverType);
    const requestId = ++this.requestId;

    const request: McpRequest = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params,
    };

    logger.debug('Sending MCP request', {
      serverType,
      method,
      requestId,
      url,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${url}/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-Env-Id': this.config.devEnvId,
          'X-Project-Id': this.config.projectId,
          'X-Tenant-Id': this.config.tenantId,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`MCP request failed with status ${response.status}`);
      }

      const mcpResponse = (await response.json()) as McpResponse<T>;

      if (mcpResponse.error) {
        logger.warn('MCP request returned error', {
          serverType,
          method,
          error: mcpResponse.error,
        });
        throw new McpClientError(
          mcpResponse.error.code,
          mcpResponse.error.message,
          mcpResponse.error.data
        );
      }

      logger.debug('MCP request succeeded', {
        serverType,
        method,
        requestId,
      });

      return mcpResponse.result as T;
    } catch (error) {
      if (error instanceof McpClientError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('MCP request failed', {
        serverType,
        method,
        error: errorMessage,
      });
      throw new McpClientError(-32000, `MCP request failed: ${errorMessage}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ============================================
  // Filesystem Operations
  // ============================================

  /**
   * Read a file from the dev environment
   */
  async readFile(params: McpFileReadParams): Promise<McpFileReadResult> {
    return this.sendRequest<McpFileReadResult>('filesystem', 'fs/read', params);
  }

  /**
   * Write a file to the dev environment
   */
  async writeFile(params: McpFileWriteParams): Promise<McpFileWriteResult> {
    return this.sendRequest<McpFileWriteResult>('filesystem', 'fs/write', params);
  }

  /**
   * List files in a directory
   */
  async listFiles(params: McpListFilesParams): Promise<McpListFilesResult> {
    return this.sendRequest<McpListFilesResult>('filesystem', 'fs/list', params);
  }

  /**
   * Delete a file or directory
   */
  async deleteFile(path: string, recursive = false): Promise<{ deleted: boolean }> {
    return this.sendRequest<{ deleted: boolean }>('filesystem', 'fs/delete', {
      path,
      recursive,
    });
  }

  /**
   * Check if a file or directory exists
   */
  async exists(path: string): Promise<{ exists: boolean; type?: string }> {
    return this.sendRequest<{ exists: boolean; type?: string }>('filesystem', 'fs/exists', {
      path,
    });
  }

  /**
   * Get file or directory stats
   */
  async stat(
    path: string
  ): Promise<{
    path: string;
    type: string;
    size: number;
    modified: string;
    created: string;
  }> {
    return this.sendRequest('filesystem', 'fs/stat', { path });
  }

  // ============================================
  // Terminal Operations
  // ============================================

  /**
   * Run a command in the dev environment
   */
  async runCommand(params: McpRunCommandParams): Promise<McpRunCommandResult> {
    return this.sendRequest<McpRunCommandResult>('terminal', 'terminal/run', params);
  }

  /**
   * Start an interactive terminal session (returns session ID for WebSocket connection)
   */
  async startTerminalSession(params?: {
    cwd?: string;
    env?: Record<string, string>;
  }): Promise<{ sessionId: string; wsUrl: string }> {
    return this.sendRequest<{ sessionId: string; wsUrl: string }>(
      'terminal',
      'terminal/session/start',
      params
    );
  }

  /**
   * End an interactive terminal session
   */
  async endTerminalSession(sessionId: string): Promise<{ ended: boolean }> {
    return this.sendRequest<{ ended: boolean }>('terminal', 'terminal/session/end', {
      sessionId,
    });
  }

  // ============================================
  // Git Operations
  // ============================================

  /**
   * Get git status
   */
  async gitStatus(): Promise<McpGitStatusResult> {
    return this.sendRequest<McpGitStatusResult>('git', 'git/status', {});
  }

  /**
   * Stage files for commit
   */
  async gitAdd(files: string[]): Promise<{ staged: string[] }> {
    return this.sendRequest<{ staged: string[] }>('git', 'git/add', { files });
  }

  /**
   * Create a commit
   */
  async gitCommit(params: McpGitCommitParams): Promise<McpGitCommitResult> {
    return this.sendRequest<McpGitCommitResult>('git', 'git/commit', params);
  }

  /**
   * Push to remote
   */
  async gitPush(params?: {
    remote?: string;
    branch?: string;
    force?: boolean;
  }): Promise<{ pushed: boolean; remote: string; branch: string }> {
    return this.sendRequest<{ pushed: boolean; remote: string; branch: string }>(
      'git',
      'git/push',
      params
    );
  }

  /**
   * Pull from remote
   */
  async gitPull(params?: {
    remote?: string;
    branch?: string;
  }): Promise<{ pulled: boolean; commits: number }> {
    return this.sendRequest<{ pulled: boolean; commits: number }>('git', 'git/pull', params);
  }

  /**
   * Get git log
   */
  async gitLog(params?: {
    maxCount?: number;
    since?: string;
  }): Promise<{
    commits: Array<{
      sha: string;
      message: string;
      author: string;
      timestamp: string;
    }>;
  }> {
    return this.sendRequest('git', 'git/log', params);
  }

  /**
   * Get git diff
   */
  async gitDiff(params?: {
    staged?: boolean;
    file?: string;
  }): Promise<{ diff: string; files: string[] }> {
    return this.sendRequest<{ diff: string; files: string[] }>('git', 'git/diff', params);
  }

  // ============================================
  // Connection Management
  // ============================================

  /**
   * Check if a specific server is available
   */
  async isServerAvailable(serverType: McpServerType): Promise<boolean> {
    try {
      await this.sendRequest(serverType, 'ping', {});
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check health of all configured servers
   */
  async healthCheck(): Promise<Map<McpServerType, boolean>> {
    const results = new Map<McpServerType, boolean>();

    for (const serverType of this.serverConnections.keys()) {
      results.set(serverType, await this.isServerAvailable(serverType));
    }

    return results;
  }

  /**
   * Get connection info
   */
  getConnectionInfo(): {
    devEnvId: string;
    projectId: string;
    servers: Array<{ type: McpServerType; url: string }>;
  } {
    return {
      devEnvId: this.config.devEnvId,
      projectId: this.config.projectId,
      servers: Array.from(this.serverConnections.entries()).map(([type, config]) => ({
        type,
        url: `${config.protocol}://${config.host}:${config.port}`,
      })),
    };
  }
}

/**
 * Custom error class for MCP client errors
 */
export class McpClientError extends Error {
  code: number;
  data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = 'McpClientError';
    this.code = code;
    this.data = data;
  }
}

/**
 * Factory function to create an MCP client from dev environment config
 */
export function createMcpClient(config: McpConnectionConfig): McpClient {
  return new McpClient(config);
}

/**
 * Create an MCP client from dev environment manager API response
 */
export async function createMcpClientFromDevEnv(
  apiBaseUrl: string,
  devEnvId: string,
  authToken: string
): Promise<McpClient> {
  const response = await fetch(`${apiBaseUrl}/api/environments/${devEnvId}/mcp`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get MCP config: ${response.status}`);
  }

  interface DevEnvMcpResponse {
    devEnvId: string;
    projectId: string;
    tenantId: string;
    servers: Array<{
      type: McpServerType;
      host: string;
      port: number;
      protocol: 'http' | 'https' | 'ws' | 'wss';
    }>;
  }

  const data = (await response.json()) as DevEnvMcpResponse;

  return new McpClient({
    devEnvId: data.devEnvId,
    projectId: data.projectId,
    tenantId: data.tenantId,
    servers: data.servers,
  });
}

export default McpClient;
