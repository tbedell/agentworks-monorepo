import crypto from 'crypto';
import { prisma } from '@agentworks/db';
import { createLogger } from '@agentworks/shared';

const logger = createLogger('api:credential-vault');

const ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export interface CredentialData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  subscriptionTier?: string;
  metadata?: Record<string, unknown>;
}

export interface StoredCredential {
  id: string;
  tenantId: string;
  provider: string;
  credentialType: string;
  subscriptionTier: string | null;
  isDefault: boolean;
  assignedAgents: string[];
  status: string;
  lastUsedAt: Date | null;
  createdAt: Date;
}

function getKey(): Buffer {
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  if (key.length !== 32) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export async function storeCredential(
  tenantId: string,
  provider: string,
  credentialType: string,
  data: CredentialData,
  options: {
    isDefault?: boolean;
    assignedAgents?: string[];
  } = {}
): Promise<StoredCredential> {
  logger.info('Storing credential', { tenantId, provider, credentialType });

  const encryptedToken = encrypt(data.accessToken);
  const encryptedRefresh = data.refreshToken ? encrypt(data.refreshToken) : null;

  const credential = await prisma.tenantProviderCredential.upsert({
    where: {
      tenantId_provider: {
        tenantId,
        provider,
      },
    },
    update: {
      credentialType,
      encryptedToken,
      refreshToken: encryptedRefresh,
      tokenExpiresAt: data.expiresAt,
      subscriptionTier: data.subscriptionTier,
      isDefault: options.isDefault ?? false,
      assignedAgents: options.assignedAgents ?? ['ceo_copilot'],
      status: 'active',
      lastRefreshedAt: new Date(),
      metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
      updatedAt: new Date(),
    },
    create: {
      tenantId,
      provider,
      credentialType,
      encryptedToken,
      refreshToken: encryptedRefresh,
      tokenExpiresAt: data.expiresAt,
      subscriptionTier: data.subscriptionTier,
      isDefault: options.isDefault ?? false,
      assignedAgents: options.assignedAgents ?? ['ceo_copilot'],
      status: 'active',
      metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
    },
  });

  if (options.isDefault) {
    await prisma.tenantSettings.upsert({
      where: { tenantId },
      update: {
        byoaEnabled: true,
        byoaDefaultProvider: provider,
      },
      create: {
        tenantId,
        byoaEnabled: true,
        byoaDefaultProvider: provider,
      },
    });
  }

  logger.info('Credential stored successfully', { tenantId, provider, credentialId: credential.id });

  return {
    id: credential.id,
    tenantId: credential.tenantId,
    provider: credential.provider,
    credentialType: credential.credentialType,
    subscriptionTier: credential.subscriptionTier,
    isDefault: credential.isDefault,
    assignedAgents: credential.assignedAgents,
    status: credential.status,
    lastUsedAt: credential.lastUsedAt,
    createdAt: credential.createdAt,
  };
}

export async function getCredential(
  tenantId: string,
  provider: string
): Promise<CredentialData | null> {
  const credential = await prisma.tenantProviderCredential.findUnique({
    where: {
      tenantId_provider: {
        tenantId,
        provider,
      },
    },
  });

  if (!credential || credential.status !== 'active') {
    return null;
  }

  try {
    const accessToken = decrypt(credential.encryptedToken);
    const refreshToken = credential.refreshToken ? decrypt(credential.refreshToken) : undefined;

    await prisma.tenantProviderCredential.update({
      where: { id: credential.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      expiresAt: credential.tokenExpiresAt || undefined,
      subscriptionTier: credential.subscriptionTier || undefined,
      metadata: credential.metadata as Record<string, unknown> | undefined,
    };
  } catch (error) {
    logger.error('Failed to decrypt credential', { tenantId, provider, error });
    return null;
  }
}

export async function getCredentialForAgent(
  tenantId: string,
  agentName: string
): Promise<{ provider: string; credential: CredentialData } | null> {
  const credentials = await prisma.tenantProviderCredential.findMany({
    where: {
      tenantId,
      status: 'active',
      assignedAgents: {
        has: agentName,
      },
    },
  });

  if (credentials.length === 0) {
    const defaultCredential = await prisma.tenantProviderCredential.findFirst({
      where: {
        tenantId,
        status: 'active',
        isDefault: true,
      },
    });

    if (!defaultCredential) {
      return null;
    }

    try {
      return {
        provider: defaultCredential.provider,
        credential: {
          accessToken: decrypt(defaultCredential.encryptedToken),
          refreshToken: defaultCredential.refreshToken ? decrypt(defaultCredential.refreshToken) : undefined,
          expiresAt: defaultCredential.tokenExpiresAt || undefined,
          subscriptionTier: defaultCredential.subscriptionTier || undefined,
        },
      };
    } catch {
      return null;
    }
  }

  const credential = credentials[0];
  try {
    return {
      provider: credential.provider,
      credential: {
        accessToken: decrypt(credential.encryptedToken),
        refreshToken: credential.refreshToken ? decrypt(credential.refreshToken) : undefined,
        expiresAt: credential.tokenExpiresAt || undefined,
        subscriptionTier: credential.subscriptionTier || undefined,
      },
    };
  } catch {
    return null;
  }
}

export async function listCredentials(tenantId: string): Promise<StoredCredential[]> {
  const credentials = await prisma.tenantProviderCredential.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });

  return credentials.map((c) => ({
    id: c.id,
    tenantId: c.tenantId,
    provider: c.provider,
    credentialType: c.credentialType,
    subscriptionTier: c.subscriptionTier,
    isDefault: c.isDefault,
    assignedAgents: c.assignedAgents,
    status: c.status,
    lastUsedAt: c.lastUsedAt,
    createdAt: c.createdAt,
  }));
}

export async function updateCredentialAgents(
  tenantId: string,
  provider: string,
  assignedAgents: string[]
): Promise<StoredCredential | null> {
  try {
    const credential = await prisma.tenantProviderCredential.update({
      where: {
        tenantId_provider: {
          tenantId,
          provider,
        },
      },
      data: {
        assignedAgents,
        updatedAt: new Date(),
      },
    });

    return {
      id: credential.id,
      tenantId: credential.tenantId,
      provider: credential.provider,
      credentialType: credential.credentialType,
      subscriptionTier: credential.subscriptionTier,
      isDefault: credential.isDefault,
      assignedAgents: credential.assignedAgents,
      status: credential.status,
      lastUsedAt: credential.lastUsedAt,
      createdAt: credential.createdAt,
    };
  } catch {
    return null;
  }
}

export async function setDefaultCredential(
  tenantId: string,
  provider: string
): Promise<void> {
  await prisma.$transaction([
    prisma.tenantProviderCredential.updateMany({
      where: { tenantId },
      data: { isDefault: false },
    }),
    prisma.tenantProviderCredential.update({
      where: {
        tenantId_provider: {
          tenantId,
          provider,
        },
      },
      data: { isDefault: true },
    }),
    prisma.tenantSettings.upsert({
      where: { tenantId },
      update: {
        byoaEnabled: true,
        byoaDefaultProvider: provider,
      },
      create: {
        tenantId,
        byoaEnabled: true,
        byoaDefaultProvider: provider,
      },
    }),
  ]);
}

export async function revokeCredential(
  tenantId: string,
  provider: string
): Promise<void> {
  logger.info('Revoking credential', { tenantId, provider });

  const credential = await prisma.tenantProviderCredential.findUnique({
    where: {
      tenantId_provider: {
        tenantId,
        provider,
      },
    },
  });

  if (credential?.isDefault) {
    await prisma.tenantSettings.update({
      where: { tenantId },
      data: {
        byoaDefaultProvider: null,
      },
    });

    const remainingCredentials = await prisma.tenantProviderCredential.findMany({
      where: {
        tenantId,
        provider: { not: provider },
        status: 'active',
      },
    });

    if (remainingCredentials.length === 0) {
      await prisma.tenantSettings.update({
        where: { tenantId },
        data: { byoaEnabled: false },
      });
    }
  }

  await prisma.tenantProviderCredential.delete({
    where: {
      tenantId_provider: {
        tenantId,
        provider,
      },
    },
  });

  logger.info('Credential revoked', { tenantId, provider });
}

export async function isCredentialExpired(
  tenantId: string,
  provider: string
): Promise<boolean> {
  const credential = await prisma.tenantProviderCredential.findUnique({
    where: {
      tenantId_provider: {
        tenantId,
        provider,
      },
    },
  });

  if (!credential) {
    return true;
  }

  if (!credential.tokenExpiresAt) {
    return false;
  }

  return credential.tokenExpiresAt < new Date();
}

export async function updateCredentialStatus(
  tenantId: string,
  provider: string,
  status: 'active' | 'expired' | 'revoked' | 'error'
): Promise<void> {
  await prisma.tenantProviderCredential.update({
    where: {
      tenantId_provider: {
        tenantId,
        provider,
      },
    },
    data: { status },
  });
}
