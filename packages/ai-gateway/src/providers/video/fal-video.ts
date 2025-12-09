import type { VideoOptions, VideoResult } from '../../types.js';
import { getProviderApiKey } from '../../utils/secrets.js';
import { PROVIDER_PRICING, calculateVideoCost } from '../../utils/billing.js';

const API_BASE = 'https://queue.fal.run';

async function getHeaders(): Promise<Record<string, string>> {
  const apiKey = await getProviderApiKey('fal');
  return {
    Authorization: `Key ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

interface FalVideoResponse {
  video: {
    url: string;
    content_type: string;
    file_name: string;
    file_size: number;
  };
}

export async function generateVideo(
  prompt: string,
  options: VideoOptions = {},
  model: string = 'fal-ai/wan-i2v'
): Promise<{ jobId: string; estimatedCost: number }> {
  const headers = await getHeaders();
  
  const duration = options.duration || 5;
  
  const body: Record<string, unknown> = {
    prompt,
    num_frames: duration * (options.fps || 24),
  };
  
  if (options.aspectRatio) {
    const [w, h] = options.aspectRatio.split(':').map(Number);
    body.aspect_ratio = `${w}:${h}`;
  }
  
  const response = await fetch(`${API_BASE}/${model}`, {
    method: 'POST',
    headers: {
      ...headers,
      'X-Fal-Queue-Mode': 'async',
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`fal.ai video API error: ${error}`);
  }
  
  const data = await response.json() as { request_id: string };
  
  const modelKey = model.includes('veo') ? (model.includes('3') ? 'veo3' : 'veo2')
    : model.includes('kling') ? 'kling-2-master'
    : 'wan-2.1';
  
  const pricing = PROVIDER_PRICING['fal-video'][modelKey];
  const estimatedCost = calculateVideoCost(duration, pricing);
  
  return {
    jobId: data.request_id,
    estimatedCost,
  };
}

export async function getVideoStatus(
  jobId: string,
  model: string = 'fal-ai/wan-i2v'
): Promise<{ status: string; result?: VideoResult }> {
  const headers = await getHeaders();
  
  const response = await fetch(
    `${API_BASE}/${model}/requests/${jobId}/status`,
    { headers }
  );
  
  if (!response.ok) {
    throw new Error(`fal.ai video API error: ${response.statusText}`);
  }
  
  const data = await response.json() as { status: string; response?: { video: { url: string } } };
  
  if (data.status === 'COMPLETED' && data.response) {
    const video = data.response.video;
    const duration = 5;
    
    const modelKey = model.includes('veo') ? 'veo2' : 'wan-2.1';
    const pricing = PROVIDER_PRICING['fal-video'][modelKey];
    const cost = calculateVideoCost(duration, pricing);
    
    return {
      status: 'completed',
      result: {
        url: video.url,
        duration,
        resolution: '720p',
        cost,
        jobId,
      },
    };
  }
  
  return { status: data.status.toLowerCase() };
}

export async function imageToVideo(
  imageUrl: string,
  prompt: string,
  options: VideoOptions = {},
  model: string = 'fal-ai/wan-i2v'
): Promise<{ jobId: string; estimatedCost: number }> {
  const headers = await getHeaders();
  const duration = options.duration || 5;
  
  const response = await fetch(`${API_BASE}/${model}`, {
    method: 'POST',
    headers: {
      ...headers,
      'X-Fal-Queue-Mode': 'async',
    },
    body: JSON.stringify({
      image_url: imageUrl,
      prompt,
      num_frames: duration * (options.fps || 24),
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`fal.ai video API error: ${error}`);
  }
  
  const data = await response.json() as { request_id: string };
  
  const modelKey = model.includes('veo') ? 'veo2' : 'wan-2.1';
  const pricing = PROVIDER_PRICING['fal-video'][modelKey];
  const estimatedCost = calculateVideoCost(duration, pricing);
  
  return {
    jobId: data.request_id,
    estimatedCost,
  };
}

export const SUPPORTED_MODELS = [
  'fal-ai/wan-i2v',
  'fal-ai/veo2/image-to-video',
  'fal-ai/veo3/fast',
  'fal-ai/kling-video/v2/master/image-to-video',
  'fal-ai/minimax-video-01/image-to-video',
];

export const MODEL_INFO = {
  'fal-ai/wan-i2v': {
    name: 'WAN 2.1',
    description: 'Fast and affordable video generation',
    costPerSecond: 0.04,
  },
  'fal-ai/veo2/image-to-video': {
    name: 'Google Veo 2',
    description: 'High quality video generation',
    costPerSecond: 0.50,
  },
  'fal-ai/veo3/fast': {
    name: 'Google Veo 3 Fast',
    description: 'Fastest Veo with audio',
    costPerSecond: 0.60,
  },
  'fal-ai/kling-video/v2/master/image-to-video': {
    name: 'Kling 2 Master',
    description: 'Professional quality video',
    costPerSecond: 0.28,
  },
};
