import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { prisma } from '@agentworks/db';

const PROJECT_ID = process.env.GCP_PROJECT_ID || 'agentworks';

const PROVIDER_SECRET_NAMES: Record<string, string> = {
  openai: 'openai-api-key',
  anthropic: 'anthropic-api-key',
  google: 'google-ai-api-key',
  vertex: 'vertex-service-account',
  elevenlabs: 'elevenlabs-api-key',
  stability: 'stability-api-key',
  leonardo: 'leonardo-api-key',
  fal: 'fal-api-key',
  replicate: 'replicate-api-key',
  runway: 'runway-api-key',
  pika: 'pika-api-key',
};

const secretCache = new Map<string, { value: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

let secretClient: SecretManagerServiceClient | null = null;

function getSecretClient(): SecretManagerServiceClient {
  if (!secretClient) {
    secretClient = new SecretManagerServiceClient();
  }
  return secretClient;
}

/**
 * Get API key for a provider from multiple sources:
 * 1. Environment variables (e.g., OPENAI_API_KEY)
 * 2. Cache (if previously fetched)
 * 3. ProviderConfig database (Admin Panel configured keys)
 * 4. GCP Secret Manager (production secrets)
 */
export async function getProviderApiKey(provider: string): Promise<string> {
  console.log(`[AI-Gateway] Getting API key for provider: ${provider}`);

  // 1. Check environment variable first
  const envKey = `${provider.toUpperCase()}_API_KEY`;
  const envValue = process.env[envKey];
  console.log(`[AI-Gateway] Checking env var ${envKey}: ${envValue ? `found (length: ${envValue.length}, placeholder: ${envValue.includes('your-') || envValue.includes('sk-your')})` : 'not found'}`);
  // Only use env value if it's not a placeholder
  if (envValue && !envValue.includes('your-') && !envValue.includes('sk-your')) {
    console.log(`[AI-Gateway] Using API key from environment variable`);
    return envValue;
  }

  // 2. Check cache
  const cached = secretCache.get(provider);
  if (cached && cached.expiresAt > Date.now()) {
    console.log(`[AI-Gateway] Using cached API key for ${provider}`);
    return cached.value;
  }

  // 3. Check ProviderConfig database (Admin Panel keys)
  console.log(`[AI-Gateway] Querying ProviderConfig database for ${provider}...`);
  try {
    const config = await prisma.providerConfig.findUnique({
      where: { provider },
    });

    console.log(`[AI-Gateway] Database query result:`, {
      found: !!config,
      provider: config?.provider,
      apiKeyConfigured: config?.apiKeyConfigured,
      hasMetadata: !!config?.metadata,
      metadataPreview: config?.metadata ? config.metadata.substring(0, 50) + '...' : null,
    });

    if (config?.apiKeyConfigured && config.metadata) {
      const metadata = JSON.parse(config.metadata);
      console.log(`[AI-Gateway] Parsed metadata keys:`, Object.keys(metadata));
      if (metadata.apiKey) {
        console.log(`[AI-Gateway] Found API key in database metadata (length: ${metadata.apiKey.length})`);
        // Cache the database key
        secretCache.set(provider, {
          value: metadata.apiKey,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        return metadata.apiKey;
      } else {
        console.log(`[AI-Gateway] metadata.apiKey is missing or empty`);
      }
    } else {
      console.log(`[AI-Gateway] Skipping database key: apiKeyConfigured=${config?.apiKeyConfigured}, hasMetadata=${!!config?.metadata}`);
    }
  } catch (dbError) {
    console.error(`[AI-Gateway] Database query failed for ${provider}:`, dbError);
    // Continue to GCP Secret Manager fallback
  }

  // 4. Fall back to GCP Secret Manager
  console.log(`[AI-Gateway] Falling back to GCP Secret Manager for ${provider}`);
  const secretName = PROVIDER_SECRET_NAMES[provider];
  if (!secretName) {
    const error = `Unknown provider: ${provider}. No API key found in env, database, or secret manager.`;
    console.error(`[AI-Gateway] ${error}`);
    throw new Error(error);
  }

  try {
    const client = getSecretClient();
    const name = `projects/${PROJECT_ID}/secrets/${secretName}/versions/latest`;
    console.log(`[AI-Gateway] Attempting to access GCP secret: ${name}`);

    const [version] = await client.accessSecretVersion({ name });
    const payload = version.payload?.data;

    if (!payload) {
      throw new Error(`Secret ${secretName} has no payload`);
    }

    const value = typeof payload === 'string'
      ? payload
      : Buffer.from(payload).toString('utf8');

    console.log(`[AI-Gateway] Successfully retrieved key from GCP Secret Manager`);
    secretCache.set(provider, {
      value,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return value;
  } catch (error) {
    console.error(`[AI-Gateway] GCP Secret Manager failed for ${provider}:`, error);
    throw new Error(`Failed to get API key for provider: ${provider}. Check Admin Panel configuration or environment variables.`);
  }
}

export function clearSecretCache(): void {
  secretCache.clear();
}

export async function rotateSecret(provider: string): Promise<void> {
  secretCache.delete(provider);
}
