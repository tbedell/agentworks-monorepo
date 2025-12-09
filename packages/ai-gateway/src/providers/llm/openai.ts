import OpenAI from 'openai';
import type { 
  Message, 
  LLMOptions, 
  StreamToken, 
  LLMResponse, 
  UsageInfo,
  ToolDefinition,
  ToolCall 
} from '../../types.js';
import { getProviderApiKey } from '../../utils/secrets.js';
import { calculateLLMCost, PROVIDER_PRICING } from '../../utils/billing.js';

let clientInstance: OpenAI | null = null;

async function getClient(): Promise<OpenAI> {
  if (!clientInstance) {
    const apiKey = await getProviderApiKey('openai');
    clientInstance = new OpenAI({ apiKey });
  }
  return clientInstance;
}

function convertMessages(messages: Message[]): OpenAI.ChatCompletionMessageParam[] {
  return messages.map((msg) => {
    if (msg.role === 'tool') {
      return {
        role: 'tool' as const,
        content: msg.content,
        tool_call_id: msg.toolCallId || '',
      };
    }
    return {
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content,
    };
  });
}

function convertTools(tools?: ToolDefinition[]): OpenAI.ChatCompletionTool[] | undefined {
  if (!tools || tools.length === 0) return undefined;
  
  return tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as Record<string, unknown>,
    },
  }));
}

export async function* streamChat(
  messages: Message[],
  options: LLMOptions = {}
): AsyncGenerator<StreamToken> {
  const client = await getClient();
  const model = options.model || 'gpt-4o';
  
  try {
    const stream = await client.chat.completions.create({
      model,
      messages: convertMessages(messages),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: true,
      tools: convertTools(options.tools),
      stop: options.stopSequences,
    });

    let inputTokens = 0;
    let outputTokens = 0;
    let currentToolCall: Partial<ToolCall> | null = null;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      
      if (delta?.content) {
        outputTokens += 1;
        yield { type: 'token', content: delta.content };
      }

      if (delta?.tool_calls) {
        for (const toolCallDelta of delta.tool_calls) {
          if (toolCallDelta.function?.name) {
            currentToolCall = {
              id: toolCallDelta.id || `call_${Date.now()}`,
              name: toolCallDelta.function.name,
              arguments: {},
            };
          }
          
          if (toolCallDelta.function?.arguments && currentToolCall) {
            try {
              const args = JSON.parse(toolCallDelta.function.arguments);
              currentToolCall.arguments = args;
              yield {
                type: 'tool_call',
                toolCall: currentToolCall as ToolCall,
              };
              currentToolCall = null;
            } catch {
            }
          }
        }
      }

      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens;
        outputTokens = chunk.usage.completion_tokens;
      }
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
  const model = options.model || 'gpt-4o';
  
  const response = await client.chat.completions.create({
    model,
    messages: convertMessages(messages),
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 4096,
    tools: convertTools(options.tools),
    stop: options.stopSequences,
  });

  const choice = response.choices[0];
  const toolCalls: ToolCall[] = [];

  if (choice.message.tool_calls) {
    for (const tc of choice.message.tool_calls) {
      toolCalls.push({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      });
    }
  }

  const usage = {
    inputTokens: response.usage?.prompt_tokens || 0,
    outputTokens: response.usage?.completion_tokens || 0,
    totalTokens: response.usage?.total_tokens || 0,
  };
  
  const pricing = PROVIDER_PRICING.openai[model] || PROVIDER_PRICING.openai['gpt-4o'];
  const cost = calculateLLMCost(usage, pricing);

  return {
    content: choice.message.content || '',
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    usage,
    model,
    provider: 'openai',
    cost,
  };
}

export const SUPPORTED_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo',
  'o1',
  'o1-mini',
];

export function resetClient(): void {
  clientInstance = null;
}
