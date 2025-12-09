import { GoogleGenerativeAI } from '@google/generative-ai';
import type { 
  Message, 
  LLMOptions, 
  StreamToken, 
  LLMResponse, 
  ToolDefinition,
  ToolCall 
} from '../../types.js';
import { getProviderApiKey } from '../../utils/secrets.js';
import { calculateLLMCost, PROVIDER_PRICING } from '../../utils/billing.js';

let clientInstance: GoogleGenerativeAI | null = null;

async function getClient(): Promise<GoogleGenerativeAI> {
  if (!clientInstance) {
    const apiKey = await getProviderApiKey('google');
    clientInstance = new GoogleGenerativeAI(apiKey);
  }
  return clientInstance;
}

interface GoogleContent {
  role: 'user' | 'model';
  parts: { text: string }[];
}

function convertMessages(messages: Message[]): { systemInstruction: string; history: GoogleContent[] } {
  let systemInstruction = '';
  const history: GoogleContent[] = [];
  
  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = msg.content;
    } else if (msg.role === 'user') {
      history.push({
        role: 'user',
        parts: [{ text: msg.content }],
      });
    } else if (msg.role === 'assistant') {
      history.push({
        role: 'model',
        parts: [{ text: msg.content }],
      });
    } else if (msg.role === 'tool') {
      history.push({
        role: 'user',
        parts: [{ text: `Tool result: ${msg.content}` }],
      });
    }
  }
  
  return { systemInstruction, history };
}

// Convert JSON Schema type to Google's schema type
function convertSchemaType(type: string | string[] | undefined): string {
  if (!type) return 'STRING';
  const t = Array.isArray(type) ? type[0] : type;
  switch (t.toLowerCase()) {
    case 'string': return 'STRING';
    case 'number': return 'NUMBER';
    case 'integer': return 'INTEGER';
    case 'boolean': return 'BOOLEAN';
    case 'array': return 'ARRAY';
    case 'object': return 'OBJECT';
    default: return 'STRING';
  }
}

// Recursively convert JSON Schema to Google's schema format
function convertSchemaProperty(prop: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {
    type: convertSchemaType(prop.type as string | string[] | undefined),
  };

  if (prop.description) {
    result.description = prop.description;
  }

  if (prop.enum) {
    result.enum = prop.enum;
  }

  // Handle nested object properties
  if (prop.properties && typeof prop.properties === 'object') {
    const props = prop.properties as Record<string, Record<string, unknown>>;
    result.properties = {};
    for (const [key, value] of Object.entries(props)) {
      (result.properties as Record<string, unknown>)[key] = convertSchemaProperty(value);
    }
  }

  // Handle array items
  if (prop.items && typeof prop.items === 'object') {
    result.items = convertSchemaProperty(prop.items as Record<string, unknown>);
  }

  // Handle required fields (Google wants these at the schema level, not as a separate array)
  if (prop.required && Array.isArray(prop.required)) {
    result.required = prop.required;
  }

  return result;
}

// Convert tool parameters from JSON Schema to Google's format
function convertToolParameters(params: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {
    type: 'OBJECT',
  };

  if (params.properties && typeof params.properties === 'object') {
    const props = params.properties as Record<string, Record<string, unknown>>;
    result.properties = {};
    for (const [key, value] of Object.entries(props)) {
      (result.properties as Record<string, unknown>)[key] = convertSchemaProperty(value);
    }
  }

  if (params.required && Array.isArray(params.required)) {
    result.required = params.required;
  }

  return result;
}

function convertTools(tools?: ToolDefinition[]): unknown[] | undefined {
  if (!tools || tools.length === 0) return undefined;

  return [{
    functionDeclarations: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: convertToolParameters(tool.parameters),
    })),
  }];
}

export async function* streamChat(
  messages: Message[],
  options: LLMOptions = {}
): AsyncGenerator<StreamToken> {
  const client = await getClient();
  const modelName = options.model || 'gemini-1.5-pro';
  const { systemInstruction, history } = convertMessages(messages);
  
  try {
    const model = client.getGenerativeModel({
      model: modelName,
      systemInstruction: systemInstruction || undefined,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 4096,
        stopSequences: options.stopSequences,
      },
      tools: convertTools(options.tools) as any,
    });

    const lastMessage = history.pop();
    if (!lastMessage) {
      yield { type: 'error', error: 'No messages provided' };
      return;
    }

    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(lastMessage.parts[0].text);

    let outputTokens = 0;
    let inputTokens = 0;

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        outputTokens += text.length / 4;
        yield { type: 'token', content: text };
      }

      const functionCalls = chunk.functionCalls();
      if (functionCalls) {
        for (const fc of functionCalls) {
          yield {
            type: 'tool_call',
            toolCall: {
              id: `fc_${Date.now()}`,
              name: fc.name,
              arguments: fc.args as Record<string, unknown>,
            },
          };
        }
      }
    }

    const response = await result.response;
    if (response.usageMetadata) {
      inputTokens = response.usageMetadata.promptTokenCount || 0;
      outputTokens = response.usageMetadata.candidatesTokenCount || 0;
    }

    yield {
      type: 'done',
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    yield { type: 'error', error: message };
  }
}

export async function chat(
  messages: Message[],
  options: LLMOptions = {}
): Promise<LLMResponse> {
  const client = await getClient();
  const modelName = options.model || 'gemini-1.5-pro';
  const { systemInstruction, history } = convertMessages(messages);
  
  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction: systemInstruction || undefined,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 4096,
      stopSequences: options.stopSequences,
    },
    tools: convertTools(options.tools) as any,
  });

  const lastMessage = history.pop();
  if (!lastMessage) {
    throw new Error('No messages provided');
  }

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastMessage.parts[0].text);

  const response = result.response;
  const text = response.text();
  const toolCalls: ToolCall[] = [];

  const functionCalls = response.functionCalls();
  if (functionCalls) {
    for (const fc of functionCalls) {
      toolCalls.push({
        id: `fc_${Date.now()}`,
        name: fc.name,
        arguments: fc.args as Record<string, unknown>,
      });
    }
  }

  const usage = {
    inputTokens: response.usageMetadata?.promptTokenCount || 0,
    outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
    totalTokens: response.usageMetadata?.totalTokenCount || 0,
  };

  const pricing = PROVIDER_PRICING.google[modelName] || PROVIDER_PRICING.google['gemini-1.5-pro'];
  const cost = calculateLLMCost(usage, pricing);

  return {
    content: text,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    usage,
    model: modelName,
    provider: 'google',
    cost,
  };
}

export const SUPPORTED_MODELS = [
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-exp',
];

export function resetClient(): void {
  clientInstance = null;
}
