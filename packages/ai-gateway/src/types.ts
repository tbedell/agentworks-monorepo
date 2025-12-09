export type LLMProviderName = 'openai' | 'anthropic' | 'google' | 'vertex';
export type VoiceProviderName = 'elevenlabs' | 'playht';
export type ImageProviderName = 'stability' | 'leonardo' | 'fal' | 'replicate' | 'dalle';
export type VideoProviderName = 'runway' | 'pika' | 'kling' | 'veo' | 'sora' | 'fal-video';

export type ProviderType = 'llm' | 'voice' | 'image' | 'video';
export type AnyProviderName = LLMProviderName | VoiceProviderName | ImageProviderName | VideoProviderName;

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: ToolDefinition[];
  stopSequences?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface StreamToken {
  type: 'token' | 'tool_call' | 'done' | 'error';
  content?: string;
  toolCall?: ToolCall;
  error?: string;
  usage?: UsageInfo;
  model?: string;
  finishReason?: string;
}

export interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage: UsageInfo;
  model: string;
  provider: LLMProviderName;
  cost: number;
}

export interface ImageOptions {
  width?: number;
  height?: number;
  style?: string;
  negativePrompt?: string;
  seed?: number;
  steps?: number;
  guidanceScale?: number;
}

export interface ImageResult {
  url: string;
  width: number;
  height: number;
  seed?: number;
  cost: number;
}

export interface VideoOptions {
  duration?: number;
  fps?: number;
  resolution?: '480p' | '720p' | '1080p';
  aspectRatio?: '16:9' | '9:16' | '1:1';
  style?: string;
}

export interface VideoResult {
  url: string;
  duration: number;
  resolution: string;
  cost: number;
  jobId?: string;
}

export interface VoiceOptions {
  voiceId: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  speakerBoost?: boolean;
}

export interface VoiceResult {
  audioUrl: string;
  duration: number;
  cost: number;
}

export interface ProviderCost {
  inputCostPer1K?: number;
  outputCostPer1K?: number;
  costPerImage?: number;
  costPerSecond?: number;
  costPerCharacter?: number;
  costPerMegapixel?: number;
}

export interface ProviderConfig {
  name: AnyProviderName;
  type: ProviderType;
  enabled: boolean;
  models: ModelConfig[];
  rateLimitPerMinute?: number;
}

export interface ModelConfig {
  name: string;
  displayName: string;
  cost: ProviderCost;
  maxTokens?: number;
  capabilities?: string[];
}

export interface GatewayConfig {
  defaultLLM: LLMProviderName;
  defaultLLMModel: string;
  defaultImage: ImageProviderName;
  defaultVideo: VideoProviderName;
  defaultVoice: VoiceProviderName;
  billingMarkup: number;
  billingIncrement: number;
}

export const DEFAULT_GATEWAY_CONFIG: GatewayConfig = {
  defaultLLM: 'openai',
  defaultLLMModel: 'gpt-4o',
  defaultImage: 'fal',
  defaultVideo: 'fal-video',
  defaultVoice: 'elevenlabs',
  billingMarkup: 5.0,
  billingIncrement: 0.25,
};

export interface UsageRecord {
  provider: string;
  model: string;
  operation: string;
  inputTokens?: number;
  outputTokens?: number;
  providerCost: number;
  billedAmount: number;
  workspaceId?: string;
  projectId?: string;
  agentId?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
