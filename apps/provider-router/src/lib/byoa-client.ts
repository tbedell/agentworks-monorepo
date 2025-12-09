import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { createLogger, type ProviderRequest, type ProviderResponse } from '@agentworks/shared';

const logger = createLogger('provider-router:byoa-client');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3010';

export interface BYOACredential {
  provider: string;
  accessToken: string;
  subscriptionTier?: string;
}

export async function getBYOACredential(
  tenantId: string,
  agentName?: string
): Promise<BYOACredential | null> {
  try {
    const endpoint = agentName
      ? `${API_BASE_URL}/api/internal/byoa/credential/${tenantId}/${agentName}`
      : `${API_BASE_URL}/api/internal/byoa/credential/${tenantId}`;

    const response = await fetch(endpoint, {
      headers: {
        'X-Internal-Key': process.env.INTERNAL_API_KEY || 'internal-key',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.credential || null;
  } catch (error) {
    logger.warn('Failed to fetch BYOA credential', { tenantId, agentName, error });
    return null;
  }
}

export async function executeWithBYOA(
  request: ProviderRequest,
  credential: BYOACredential
): Promise<ProviderResponse> {
  logger.info('Executing request with BYOA credential', {
    provider: credential.provider,
    model: request.model,
    subscriptionTier: credential.subscriptionTier,
    workspaceId: request.workspaceId,
  });

  switch (credential.provider) {
    case 'anthropic':
      return executeAnthropicBYOA(request, credential);
    case 'openai':
      return executeOpenAIBYOA(request, credential);
    case 'google':
      return executeGoogleBYOA(request, credential);
    default:
      throw new Error(`Unsupported BYOA provider: ${credential.provider}`);
  }
}

async function executeAnthropicBYOA(
  request: ProviderRequest,
  credential: BYOACredential
): Promise<ProviderResponse> {
  const client = new Anthropic({
    apiKey: credential.accessToken,
  });

  const systemMessage = request.messages.find(m => m.role === 'system');
  const userMessages = request.messages.filter(m => m.role !== 'system');

  const completion = await client.messages.create({
    model: request.model,
    max_tokens: request.maxTokens || 4000,
    temperature: request.temperature || 0.7,
    system: systemMessage?.content,
    messages: userMessages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
  });

  const inputTokens = completion.usage.input_tokens;
  const outputTokens = completion.usage.output_tokens;

  const content = completion.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('');

  return {
    content,
    usage: {
      inputTokens,
      outputTokens,
      cost: 0,
      price: 0,
    },
    model: request.model,
    provider: 'anthropic',
    byoa: true,
  };
}

async function executeOpenAIBYOA(
  request: ProviderRequest,
  credential: BYOACredential
): Promise<ProviderResponse> {
  const client = new OpenAI({
    apiKey: credential.accessToken,
  });

  const completion = await client.chat.completions.create({
    model: request.model,
    messages: request.messages,
    temperature: request.temperature || 0.7,
    max_tokens: request.maxTokens || 4000,
    stream: false,
  });

  const inputTokens = completion.usage?.prompt_tokens || 0;
  const outputTokens = completion.usage?.completion_tokens || 0;

  return {
    content: completion.choices[0]?.message?.content || '',
    usage: {
      inputTokens,
      outputTokens,
      cost: 0,
      price: 0,
    },
    model: request.model,
    provider: 'openai',
    byoa: true,
  };
}

async function executeGoogleBYOA(
  request: ProviderRequest,
  credential: BYOACredential
): Promise<ProviderResponse> {
  // Google AI API using REST endpoint
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${request.model}:generateContent?key=${credential.accessToken}`;

  const systemMessage = request.messages.find(m => m.role === 'system');
  const userMessages = request.messages.filter(m => m.role !== 'system');

  const contents = userMessages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const body = {
    contents,
    systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
    generationConfig: {
      temperature: request.temperature || 0.7,
      maxOutputTokens: request.maxTokens || 4000,
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google AI API error: ${error}`);
  }

  const result = await response.json();
  const content = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const inputTokens = result.usageMetadata?.promptTokenCount || 0;
  const outputTokens = result.usageMetadata?.candidatesTokenCount || 0;

  return {
    content,
    usage: {
      inputTokens,
      outputTokens,
      cost: 0,
      price: 0,
    },
    model: request.model,
    provider: 'google',
    byoa: true,
  };
}

export function isBYOARequest(request: ProviderRequest): boolean {
  return !!(request as any).useBYOA || !!(request as any).byoaCredential;
}
