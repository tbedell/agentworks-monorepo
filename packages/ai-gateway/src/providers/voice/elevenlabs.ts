import type { VoiceOptions, VoiceResult } from '../../types.js';
import { getProviderApiKey } from '../../utils/secrets.js';
import { PROVIDER_PRICING, calculateVoiceCost } from '../../utils/billing.js';

const API_BASE = 'https://api.elevenlabs.io/v1';

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
}

async function getHeaders(): Promise<Record<string, string>> {
  const apiKey = await getProviderApiKey('elevenlabs');
  return {
    'xi-api-key': apiKey,
    'Content-Type': 'application/json',
  };
}

export async function listVoices(): Promise<ElevenLabsVoice[]> {
  const headers = await getHeaders();
  
  const response = await fetch(`${API_BASE}/voices`, { headers });
  
  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.statusText}`);
  }
  
  const data = await response.json() as { voices: ElevenLabsVoice[] };
  return data.voices;
}

export async function textToSpeech(
  text: string,
  options: VoiceOptions
): Promise<VoiceResult> {
  const headers = await getHeaders();
  const model = 'eleven_multilingual_v2';
  
  const response = await fetch(
    `${API_BASE}/text-to-speech/${options.voiceId}`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: {
          stability: options.stability ?? 0.5,
          similarity_boost: options.similarityBoost ?? 0.75,
          style: options.style ?? 0,
          use_speaker_boost: options.speakerBoost ?? true,
        },
      }),
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${error}`);
  }
  
  const audioBuffer = await response.arrayBuffer();
  const base64Audio = Buffer.from(audioBuffer).toString('base64');
  const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
  
  const estimatedDuration = text.length / 15;
  
  const pricing = PROVIDER_PRICING.elevenlabs[model];
  const cost = calculateVoiceCost(text.length, pricing);
  
  return {
    audioUrl,
    duration: estimatedDuration,
    cost,
  };
}

export async function* streamTextToSpeech(
  text: string,
  options: VoiceOptions
): AsyncGenerator<ArrayBuffer> {
  const headers = await getHeaders();
  
  const response = await fetch(
    `${API_BASE}/text-to-speech/${options.voiceId}/stream`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: options.stability ?? 0.5,
          similarity_boost: options.similarityBoost ?? 0.75,
          style: options.style ?? 0,
          use_speaker_boost: options.speakerBoost ?? true,
        },
      }),
    }
  );
  
  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.statusText}`);
  }
  
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield value.buffer;
  }
}

export async function cloneVoice(
  name: string,
  description: string,
  audioFiles: Buffer[]
): Promise<string> {
  const apiKey = await getProviderApiKey('elevenlabs');
  
  const formData = new FormData();
  formData.append('name', name);
  formData.append('description', description);
  
  audioFiles.forEach((file, index) => {
    const blob = new Blob([file], { type: 'audio/mpeg' });
    formData.append('files', blob, `sample_${index}.mp3`);
  });
  
  const response = await fetch(`${API_BASE}/voices/add`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
    },
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`Voice cloning failed: ${response.statusText}`);
  }
  
  const data = await response.json() as { voice_id: string };
  return data.voice_id;
}

export const DEFAULT_VOICES = {
  rachel: '21m00Tcm4TlvDq8ikWAM',
  drew: '29vD33N1CtxCmqQRPOHJ',
  clyde: '2EiwWnXFnvU5JabPnv8n',
  paul: '5Q0t7uMcjvnagumLfvZi',
  domi: 'AZnzlk1XvdvUeBnXmlld',
};

export const SUPPORTED_MODELS = [
  'eleven_multilingual_v2',
  'eleven_turbo_v2_5',
  'eleven_monolingual_v1',
];
