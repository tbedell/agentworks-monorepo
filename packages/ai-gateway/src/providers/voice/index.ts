import type { VoiceOptions, VoiceResult, VoiceProviderName } from '../../types.js';
import * as elevenlabs from './elevenlabs.js';

export interface VoiceProvider {
  textToSpeech(text: string, options: VoiceOptions): Promise<VoiceResult>;
  streamTextToSpeech?(text: string, options: VoiceOptions): AsyncGenerator<ArrayBuffer>;
  listVoices?(): Promise<{ id: string; name: string }[]>;
  supportedModels: string[];
}

const providers: Record<VoiceProviderName, VoiceProvider> = {
  elevenlabs: {
    textToSpeech: elevenlabs.textToSpeech,
    streamTextToSpeech: elevenlabs.streamTextToSpeech,
    listVoices: async () => {
      const voices = await elevenlabs.listVoices();
      return voices.map((v) => ({ id: v.voice_id, name: v.name }));
    },
    supportedModels: elevenlabs.SUPPORTED_MODELS,
  },
  playht: {
    textToSpeech: async () => {
      throw new Error('PlayHT provider not yet implemented');
    },
    supportedModels: [],
  },
};

export function getVoiceProvider(name: VoiceProviderName): VoiceProvider {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown voice provider: ${name}`);
  }
  return provider;
}

export async function textToSpeech(
  provider: VoiceProviderName,
  text: string,
  options: VoiceOptions
): Promise<VoiceResult> {
  return getVoiceProvider(provider).textToSpeech(text, options);
}

export function getAllVoiceProviders(): VoiceProviderName[] {
  return Object.keys(providers) as VoiceProviderName[];
}

export { elevenlabs };
