import Anthropic from '@anthropic-ai/sdk';
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

let clientInstance: Anthropic | null = null;

async function getClient(): Promise<Anthropic> {
  if (!clientInstance) {
    const apiKey = await getProviderApiKey('anthropic');
    clientInstance = new Anthropic({ apiKey });
  }
  return clientInstance;
}

type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string };

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

function convertMessages(messages: Message[]): { system: string; messages: AnthropicMessage[] } {
  let systemPrompt = '';
  const anthropicMessages: AnthropicMessage[] = [];

  // Collect tool results that need to be grouped into a user message
  let pendingToolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemPrompt = msg.content;
    } else if (msg.role === 'user') {
      // First flush any pending tool results
      if (pendingToolResults.length > 0) {
        anthropicMessages.push({
          role: 'user',
          content: pendingToolResults,
        });
        pendingToolResults = [];
      }
      anthropicMessages.push({
        role: 'user',
        content: msg.content,
      });
    } else if (msg.role === 'assistant') {
      // First flush any pending tool results
      if (pendingToolResults.length > 0) {
        anthropicMessages.push({
          role: 'user',
          content: pendingToolResults,
        });
        pendingToolResults = [];
      }

      // Check if this assistant message has tool calls attached
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        // Assistant message with tool calls - need to use content blocks
        const contentBlocks: AnthropicContentBlock[] = [];

        if (msg.content) {
          contentBlocks.push({ type: 'text', text: msg.content });
        }

        // Add tool use blocks for the tools that were called
        for (const tc of msg.toolCalls) {
          contentBlocks.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: tc.arguments,
          });
        }

        anthropicMessages.push({
          role: 'assistant',
          content: contentBlocks,
        });
      } else if (msg.content) {
        // Simple text-only assistant message
        anthropicMessages.push({
          role: 'assistant',
          content: msg.content,
        });
      }
      // Skip assistant messages with no content and no tool calls
    } else if (msg.role === 'tool') {
      // Collect tool results to group into a single user message
      pendingToolResults.push({
        type: 'tool_result',
        tool_use_id: msg.toolCallId || 'unknown',
        content: msg.content,
      });
    }
  }

  // Flush any remaining tool results
  if (pendingToolResults.length > 0) {
    anthropicMessages.push({
      role: 'user',
      content: pendingToolResults,
    });
  }

  return { system: systemPrompt, messages: anthropicMessages };
}

function convertTools(tools?: ToolDefinition[]): Anthropic.Tool[] | undefined {
  if (!tools || tools.length === 0) return undefined;

  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters as Anthropic.Tool['input_schema'],
  }));
}

export async function* streamChat(
  messages: Message[],
  options: LLMOptions = {}
): AsyncGenerator<StreamToken> {
  const client = await getClient();
  const model = options.model || 'claude-3-5-sonnet-20241022';
  const { system, messages: anthropicMessages } = convertMessages(messages);
  
  try {
    const stream = await client.messages.stream({
      model,
      max_tokens: options.maxTokens ?? 4096,
      system: system || undefined,
      messages: anthropicMessages,
      temperature: options.temperature ?? 0.7,
      tools: convertTools(options.tools),
      stop_sequences: options.stopSequences,
    });

    let inputTokens = 0;
    let outputTokens = 0;
    let currentToolUse: { id: string; name: string; input: string } | null = null;

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if ('text' in delta) {
          yield { type: 'token', content: delta.text };
        } else if ('partial_json' in delta && currentToolUse) {
          currentToolUse.input += delta.partial_json;
        }
      }
      
      if (event.type === 'content_block_start') {
        const block = event.content_block;
        if (block.type === 'tool_use') {
          currentToolUse = {
            id: block.id,
            name: block.name,
            input: '',
          };
        }
      }
      
      if (event.type === 'content_block_stop' && currentToolUse) {
        try {
          const args = JSON.parse(currentToolUse.input || '{}');
          yield {
            type: 'tool_call',
            toolCall: {
              id: currentToolUse.id,
              name: currentToolUse.name,
              arguments: args,
            },
          };
        } catch {
          yield {
            type: 'tool_call',
            toolCall: {
              id: currentToolUse.id,
              name: currentToolUse.name,
              arguments: {},
            },
          };
        }
        currentToolUse = null;
      }
      
      if (event.type === 'message_delta' && event.usage) {
        outputTokens = event.usage.output_tokens;
      }
      
      if (event.type === 'message_start' && event.message.usage) {
        inputTokens = event.message.usage.input_tokens;
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
  const model = options.model || 'claude-3-5-sonnet-20241022';
  const { system, messages: anthropicMessages } = convertMessages(messages);
  
  const response = await client.messages.create({
    model,
    max_tokens: options.maxTokens ?? 4096,
    system: system || undefined,
    messages: anthropicMessages,
    temperature: options.temperature ?? 0.7,
    tools: convertTools(options.tools),
    stop_sequences: options.stopSequences,
  });

  let content = '';
  const toolCalls: ToolCall[] = [];

  for (const block of response.content) {
    if (block.type === 'text') {
      content += block.text;
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id,
        name: block.name,
        arguments: block.input as Record<string, unknown>,
      });
    }
  }

  const usage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    totalTokens: response.usage.input_tokens + response.usage.output_tokens,
  };

  const pricing = PROVIDER_PRICING.anthropic[model] || PROVIDER_PRICING.anthropic['claude-3-5-sonnet-20241022'];
  const cost = calculateLLMCost(usage, pricing);

  return {
    content,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    usage,
    model,
    provider: 'anthropic',
    cost,
  };
}

export const SUPPORTED_MODELS = [
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
];

export function resetClient(): void {
  clientInstance = null;
}
