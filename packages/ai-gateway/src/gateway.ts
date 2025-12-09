import type {
  Message,
  LLMOptions,
  LLMResponse,
  StreamToken,
  LLMProviderName,
  VoiceProviderName,
  VoiceOptions,
  VoiceResult,
  ImageProviderName,
  ImageOptions,
  ImageResult,
  VideoProviderName,
  VideoOptions,
  VideoResult,
  GatewayConfig,
  UsageRecord,
} from './types.js';
import * as llmProviders from './providers/llm/index.js';
import * as voiceProviders from './providers/voice/index.js';
import * as imageProviders from './providers/image/index.js';
import * as videoProviders from './providers/video/index.js';
import { applyBillingMarkup } from './utils/billing.js';

export interface GatewayOptions {
  config?: Partial<GatewayConfig>;
  onUsage?: (record: UsageRecord) => void | Promise<void>;
}

export class AIGateway {
  private config: GatewayConfig;
  private onUsage?: (record: UsageRecord) => void | Promise<void>;

  constructor(options: GatewayOptions = {}) {
    this.config = {
      defaultLLM: options.config?.defaultLLM ?? 'anthropic',
      defaultLLMModel: options.config?.defaultLLMModel ?? 'claude-3-5-sonnet-20241022',
      defaultVoice: options.config?.defaultVoice ?? 'elevenlabs',
      defaultImage: options.config?.defaultImage ?? 'fal',
      defaultVideo: options.config?.defaultVideo ?? 'fal-video',
      billingMarkup: options.config?.billingMarkup ?? 5.0,
      billingIncrement: options.config?.billingIncrement ?? 0.25,
    };
    this.onUsage = options.onUsage;
  }

  private async trackUsage(record: Omit<UsageRecord, 'billedAmount' | 'timestamp'>): Promise<UsageRecord> {
    const billing = applyBillingMarkup(
      record.providerCost,
      this.config.billingMarkup,
      this.config.billingIncrement
    );

    const fullRecord: UsageRecord = {
      ...record,
      billedAmount: billing.billedAmount,
      timestamp: new Date(),
    };

    if (this.onUsage) {
      await this.onUsage(fullRecord);
    }

    return fullRecord;
  }

  async chat(
    messages: Message[],
    options: LLMOptions & { provider?: LLMProviderName; workspaceId?: string; projectId?: string; agentId?: string } = {}
  ): Promise<Omit<LLMResponse, 'usage'> & { usage: UsageRecord }> {
    const provider = options.provider ?? this.config.defaultLLM;
    const model = options.model ?? this.config.defaultLLMModel;

    const llmProvider = llmProviders.getLLMProvider(provider);
    const response = await llmProvider.chat(messages, { ...options, model });

    const usageRecord = await this.trackUsage({
      provider,
      model: response.model,
      operation: 'chat',
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      providerCost: response.cost,
      workspaceId: options.workspaceId,
      projectId: options.projectId,
      agentId: options.agentId,
    });

    return { 
      content: response.content,
      toolCalls: response.toolCalls,
      model: response.model,
      provider: response.provider,
      cost: response.cost,
      usage: usageRecord,
    };
  }

  async *streamChat(
    messages: Message[],
    options: LLMOptions & { provider?: LLMProviderName; workspaceId?: string; projectId?: string; agentId?: string } = {}
  ): AsyncGenerator<StreamToken | { usage: UsageRecord }> {
    const provider = options.provider ?? this.config.defaultLLM;
    const model = options.model ?? this.config.defaultLLMModel;

    const llmProvider = llmProviders.getLLMProvider(provider);
    const stream = llmProvider.streamChat(messages, { ...options, model });

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let actualModel = model || '';
    let providerCost = 0;

    for await (const token of stream) {
      yield token;

      if (token.usage) {
        totalInputTokens = token.usage.inputTokens || totalInputTokens;
        totalOutputTokens = token.usage.outputTokens || totalOutputTokens;
      }
      if (token.model) {
        actualModel = token.model;
      }
    }

    const usageRecord = await this.trackUsage({
      provider,
      model: actualModel,
      operation: 'stream_chat',
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      providerCost,
      workspaceId: options.workspaceId,
      projectId: options.projectId,
      agentId: options.agentId,
    });

    yield { usage: usageRecord };
  }

  async textToSpeech(
    text: string,
    options: Partial<VoiceOptions> & { provider?: VoiceProviderName; model?: string; workspaceId?: string; projectId?: string; agentId?: string } = {}
  ): Promise<VoiceResult & { usage: UsageRecord }> {
    const provider = options.provider ?? this.config.defaultVoice;
    const voiceId = options.voiceId || 'default';

    const voiceProvider = voiceProviders.getVoiceProvider(provider);
    const result = await voiceProvider.textToSpeech(text, { ...options, voiceId } as VoiceOptions);

    const usageRecord = await this.trackUsage({
      provider,
      model: options.model || 'eleven_multilingual_v2',
      operation: 'text_to_speech',
      providerCost: result.cost,
      metadata: { characters: text.length, duration: result.duration },
      workspaceId: options.workspaceId,
      projectId: options.projectId,
      agentId: options.agentId,
    });

    return { ...result, usage: usageRecord };
  }

  async *streamTextToSpeech(
    text: string,
    options: Partial<VoiceOptions> & { provider?: VoiceProviderName } = {}
  ): AsyncGenerator<ArrayBuffer> {
    const provider = options.provider ?? this.config.defaultVoice;
    const voiceId = options.voiceId || 'default';

    const voiceProvider = voiceProviders.getVoiceProvider(provider);
    if (!voiceProvider.streamTextToSpeech) {
      throw new Error(`Provider ${provider} does not support streaming TTS`);
    }

    yield* voiceProvider.streamTextToSpeech(text, { ...options, voiceId } as VoiceOptions);
  }

  async generateImage(
    prompt: string,
    options: ImageOptions & { provider?: ImageProviderName; model?: string; workspaceId?: string; projectId?: string; agentId?: string } = {}
  ): Promise<ImageResult & { usage: UsageRecord }> {
    const provider = options.provider ?? this.config.defaultImage;
    const model = options.model;

    const imageProvider = imageProviders.getImageProvider(provider);
    const result = await imageProvider.generateImage(prompt, options, model);

    const usageRecord = await this.trackUsage({
      provider,
      model: model || imageProviders.DEFAULT_MODELS[provider],
      operation: 'generate_image',
      providerCost: result.cost,
      metadata: { width: result.width, height: result.height },
      workspaceId: options.workspaceId,
      projectId: options.projectId,
      agentId: options.agentId,
    });

    return { ...result, usage: usageRecord };
  }

  async generateVideo(
    prompt: string,
    options: VideoOptions & { provider?: VideoProviderName; model?: string; workspaceId?: string; projectId?: string; agentId?: string } = {}
  ): Promise<{ jobId: string; estimatedCost: number; provider: VideoProviderName; model: string }> {
    const provider = options.provider ?? this.config.defaultVideo;
    const model = options.model || videoProviders.DEFAULT_MODELS[provider];

    const videoProvider = videoProviders.getVideoProvider(provider);
    const result = await videoProvider.generateVideo(prompt, options, model);

    return { ...result, provider, model };
  }

  async imageToVideo(
    imageUrl: string,
    prompt: string,
    options: VideoOptions & { provider?: VideoProviderName; model?: string; workspaceId?: string; projectId?: string; agentId?: string } = {}
  ): Promise<{ jobId: string; estimatedCost: number; provider: VideoProviderName; model: string }> {
    const provider = options.provider ?? this.config.defaultVideo;
    const model = options.model || videoProviders.DEFAULT_MODELS[provider];

    const videoProvider = videoProviders.getVideoProvider(provider);
    if (!videoProvider.imageToVideo) {
      throw new Error(`Provider ${provider} does not support image-to-video`);
    }

    const result = await videoProvider.imageToVideo(imageUrl, prompt, options, model);

    return { ...result, provider, model };
  }

  async getVideoStatus(
    jobId: string,
    provider: VideoProviderName,
    model?: string
  ): Promise<{ status: string; result?: VideoResult & { usage?: UsageRecord } }> {
    const videoProvider = videoProviders.getVideoProvider(provider);
    const statusResult = await videoProvider.getVideoStatus(jobId, model);

    if (statusResult.status === 'completed' && statusResult.result) {
      const usageRecord = await this.trackUsage({
        provider,
        model: model || videoProviders.DEFAULT_MODELS[provider],
        operation: 'generate_video',
        providerCost: statusResult.result.cost,
        metadata: {
          duration: statusResult.result.duration,
          resolution: statusResult.result.resolution,
        },
      });

      return {
        status: statusResult.status,
        result: { ...statusResult.result, usage: usageRecord },
      };
    }

    return statusResult;
  }

  getAvailableProviders() {
    return {
      llm: llmProviders.getAllLLMProviders(),
      voice: voiceProviders.getAllVoiceProviders(),
      image: imageProviders.getAllImageProviders(),
      video: videoProviders.getAllVideoProviders(),
    };
  }

  getProviderModels(type: 'llm' | 'voice' | 'image' | 'video', provider: string) {
    switch (type) {
      case 'llm':
        return llmProviders.getLLMProvider(provider as LLMProviderName).supportedModels;
      case 'voice':
        return voiceProviders.getVoiceProvider(provider as VoiceProviderName).supportedModels;
      case 'image':
        return imageProviders.getImageProvider(provider as ImageProviderName).supportedModels;
      case 'video':
        return videoProviders.getVideoProvider(provider as VideoProviderName).supportedModels;
      default:
        return [];
    }
  }
}

export function createGateway(options?: GatewayOptions): AIGateway {
  return new AIGateway(options);
}
