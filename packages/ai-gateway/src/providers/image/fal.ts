import type { ImageOptions, ImageResult } from '../../types.js';
import { getProviderApiKey } from '../../utils/secrets.js';
import { PROVIDER_PRICING, calculateImageCost } from '../../utils/billing.js';

const API_BASE = 'https://queue.fal.run';

async function getHeaders(): Promise<Record<string, string>> {
  const apiKey = await getProviderApiKey('fal');
  return {
    Authorization: `Key ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

interface FalImageResponse {
  images: Array<{
    url: string;
    width: number;
    height: number;
    content_type: string;
  }>;
  seed: number;
  prompt: string;
}

export async function generateImage(
  prompt: string,
  options: ImageOptions = {},
  model: string = 'fal-ai/flux/schnell'
): Promise<ImageResult> {
  const headers = await getHeaders();
  const width = options.width || 1024;
  const height = options.height || 1024;
  
  const response = await fetch(`${API_BASE}/${model}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt,
      image_size: {
        width,
        height,
      },
      num_images: 1,
      seed: options.seed,
      num_inference_steps: options.steps || 4,
      guidance_scale: options.guidanceScale || 3.5,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`fal.ai API error: ${error}`);
  }
  
  const data = await response.json() as FalImageResponse;
  
  if (!data.images || data.images.length === 0) {
    throw new Error('No image generated');
  }
  
  const image = data.images[0];
  
  const modelKey = model.includes('schnell') ? 'flux-schnell' 
    : model.includes('dev') ? 'flux-dev' 
    : 'flux-pro';
  const pricing = PROVIDER_PRICING.fal[modelKey];
  const cost = calculateImageCost(image.width, image.height, pricing);
  
  return {
    url: image.url,
    width: image.width,
    height: image.height,
    seed: data.seed,
    cost,
  };
}

export async function generateImageAsync(
  prompt: string,
  options: ImageOptions = {},
  model: string = 'fal-ai/flux/schnell'
): Promise<{ requestId: string }> {
  const headers = await getHeaders();
  const width = options.width || 1024;
  const height = options.height || 1024;
  
  const response = await fetch(`${API_BASE}/${model}`, {
    method: 'POST',
    headers: {
      ...headers,
      'X-Fal-Queue-Mode': 'async',
    },
    body: JSON.stringify({
      prompt,
      image_size: { width, height },
      num_images: 1,
      seed: options.seed,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`fal.ai API error: ${response.statusText}`);
  }
  
  const data = await response.json() as { request_id: string };
  return { requestId: data.request_id };
}

export async function getImageStatus(
  requestId: string,
  model: string = 'fal-ai/flux/schnell'
): Promise<{ status: string; result?: ImageResult }> {
  const headers = await getHeaders();
  
  const response = await fetch(
    `${API_BASE}/${model}/requests/${requestId}/status`,
    { headers }
  );
  
  if (!response.ok) {
    throw new Error(`fal.ai API error: ${response.statusText}`);
  }
  
  const data = await response.json() as { status: string; response?: FalImageResponse };
  
  if (data.status === 'COMPLETED' && data.response) {
    const image = data.response.images[0];
    return {
      status: 'completed',
      result: {
        url: image.url,
        width: image.width,
        height: image.height,
        seed: data.response.seed,
        cost: calculateImageCost(image.width, image.height, PROVIDER_PRICING.fal['flux-schnell']),
      },
    };
  }
  
  return { status: data.status.toLowerCase() };
}

export const SUPPORTED_MODELS = [
  'fal-ai/flux/schnell',
  'fal-ai/flux/dev',
  'fal-ai/flux-pro',
  'fal-ai/flux-realism',
  'fal-ai/stable-diffusion-v3-medium',
];

export const MODEL_INFO = {
  'fal-ai/flux/schnell': {
    name: 'FLUX.1 Schnell',
    description: 'Fastest FLUX model, 4 steps',
    costPerMegapixel: 0.003,
  },
  'fal-ai/flux/dev': {
    name: 'FLUX.1 Dev',
    description: 'High quality, more steps',
    costPerMegapixel: 0.025,
  },
  'fal-ai/flux-pro': {
    name: 'FLUX Pro',
    description: 'Best quality FLUX',
    costPerMegapixel: 0.05,
  },
};
