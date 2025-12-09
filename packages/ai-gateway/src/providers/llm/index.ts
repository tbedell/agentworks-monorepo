import type { 
  Message, 
  LLMOptions, 
  StreamToken, 
  LLMResponse, 
  LLMProviderName 
} from '../../types.js';
import * as openai from './openai.js';
import * as anthropic from './anthropic.js';
import * as google from './google.js';

export interface LLMProvider {
  chat(messages: Message[], options?: LLMOptions): Promise<LLMResponse>;
  streamChat(messages: Message[], options?: LLMOptions): AsyncGenerator<StreamToken>;
  supportedModels: string[];
  resetClient(): void;
}

const providers: Record<LLMProviderName, LLMProvider> = {
  openai: {
    chat: openai.chat,
    streamChat: openai.streamChat,
    supportedModels: openai.SUPPORTED_MODELS,
    resetClient: openai.resetClient,
  },
  anthropic: {
    chat: anthropic.chat,
    streamChat: anthropic.streamChat,
    supportedModels: anthropic.SUPPORTED_MODELS,
    resetClient: anthropic.resetClient,
  },
  google: {
    chat: google.chat,
    streamChat: google.streamChat,
    supportedModels: google.SUPPORTED_MODELS,
    resetClient: google.resetClient,
  },
  vertex: {
    chat: google.chat,
    streamChat: google.streamChat,
    supportedModels: google.SUPPORTED_MODELS,
    resetClient: google.resetClient,
  },
};

export function getLLMProvider(name: LLMProviderName): LLMProvider {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown LLM provider: ${name}`);
  }
  return provider;
}

export async function chat(
  provider: LLMProviderName,
  messages: Message[],
  options?: LLMOptions
): Promise<LLMResponse> {
  return getLLMProvider(provider).chat(messages, options);
}

export async function* streamChat(
  provider: LLMProviderName,
  messages: Message[],
  options?: LLMOptions
): AsyncGenerator<StreamToken> {
  yield* getLLMProvider(provider).streamChat(messages, options);
}

export function getSupportedModels(provider: LLMProviderName): string[] {
  return getLLMProvider(provider).supportedModels;
}

export function getAllProviders(): LLMProviderName[] {
  return Object.keys(providers) as LLMProviderName[];
}

export function getAllLLMProviders(): LLMProviderName[] {
  return Object.keys(providers) as LLMProviderName[];
}

export const DEFAULT_MODELS: Record<LLMProviderName, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-20241022',
  google: 'gemini-1.5-pro',
  vertex: 'gemini-1.5-pro',
};

export function getDefaultModel(provider: LLMProviderName): string {
  return DEFAULT_MODELS[provider];
}
