import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { z } from 'zod';
import { createGateway, type LLMProviderName } from '@agentworks/ai-gateway';
import { lucia } from '../lib/auth.js';

// Default agent configuration for UI Agent
const DEFAULT_UI_AGENT_CONFIG = {
  provider: 'anthropic' as LLMProviderName,
  model: 'claude-sonnet-4-20250514',
};

// Component library reference for system prompt
const COMPONENT_LIBRARY = {
  layout: ['container', 'grid', 'flexbox'],
  components: ['button', 'input', 'card', 'table', 'modal', 'navigation'],
  data: ['list', 'chart', 'form'],
};

// System prompts for different modes
const getSystemPrompt = (mode: 'html' | 'components', breakpoint: string) => {
  const basePrompt = `You are the UI Agent for AgentWorks, a specialized AI that helps users create UI mockups and visual designs.

Current breakpoint: ${breakpoint}
Design for: ${breakpoint === 'mobile' ? '375px width' : breakpoint === 'tablet' ? '768px width' : '1024px+ width'}

`;

  if (mode === 'html') {
    return basePrompt + `MODE: HTML/CSS Generation
Generate complete, self-contained HTML and CSS code that can be rendered in an iframe preview.

GUIDELINES:
- Create responsive, modern designs
- Use semantic HTML5 elements
- Include all CSS inline or in a style block
- Use CSS Grid, Flexbox for layouts
- Add placeholder content (lorem ipsum, sample data)
- Make designs visually appealing with proper spacing, colors, and typography
- Consider the current breakpoint when sizing elements

CRITICAL OUTPUT FORMAT:
You MUST include an action block at the END of your response using this EXACT format:

[ACTION:GENERATE_HTML]
html: <div class="container">Your complete HTML here</div>
css: .container { background: #fff; }
description: Brief description of what was created
[/ACTION]

IMPORTANT RULES:
1. Do NOT use markdown code blocks (\`\`\`html or \`\`\`css) - put HTML directly after "html:" and CSS directly after "css:"
2. The HTML goes on the same line as "html:" or can span multiple lines
3. The CSS goes on the same line as "css:" or can span multiple lines
4. The description MUST be the LAST line before [/ACTION]
5. Always explain what you're creating BEFORE the action block
6. The action block MUST be at the very END of your response`;
  }

  return basePrompt + `MODE: Canvas Components
Add and manipulate drag-drop canvas components using the available component library.

AVAILABLE COMPONENTS:
- Layout: ${COMPONENT_LIBRARY.layout.join(', ')} (containers that can hold other components)
- UI: ${COMPONENT_LIBRARY.components.join(', ')}
- Data: ${COMPONENT_LIBRARY.data.join(', ')}

COMPONENT PROPERTIES:
- type: The component type (required, one of the above)
- name: Display name for the component
- x, y: Position coordinates on canvas (pixels)
- width, height: Dimensions in pixels
- properties.text: Text content displayed
- properties.color: Text color (hex, e.g., #000000)
- properties.backgroundColor: Background color (hex, e.g., #FFFFFF)
- properties.padding: Padding (e.g., "8px" or "8px 16px")
- properties.margin: Margin (e.g., "0" or "8px")
- parentId: ID of parent container (for nested components)

When adding components, include actions at the END of your response:

[ACTION:ADD_COMPONENT]
type: button
name: Submit Button
x: 100
y: 200
width: 120
height: 40
properties.text: Submit
properties.backgroundColor: #3B82F6
properties.color: #FFFFFF
[/ACTION]

[ACTION:UPDATE_COMPONENT]
id: component_id_here
width: 150
properties.text: New Text
[/ACTION]

[ACTION:CLEAR_CANVAS]
confirm: true
[/ACTION]

RULES:
- Position components sensibly (don't overlap unnecessarily)
- Use appropriate sizes for each component type
- Group related components together
- Explain what you're creating before action blocks
- You can add multiple components in a single response`;
};

const chatSchema = z.object({
  message: z.string().min(1),
  projectId: z.string(),
  cardId: z.string().optional(),
  mode: z.enum(['html', 'components']),
  context: z.object({
    currentComponents: z.array(z.any()).optional(),
    currentBreakpoint: z.string().optional(),
    currentHTML: z.object({
      html: z.string(),
      css: z.string(),
    }).optional(),
  }),
});

const uiAgentRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /ui-agent/chat - Main chat endpoint
  fastify.post('/chat', async (request, reply) => {
    // Authenticate user
    const sessionId = lucia.readSessionCookie(request.headers.cookie ?? '');
    if (!sessionId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || !user) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    // Validate request body
    const parseResult = chatSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parseResult.error.errors });
    }

    const { message, projectId, cardId, mode, context } = parseResult.data;
    const breakpoint = context.currentBreakpoint || 'desktop';

    try {
      // Get project context if cardId is provided
      let cardContext = '';
      if (cardId) {
        const card = await prisma.card.findUnique({
          where: { id: cardId },
          select: { title: true, description: true },
        });
        if (card) {
          cardContext = `\n\nLINKED TO CARD:
Title: ${card.title}
Description: ${card.description || 'No description'}

Create a mockup that aligns with this feature card.`;
        }
      }

      // Get current canvas context for components mode
      let canvasContext = '';
      if (mode === 'components' && context.currentComponents?.length) {
        canvasContext = `\n\nCURRENT CANVAS (${context.currentComponents.length} components):
${context.currentComponents.map(c => `- ${c.type}: "${c.name}" at (${c.x}, ${c.y}) size ${c.width}x${c.height}`).join('\n')}`;
      }

      // Get current HTML context for html mode
      let htmlContext = '';
      if (mode === 'html' && context.currentHTML?.html) {
        htmlContext = `\n\nCURRENT HTML (already generated, user may want modifications):
\`\`\`html
${context.currentHTML.html.substring(0, 500)}${context.currentHTML.html.length > 500 ? '...' : ''}
\`\`\``;
      }

      // Build system prompt
      const systemPrompt = getSystemPrompt(mode, breakpoint) + cardContext + canvasContext + htmlContext;

      // Create AI gateway and call LLM
      const gateway = createGateway();
      const aiResponse = await gateway.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        {
          provider: DEFAULT_UI_AGENT_CONFIG.provider,
          model: DEFAULT_UI_AGENT_CONFIG.model,
          maxTokens: 16384,  // Increased for complex HTML/CSS mockups
          temperature: 0.7,
        }
      );

      const responseContent = aiResponse.content || 'I apologize, but I was unable to generate a response.';

      // Generate message ID
      const messageId = `ui-agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Return response (action parsing happens on frontend)
      return reply.send({
        message: {
          id: messageId,
          role: 'assistant',
          content: responseContent,
          timestamp: new Date().toISOString(),
        },
        actions: [], // Actions are parsed on frontend for immediate execution
        generatedHTML: undefined, // Frontend extracts from response content
      });
    } catch (error) {
      console.error('[UI Agent] Error:', error);
      return reply.status(500).send({
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
};

export default uiAgentRoutes;
