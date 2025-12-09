import { createLogger } from '@agentworks/shared';
import { prisma } from '@agentworks/db';

const logger = createLogger('mcp-server-manager');

export type McpServerType = 'filesystem' | 'terminal' | 'git' | 'database';

export interface McpServerConfig {
  serverType: McpServerType;
  name: string;
  config?: Record<string, unknown>;
}

// Default MCP servers to provision for each dev environment
const DEFAULT_MCP_SERVERS: McpServerConfig[] = [
  {
    serverType: 'filesystem',
    name: 'Filesystem Server',
    config: { allowedPaths: ['/workspace'] },
  },
  {
    serverType: 'terminal',
    name: 'Terminal Server',
    config: { shell: 'bash' },
  },
  {
    serverType: 'git',
    name: 'Git Server',
    config: { repoPath: '/workspace' },
  },
];

// Port assignments for MCP servers within a container
const MCP_SERVER_PORTS: Record<McpServerType, number> = {
  filesystem: 3100,
  terminal: 3101,
  git: 3102,
  database: 3103,
};

class McpServerManager {
  async provisionDefaultServers(devEnvId: string): Promise<void> {
    logger.info('Provisioning default MCP servers', { devEnvId });

    const devEnv = await prisma.devEnvironment.findUnique({
      where: { id: devEnvId },
    });

    if (!devEnv) {
      throw new Error(`Dev environment not found: ${devEnvId}`);
    }

    for (const serverConfig of DEFAULT_MCP_SERVERS) {
      await this.createServer(devEnvId, serverConfig);
    }

    logger.info('Default MCP servers provisioned', {
      devEnvId,
      serverCount: DEFAULT_MCP_SERVERS.length,
    });
  }

  async createServer(devEnvId: string, config: McpServerConfig): Promise<string> {
    const { serverType, name, config: serverConfig } = config;
    const port = MCP_SERVER_PORTS[serverType];

    logger.info('Creating MCP server', { devEnvId, serverType, name });

    // Check if server already exists
    const existing = await prisma.mcpServer.findUnique({
      where: {
        devEnvId_serverType: { devEnvId, serverType },
      },
    });

    if (existing) {
      logger.warn('MCP server already exists', { devEnvId, serverType });
      return existing.id;
    }

    const mcpServer = await prisma.mcpServer.create({
      data: {
        devEnvId,
        serverType,
        name,
        port,
        status: 'starting',
        config: serverConfig ? JSON.parse(JSON.stringify(serverConfig)) : undefined,
      },
    });

    // In production, this would send a command to the container to start the MCP server
    // For now, simulate startup
    await this.simulateServerStartup(mcpServer.id);

    return mcpServer.id;
  }

  async startServer(mcpServerId: string): Promise<void> {
    logger.info('Starting MCP server', { mcpServerId });

    const server = await prisma.mcpServer.findUnique({
      where: { id: mcpServerId },
      include: { devEnvironment: true },
    });

    if (!server) {
      throw new Error(`MCP server not found: ${mcpServerId}`);
    }

    if (server.devEnvironment.status !== 'running') {
      throw new Error('Dev environment is not running');
    }

    await prisma.mcpServer.update({
      where: { id: mcpServerId },
      data: { status: 'starting' },
    });

    // Simulate startup
    await this.simulateServerStartup(mcpServerId);
  }

  async stopServer(mcpServerId: string): Promise<void> {
    logger.info('Stopping MCP server', { mcpServerId });

    await prisma.mcpServer.update({
      where: { id: mcpServerId },
      data: { status: 'stopped' },
    });
  }

  async getServerStatus(mcpServerId: string): Promise<string> {
    const server = await prisma.mcpServer.findUnique({
      where: { id: mcpServerId },
    });

    return server?.status ?? 'not_found';
  }

  async listServers(devEnvId: string) {
    return prisma.mcpServer.findMany({
      where: { devEnvId },
      orderBy: { serverType: 'asc' },
    });
  }

  async getServerEndpoint(mcpServerId: string): Promise<{ host: string; port: number } | null> {
    const server = await prisma.mcpServer.findUnique({
      where: { id: mcpServerId },
      include: { devEnvironment: true },
    });

    if (!server || server.status !== 'running') {
      return null;
    }

    return {
      host: server.devEnvironment.containerHost || 'localhost',
      port: server.port,
    };
  }

  private async simulateServerStartup(mcpServerId: string): Promise<void> {
    // Simulate startup delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    await prisma.mcpServer.update({
      where: { id: mcpServerId },
      data: { status: 'running' },
    });

    logger.info('MCP server started', { mcpServerId });
  }

  async stopAllServers(devEnvId: string): Promise<void> {
    logger.info('Stopping all MCP servers', { devEnvId });

    await prisma.mcpServer.updateMany({
      where: { devEnvId },
      data: { status: 'stopped' },
    });
  }

  async getMcpConfig(devEnvId: string): Promise<object> {
    const servers = await this.listServers(devEnvId);
    const devEnv = await prisma.devEnvironment.findUnique({
      where: { id: devEnvId },
    });

    if (!devEnv) {
      throw new Error(`Dev environment not found: ${devEnvId}`);
    }

    // Generate MCP configuration file content
    const mcpConfig: Record<string, unknown> = {
      mcpServers: {},
    };

    for (const server of servers) {
      if (server.status === 'running') {
        const serverKey = server.serverType;
        (mcpConfig.mcpServers as Record<string, unknown>)[serverKey] = {
          command: 'node',
          args: [`/mcp-servers/${server.serverType}/index.js`],
          env: {
            PORT: server.port.toString(),
            WORKSPACE_DIR: devEnv.workspaceDir,
            ...(server.config as Record<string, string>),
          },
        };
      }
    }

    return mcpConfig;
  }
}

export const mcpServerManager = new McpServerManager();
