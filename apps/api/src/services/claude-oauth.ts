import { createLogger } from '@agentworks/shared';
import { getCredential } from './credential-vault.js';

const logger = createLogger('api:byoa-providers');

// BYOA Provider Configuration
// Note: Claude Code OAuth has been removed per Anthropic TOS
// Users should use standard API key authentication for all providers

export const SUPPORTED_BYOA_PROVIDERS = [
  {
    id: 'anthropic',
    name: 'Anthropic API',
    description: 'Bring your own Anthropic API key (pay-as-you-go)',
    authType: 'api_key' as const,
    features: [
      'Use your own API credits',
      'Direct billing from Anthropic',
      'Access to all Claude models',
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Bring your own OpenAI API key',
    authType: 'api_key' as const,
    features: [
      'Use your own API credits',
      'Direct billing from OpenAI',
      'Access to GPT-4, GPT-4o',
    ],
  },
  {
    id: 'google',
    name: 'Google AI',
    description: 'Bring your own Google AI API key',
    authType: 'api_key' as const,
    features: [
      'Use your own API credits',
      'Direct billing from Google',
      'Access to Gemini models',
    ],
  },
];

// Test connection for API key providers
export async function testProviderConnection(tenantId: string, provider: string): Promise<{
  connected: boolean;
  error?: string;
}> {
  const credential = await getCredential(tenantId, provider);

  if (!credential) {
    return { connected: false, error: `No ${provider} credential found` };
  }

  // For API key providers, we just verify the credential exists
  // Actual API validation happens on first use
  return { connected: true };
}
