import Docker from 'dockerode';
import { createLogger } from '@agentworks/shared';
import { prisma } from '@agentworks/db';

const logger = createLogger('container-orchestrator');

export interface ContainerConfig {
  projectId: string;
  tenantId: string;
  image: string;
  cpuLimit: string;
  memoryLimit: string;
  storageLimit: string;
  resourceTier: 'basic' | 'standard' | 'performance';
  workspaceDir: string;
}

export interface ContainerInfo {
  containerId: string;
  host: string;
  port: number;
  status: 'running' | 'stopped' | 'error';
}

// Resource tier configurations
const RESOURCE_TIERS = {
  basic: { cpu: '1', memory: '2g', storage: '5Gi' },
  standard: { cpu: '2', memory: '4g', storage: '10Gi' },
  performance: { cpu: '4', memory: '8g', storage: '20Gi' },
};

class ContainerOrchestrator {
  private docker: Docker;
  private isLocalMode: boolean;

  constructor() {
    // Try to connect to Docker socket
    try {
      this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
      this.isLocalMode = true;
      logger.info('Container orchestrator initialized in local Docker mode');
    } catch {
      // Fall back to no-op mode if Docker isn't available
      this.docker = new Docker();
      this.isLocalMode = false;
      logger.warn('Docker not available - running in simulation mode');
    }
  }

  async createEnvironment(config: ContainerConfig): Promise<ContainerInfo> {
    const { projectId, tenantId, image, resourceTier, workspaceDir } = config;
    const tierConfig = RESOURCE_TIERS[resourceTier];

    logger.info('Creating dev environment', { projectId, tenantId, resourceTier });

    // Create database record first
    const devEnv = await prisma.devEnvironment.create({
      data: {
        projectId,
        tenantId,
        status: 'provisioning',
        containerImage: image,
        resourceTier,
        cpuLimit: tierConfig.cpu,
        memoryLimit: tierConfig.memory,
        storageLimit: tierConfig.storage,
        workspaceDir,
      },
    });

    try {
      if (this.isLocalMode) {
        // Create the container using local Docker
        const container = await this.docker.createContainer({
          Image: image,
          name: `agentworks-devenv-${devEnv.id.slice(0, 8)}`,
          Env: [
            `PROJECT_ID=${projectId}`,
            `TENANT_ID=${tenantId}`,
            `DEV_ENV_ID=${devEnv.id}`,
            `WORKSPACE_DIR=${workspaceDir}`,
          ],
          HostConfig: {
            Memory: this.parseMemory(tierConfig.memory),
            NanoCpus: this.parseCpu(tierConfig.cpu),
            PortBindings: {
              '22/tcp': [{ HostPort: '0' }], // SSH
              '3000/tcp': [{ HostPort: '0' }], // Dev server
              '8080/tcp': [{ HostPort: '0' }], // App
            },
          },
          ExposedPorts: {
            '22/tcp': {},
            '3000/tcp': {},
            '8080/tcp': {},
          },
        });

        await container.start();

        // Get container info
        const info = await container.inspect();
        const hostPort = parseInt(
          info.NetworkSettings.Ports['8080/tcp']?.[0]?.HostPort || '0',
          10
        );

        // Update database with container info
        await prisma.devEnvironment.update({
          where: { id: devEnv.id },
          data: {
            status: 'running',
            containerHost: 'localhost',
            containerPort: hostPort,
          },
        });

        logger.info('Dev environment created successfully', {
          devEnvId: devEnv.id,
          containerId: container.id,
          port: hostPort,
        });

        return {
          containerId: container.id,
          host: 'localhost',
          port: hostPort,
          status: 'running',
        };
      } else {
        // Simulation mode - just update database
        await prisma.devEnvironment.update({
          where: { id: devEnv.id },
          data: {
            status: 'running',
            containerHost: 'localhost',
            containerPort: 8080 + Math.floor(Math.random() * 1000),
          },
        });

        logger.info('Dev environment created (simulation mode)', { devEnvId: devEnv.id });

        return {
          containerId: `sim-${devEnv.id}`,
          host: 'localhost',
          port: 8080,
          status: 'running',
        };
      }
    } catch (error) {
      logger.error('Failed to create dev environment', { devEnvId: devEnv.id, error });

      await prisma.devEnvironment.update({
        where: { id: devEnv.id },
        data: {
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  async suspendEnvironment(devEnvId: string): Promise<void> {
    logger.info('Suspending dev environment', { devEnvId });

    const devEnv = await prisma.devEnvironment.findUnique({
      where: { id: devEnvId },
    });

    if (!devEnv) {
      throw new Error(`Dev environment not found: ${devEnvId}`);
    }

    try {
      if (this.isLocalMode) {
        const containers = await this.docker.listContainers({
          filters: { name: [`agentworks-devenv-${devEnvId.slice(0, 8)}`] },
        });

        for (const containerInfo of containers) {
          const container = this.docker.getContainer(containerInfo.Id);
          await container.stop();
        }
      }

      await prisma.devEnvironment.update({
        where: { id: devEnvId },
        data: {
          status: 'suspended',
          suspendedAt: new Date(),
        },
      });

      logger.info('Dev environment suspended', { devEnvId });
    } catch (error) {
      logger.error('Failed to suspend dev environment', { devEnvId, error });
      throw error;
    }
  }

  async resumeEnvironment(devEnvId: string): Promise<ContainerInfo> {
    logger.info('Resuming dev environment', { devEnvId });

    const devEnv = await prisma.devEnvironment.findUnique({
      where: { id: devEnvId },
    });

    if (!devEnv) {
      throw new Error(`Dev environment not found: ${devEnvId}`);
    }

    try {
      if (this.isLocalMode) {
        const containers = await this.docker.listContainers({
          all: true,
          filters: { name: [`agentworks-devenv-${devEnvId.slice(0, 8)}`] },
        });

        for (const containerInfo of containers) {
          const container = this.docker.getContainer(containerInfo.Id);
          await container.start();
        }
      }

      await prisma.devEnvironment.update({
        where: { id: devEnvId },
        data: {
          status: 'running',
          suspendedAt: null,
          lastActiveAt: new Date(),
        },
      });

      logger.info('Dev environment resumed', { devEnvId });

      return {
        containerId: `container-${devEnvId}`,
        host: devEnv.containerHost || 'localhost',
        port: devEnv.containerPort || 8080,
        status: 'running',
      };
    } catch (error) {
      logger.error('Failed to resume dev environment', { devEnvId, error });
      throw error;
    }
  }

  async terminateEnvironment(devEnvId: string): Promise<void> {
    logger.info('Terminating dev environment', { devEnvId });

    try {
      if (this.isLocalMode) {
        const containers = await this.docker.listContainers({
          all: true,
          filters: { name: [`agentworks-devenv-${devEnvId.slice(0, 8)}`] },
        });

        for (const containerInfo of containers) {
          const container = this.docker.getContainer(containerInfo.Id);
          await container.stop().catch(() => {}); // Ignore if already stopped
          await container.remove({ force: true });
        }
      }

      await prisma.devEnvironment.update({
        where: { id: devEnvId },
        data: {
          status: 'terminated',
        },
      });

      logger.info('Dev environment terminated', { devEnvId });
    } catch (error) {
      logger.error('Failed to terminate dev environment', { devEnvId, error });
      throw error;
    }
  }

  async getEnvironmentStatus(devEnvId: string): Promise<string> {
    const devEnv = await prisma.devEnvironment.findUnique({
      where: { id: devEnvId },
    });

    if (!devEnv) {
      return 'not_found';
    }

    if (this.isLocalMode && devEnv.status === 'running') {
      // Verify container is actually running
      const containers = await this.docker.listContainers({
        filters: { name: [`agentworks-devenv-${devEnvId.slice(0, 8)}`] },
      });

      if (containers.length === 0) {
        // Container not running - update status
        await prisma.devEnvironment.update({
          where: { id: devEnvId },
          data: { status: 'error', errorMessage: 'Container not found' },
        });
        return 'error';
      }
    }

    return devEnv.status;
  }

  async listEnvironments(tenantId: string) {
    return prisma.devEnvironment.findMany({
      where: { tenantId },
      include: {
        project: { select: { name: true, slug: true } },
        mcpServers: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private parseMemory(memory: string): number {
    const match = memory.match(/^(\d+)([gmk])?$/i);
    if (!match) return 4 * 1024 * 1024 * 1024; // Default 4GB

    const value = parseInt(match[1], 10);
    const unit = (match[2] || 'g').toLowerCase();

    switch (unit) {
      case 'k':
        return value * 1024;
      case 'm':
        return value * 1024 * 1024;
      case 'g':
        return value * 1024 * 1024 * 1024;
      default:
        return value;
    }
  }

  private parseCpu(cpu: string): number {
    // Docker NanoCpus: 1 CPU = 1,000,000,000 nanocpus
    const cpuCount = parseFloat(cpu);
    return cpuCount * 1_000_000_000;
  }
}

export const containerOrchestrator = new ContainerOrchestrator();
