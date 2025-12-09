import type { ImageOptions, ImageResult } from '../../types.js';
import { getProviderApiKey } from '../../utils/secrets.js';
import { PROVIDER_PRICING } from '../../utils/billing.js';

const API_BASE = 'https://api.stability.ai/v2beta';

async function getHeaders(): Promise<Record<string, string>> {
  const apiKey = await getProviderApiKey('stability');
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'image/*',
  };
}

export async function generateImage(
  prompt: string,
  options: ImageOptions = {},
  model: string = 'sd3.5-large'
): Promise<ImageResult> {
  const apiKey = await getProviderApiKey('stability');
  
  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('output_format', 'png');
  
  if (options.negativePrompt) {
    formData.append('negative_prompt', options.negativePrompt);
  }
  if (options.seed !== undefined) {
    formData.append('seed', options.seed.toString());
  }
  if (options.style) {
    formData.append('style_preset', options.style);
  }
  
  const aspectRatio = getAspectRatio(options.width, options.height);
  formData.append('aspect_ratio', aspectRatio);
  
  const endpoint = getEndpoint(model);
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'image/*',
    },
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Stability API error: ${error}`);
  }
  
  const imageBuffer = await response.arrayBuffer();
  const base64Image = Buffer.from(imageBuffer).toString('base64');
  const imageUrl = `data:image/png;base64,${base64Image}`;
  
  const width = options.width || 1024;
  const height = options.height || 1024;
  
  const pricing = PROVIDER_PRICING.stability[model] || PROVIDER_PRICING.stability['sd3.5-large'];
  const cost = pricing.costPerImage || 0.065;
  
  return {
    url: imageUrl,
    width,
    height,
    seed: options.seed,
    cost,
  };
}

function getEndpoint(model: string): string {
  switch (model) {
    case 'stable-image-ultra':
      return '/stable-image/generate/ultra';
    case 'stable-image-core':
      return '/stable-image/generate/core';
    case 'sd3.5-large':
    case 'sd3.5-medium':
      return '/stable-image/generate/sd3';
    default:
      return '/stable-image/generate/sd3';
  }
}

function getAspectRatio(width?: number, height?: number): string {
  if (!width || !height) return '1:1';
  
  const ratio = width / height;
  
  if (ratio > 1.7) return '16:9';
  if (ratio > 1.3) return '3:2';
  if (ratio > 1.1) return '4:3';
  if (ratio > 0.9) return '1:1';
  if (ratio > 0.7) return '3:4';
  if (ratio > 0.55) return '2:3';
  return '9:16';
}

export async function imageToImage(
  imageBuffer: Buffer,
  prompt: string,
  options: ImageOptions = {},
  strength: number = 0.7
): Promise<ImageResult> {
  const apiKey = await getProviderApiKey('stability');
  
  const formData = new FormData();
  formData.append('image', new Blob([imageBuffer]), 'image.png');
  formData.append('prompt', prompt);
  formData.append('strength', strength.toString());
  formData.append('output_format', 'png');
  
  if (options.negativePrompt) {
    formData.append('negative_prompt', options.negativePrompt);
  }
  if (options.seed !== undefined) {
    formData.append('seed', options.seed.toString());
  }
  
  const response = await fetch(`${API_BASE}/stable-image/generate/sd3`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'image/*',
    },
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Stability API error: ${error}`);
  }
  
  const outputBuffer = await response.arrayBuffer();
  const base64Image = Buffer.from(outputBuffer).toString('base64');
  const imageUrl = `data:image/png;base64,${base64Image}`;
  
  return {
    url: imageUrl,
    width: options.width || 1024,
    height: options.height || 1024,
    seed: options.seed,
    cost: 0.065,
  };
}

export async function upscaleImage(
  imageBuffer: Buffer,
  prompt?: string
): Promise<ImageResult> {
  const apiKey = await getProviderApiKey('stability');
  
  const formData = new FormData();
  formData.append('image', new Blob([imageBuffer]), 'image.png');
  formData.append('output_format', 'png');
  
  if (prompt) {
    formData.append('prompt', prompt);
  }
  
  const response = await fetch(`${API_BASE}/stable-image/upscale/creative`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'image/*',
    },
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Stability API error: ${error}`);
  }
  
  const outputBuffer = await response.arrayBuffer();
  const base64Image = Buffer.from(outputBuffer).toString('base64');
  const imageUrl = `data:image/png;base64,${base64Image}`;
  
  return {
    url: imageUrl,
    width: 2048,
    height: 2048,
    cost: 0.25,
  };
}

export const SUPPORTED_MODELS = [
  'sd3.5-large',
  'sd3.5-medium',
  'stable-image-ultra',
  'stable-image-core',
];

export const STYLE_PRESETS = [
  'anime',
  'cinematic',
  'digital-art',
  'enhance',
  'fantasy-art',
  'isometric',
  'line-art',
  'low-poly',
  'neon-punk',
  'origami',
  'photographic',
  'pixel-art',
  '3d-model',
];
