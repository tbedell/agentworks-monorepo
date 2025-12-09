import { UsageInfo, ProviderCost, DEFAULT_GATEWAY_CONFIG } from '../types.js';

export interface BillingResult {
  providerCost: number;
  billedAmount: number;
  markup: number;
}

export function calculateLLMCost(
  usage: UsageInfo,
  cost: ProviderCost
): number {
  const inputCost = (usage.inputTokens / 1000) * (cost.inputCostPer1K || 0);
  const outputCost = (usage.outputTokens / 1000) * (cost.outputCostPer1K || 0);
  return inputCost + outputCost;
}

export function calculateImageCost(
  width: number,
  height: number,
  cost: ProviderCost
): number {
  if (cost.costPerImage) {
    return cost.costPerImage;
  }
  if (cost.costPerMegapixel) {
    const megapixels = (width * height) / 1_000_000;
    return megapixels * cost.costPerMegapixel;
  }
  return 0;
}

export function calculateVideoCost(
  durationSeconds: number,
  cost: ProviderCost
): number {
  if (cost.costPerSecond) {
    return durationSeconds * cost.costPerSecond;
  }
  return 0;
}

export function calculateVoiceCost(
  characterCount: number,
  cost: ProviderCost
): number {
  if (cost.costPerCharacter) {
    return characterCount * cost.costPerCharacter;
  }
  return 0;
}

export function applyBillingMarkup(
  providerCost: number,
  markup: number = DEFAULT_GATEWAY_CONFIG.billingMarkup,
  increment: number = DEFAULT_GATEWAY_CONFIG.billingIncrement
): BillingResult {
  const rawCost = providerCost * markup;
  const billedAmount = Math.ceil(rawCost / increment) * increment;
  
  return {
    providerCost,
    billedAmount,
    markup,
  };
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export const PROVIDER_PRICING: Record<string, Record<string, ProviderCost>> = {
  openai: {
    'gpt-4o': { inputCostPer1K: 0.005, outputCostPer1K: 0.015 },
    'gpt-4o-mini': { inputCostPer1K: 0.00015, outputCostPer1K: 0.0006 },
    'gpt-4-turbo': { inputCostPer1K: 0.01, outputCostPer1K: 0.03 },
    'gpt-4': { inputCostPer1K: 0.03, outputCostPer1K: 0.06 },
    'gpt-3.5-turbo': { inputCostPer1K: 0.0005, outputCostPer1K: 0.0015 },
    'dall-e-3': { costPerImage: 0.04 },
    'dall-e-3-hd': { costPerImage: 0.08 },
  },
  anthropic: {
    'claude-sonnet-4-20250514': { inputCostPer1K: 0.003, outputCostPer1K: 0.015 },
    'claude-opus-4-20250514': { inputCostPer1K: 0.015, outputCostPer1K: 0.075 },
    'claude-3-5-sonnet-20241022': { inputCostPer1K: 0.003, outputCostPer1K: 0.015 },
    'claude-3-5-haiku-20241022': { inputCostPer1K: 0.001, outputCostPer1K: 0.005 },
    'claude-3-opus-20240229': { inputCostPer1K: 0.015, outputCostPer1K: 0.075 },
    'claude-3-haiku-20240307': { inputCostPer1K: 0.00025, outputCostPer1K: 0.00125 },
  },
  google: {
    'gemini-1.5-pro': { inputCostPer1K: 0.00125, outputCostPer1K: 0.005 },
    'gemini-1.5-flash': { inputCostPer1K: 0.000075, outputCostPer1K: 0.0003 },
    'gemini-2.0-flash': { inputCostPer1K: 0.0001, outputCostPer1K: 0.0004 },
  },
  elevenlabs: {
    'eleven_multilingual_v2': { costPerCharacter: 0.00003 },
    'eleven_turbo_v2_5': { costPerCharacter: 0.000015 },
  },
  stability: {
    'sd3.5-large': { costPerImage: 0.065 },
    'sd3.5-medium': { costPerImage: 0.035 },
    'stable-image-ultra': { costPerImage: 0.08 },
    'stable-image-core': { costPerImage: 0.03 },
  },
  fal: {
    'flux-schnell': { costPerMegapixel: 0.003 },
    'flux-dev': { costPerMegapixel: 0.025 },
    'flux-pro': { costPerMegapixel: 0.05 },
  },
  'fal-video': {
    'veo2': { costPerSecond: 0.50 },
    'veo3': { costPerSecond: 0.60 },
    'kling-2-master': { costPerSecond: 0.28 },
    'wan-2.1': { costPerSecond: 0.04 },
  },
  runway: {
    'gen3-alpha': { costPerSecond: 0.05 },
    'gen3-alpha-turbo': { costPerSecond: 0.025 },
  },
  pika: {
    'pika-2.0': { costPerSecond: 0.05 },
  },
  leonardo: {
    'leonardo-diffusion-xl': { costPerImage: 0.012 },
    'leonardo-vision-xl': { costPerImage: 0.016 },
  },
};

export function getProviderCost(
  provider: string,
  model: string
): ProviderCost | null {
  return PROVIDER_PRICING[provider]?.[model] || null;
}
