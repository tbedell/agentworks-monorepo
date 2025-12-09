import type { ImageOptions, ImageResult, ImageProviderName } from '../../types.js';
import * as fal from './fal.js';
import * as stability from './stability.js';

export interface ImageProvider {
  generateImage(prompt: string, options?: ImageOptions, model?: string): Promise<ImageResult>;
  imageToImage?(image: Buffer, prompt: string, options?: ImageOptions): Promise<ImageResult>;
  upscale?(image: Buffer, prompt?: string): Promise<ImageResult>;
  supportedModels: string[];
}

const providers: Record<ImageProviderName, ImageProvider> = {
  fal: {
    generateImage: fal.generateImage,
    supportedModels: fal.SUPPORTED_MODELS,
  },
  stability: {
    generateImage: stability.generateImage,
    imageToImage: stability.imageToImage,
    upscale: stability.upscaleImage,
    supportedModels: stability.SUPPORTED_MODELS,
  },
  leonardo: {
    generateImage: async () => {
      throw new Error('Leonardo provider not yet implemented');
    },
    supportedModels: [],
  },
  replicate: {
    generateImage: async () => {
      throw new Error('Replicate provider not yet implemented');
    },
    supportedModels: [],
  },
  dalle: {
    generateImage: async () => {
      throw new Error('DALL-E provider not yet implemented');
    },
    supportedModels: ['dall-e-3', 'dall-e-3-hd'],
  },
};

export function getImageProvider(name: ImageProviderName): ImageProvider {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown image provider: ${name}`);
  }
  return provider;
}

export async function generateImage(
  provider: ImageProviderName,
  prompt: string,
  options?: ImageOptions,
  model?: string
): Promise<ImageResult> {
  return getImageProvider(provider).generateImage(prompt, options, model);
}

export function getAllImageProviders(): ImageProviderName[] {
  return Object.keys(providers) as ImageProviderName[];
}

export const DEFAULT_MODELS: Record<ImageProviderName, string> = {
  fal: 'fal-ai/flux/schnell',
  stability: 'sd3.5-large',
  leonardo: 'leonardo-diffusion-xl',
  replicate: 'stability-ai/sdxl',
  dalle: 'dall-e-3',
};

export { fal, stability };
