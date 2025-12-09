import type { VideoOptions, VideoResult, VideoProviderName } from '../../types.js';
import * as falVideo from './fal-video.js';

export interface VideoProvider {
  generateVideo(prompt: string, options?: VideoOptions, model?: string): Promise<{ jobId: string; estimatedCost: number }>;
  imageToVideo?(imageUrl: string, prompt: string, options?: VideoOptions, model?: string): Promise<{ jobId: string; estimatedCost: number }>;
  getVideoStatus(jobId: string, model?: string): Promise<{ status: string; result?: VideoResult }>;
  supportedModels: string[];
}

const providers: Record<VideoProviderName, VideoProvider> = {
  'fal-video': {
    generateVideo: falVideo.generateVideo,
    imageToVideo: falVideo.imageToVideo,
    getVideoStatus: falVideo.getVideoStatus,
    supportedModels: falVideo.SUPPORTED_MODELS,
  },
  runway: {
    generateVideo: async () => {
      throw new Error('Runway provider not yet implemented');
    },
    getVideoStatus: async () => {
      throw new Error('Runway provider not yet implemented');
    },
    supportedModels: ['gen3-alpha', 'gen3-alpha-turbo'],
  },
  pika: {
    generateVideo: async () => {
      throw new Error('Pika provider not yet implemented');
    },
    getVideoStatus: async () => {
      throw new Error('Pika provider not yet implemented');
    },
    supportedModels: ['pika-2.0'],
  },
  kling: {
    generateVideo: falVideo.generateVideo,
    imageToVideo: falVideo.imageToVideo,
    getVideoStatus: falVideo.getVideoStatus,
    supportedModels: ['fal-ai/kling-video/v2/master/image-to-video'],
  },
  veo: {
    generateVideo: falVideo.generateVideo,
    imageToVideo: falVideo.imageToVideo,
    getVideoStatus: falVideo.getVideoStatus,
    supportedModels: ['fal-ai/veo2/image-to-video', 'fal-ai/veo3/fast'],
  },
  sora: {
    generateVideo: async () => {
      throw new Error('Sora API not yet publicly available');
    },
    getVideoStatus: async () => {
      throw new Error('Sora API not yet publicly available');
    },
    supportedModels: ['sora-2'],
  },
};

export function getVideoProvider(name: VideoProviderName): VideoProvider {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown video provider: ${name}`);
  }
  return provider;
}

export async function generateVideo(
  provider: VideoProviderName,
  prompt: string,
  options?: VideoOptions,
  model?: string
): Promise<{ jobId: string; estimatedCost: number }> {
  return getVideoProvider(provider).generateVideo(prompt, options, model);
}

export async function getVideoStatus(
  provider: VideoProviderName,
  jobId: string,
  model?: string
): Promise<{ status: string; result?: VideoResult }> {
  return getVideoProvider(provider).getVideoStatus(jobId, model);
}

export function getAllVideoProviders(): VideoProviderName[] {
  return Object.keys(providers) as VideoProviderName[];
}

export const DEFAULT_MODELS: Record<VideoProviderName, string> = {
  'fal-video': 'fal-ai/wan-i2v',
  runway: 'gen3-alpha',
  pika: 'pika-2.0',
  kling: 'fal-ai/kling-video/v2/master/image-to-video',
  veo: 'fal-ai/veo2/image-to-video',
  sora: 'sora-2',
};

export { falVideo };
