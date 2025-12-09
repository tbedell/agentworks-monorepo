export * from './types.js';
export * from './gateway.js';
export { applyBillingMarkup, calculateLLMCost, calculateImageCost, calculateVideoCost, PROVIDER_PRICING } from './utils/billing.js';
export { getProviderApiKey, clearSecretCache } from './utils/secrets.js';
export { UsageTracker, createUsageTracker, calculateWorkspaceBilling } from './services/usage-tracker.js';
export { SSEWriter, createSSEResponse, formatSSEMessage, parseSSEStream, getSSEHeaders } from './services/sse-handler.js';

export * as llm from './providers/llm/index.js';
export * as voice from './providers/voice/index.js';
export * as image from './providers/image/index.js';
export * as video from './providers/video/index.js';

import { createGateway, AIGateway } from './gateway.js';

let defaultGateway: AIGateway | null = null;

export function getDefaultGateway(): AIGateway {
  if (!defaultGateway) {
    defaultGateway = createGateway();
  }
  return defaultGateway;
}

export function setDefaultGateway(gateway: AIGateway): void {
  defaultGateway = gateway;
}
