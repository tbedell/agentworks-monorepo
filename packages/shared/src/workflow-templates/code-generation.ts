/**
 * Code Generation System
 *
 * Maps workflow nodes to code specifications and generates scaffolds
 */

import type {
  WorkflowNode,
  WorkflowTemplateDefinition,
  FileSpec,
  CodeScaffold,
  DependencySpec,
  StackProfile,
  WorkflowNodeType,
} from './schema.js';

// Template strings for common code patterns
const CODE_TEMPLATES = {
  // Prisma schema model template
  'prisma-schema': `model {{modelName}} {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  {{#if tenantId}}
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  {{/if}}
  // Add fields here
}`,

  // Fastify API route template
  'api-route': `import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const {{routeName}}Routes: FastifyPluginAsync = async (fastify) => {
  // GET /{{endpoint}}
  fastify.get('/', async (request, reply) => {
    // TODO: Implement list
    return { data: [] };
  });

  // POST /{{endpoint}}
  fastify.post('/', async (request, reply) => {
    // TODO: Implement create
    return { success: true };
  });

  // GET /{{endpoint}}/:id
  fastify.get('/:id', async (request, reply) => {
    // TODO: Implement get by id
    return { data: null };
  });

  // PUT /{{endpoint}}/:id
  fastify.put('/:id', async (request, reply) => {
    // TODO: Implement update
    return { success: true };
  });

  // DELETE /{{endpoint}}/:id
  fastify.delete('/:id', async (request, reply) => {
    // TODO: Implement delete
    return { success: true };
  });
};

export default {{routeName}}Routes;`,

  // React component template
  'react-component': `import React from 'react';

interface {{componentName}}Props {
  // Add props here
}

export function {{componentName}}({ }: {{componentName}}Props) {
  return (
    <div className="{{className}}">
      {/* TODO: Implement {{componentName}} */}
    </div>
  );
}`,

  // Agent config template
  'agent-config': `import type { AgentConfig } from '../types';

export const {{agentName}}Config: AgentConfig = {
  name: '{{agentName}}',
  displayName: '{{displayName}}',
  description: '{{description}}',
  allowedLanes: [{{lanes}}],
  defaultProvider: '{{provider}}',
  defaultModel: '{{model}}',
  temperature: {{temperature}},
  maxTokens: {{maxTokens}},
};`,

  // Docker compose service template
  'docker-service': `  {{serviceName}}:
    build:
      context: .
      dockerfile: apps/{{app}}/Dockerfile
    ports:
      - "{{port}}:{{port}}"
    environment:
      - NODE_ENV=production
    depends_on:
      - db
      - redis`,

  // GitHub Actions workflow template
  'github-action': `name: {{workflowName}}

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build`,

  // WordPress functions.php template
  'wp-functions': `<?php
/**
 * Theme Functions
 *
 * @package {{themeName}}
 */

if (!defined('ABSPATH')) {
    exit;
}

// Theme setup
function {{prefix}}_theme_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('custom-logo');
    add_theme_support('html5', ['search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script']);
    add_theme_support('editor-styles');
    add_theme_support('wp-block-styles');

    register_nav_menus([
        'primary' => __('Primary Menu', '{{themeName}}'),
        'footer' => __('Footer Menu', '{{themeName}}'),
    ]);
}
add_action('after_setup_theme', '{{prefix}}_theme_setup');

// Enqueue scripts and styles
function {{prefix}}_enqueue_assets() {
    wp_enqueue_style('{{themeName}}-style', get_stylesheet_uri(), [], wp_get_theme()->get('Version'));
}
add_action('wp_enqueue_scripts', '{{prefix}}_enqueue_assets');`,

  // WordPress theme.json template
  'wp-theme-json': `{
  "$schema": "https://schemas.wp.org/trunk/theme.json",
  "version": 2,
  "settings": {
    "appearanceTools": true,
    "color": {
      "palette": [
        { "slug": "primary", "color": "#1e40af", "name": "Primary" },
        { "slug": "secondary", "color": "#475569", "name": "Secondary" },
        { "slug": "accent", "color": "#f59e0b", "name": "Accent" }
      ]
    },
    "typography": {
      "fontFamilies": [
        {
          "fontFamily": "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
          "slug": "body",
          "name": "Body"
        }
      ],
      "fontSizes": [
        { "slug": "small", "size": "0.875rem", "name": "Small" },
        { "slug": "medium", "size": "1rem", "name": "Medium" },
        { "slug": "large", "size": "1.25rem", "name": "Large" }
      ]
    },
    "layout": {
      "contentSize": "800px",
      "wideSize": "1200px"
    }
  },
  "styles": {
    "color": {
      "background": "var(--wp--preset--color--white)",
      "text": "var(--wp--preset--color--secondary)"
    }
  }
}`,

  // MCP server template
  'mcp-server': `#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  { name: '{{serverName}}', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: '{{toolName}}',
      description: '{{toolDescription}}',
      inputSchema: {
        type: 'object',
        properties: {
          // Add input properties
        },
        required: [],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case '{{toolName}}':
      // TODO: Implement tool logic
      return { content: [{ type: 'text', text: 'Tool executed' }] };
    default:
      throw new Error(\`Unknown tool: \${request.params.name}\`);
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);`,

  // Expo app template
  'expo-app': `import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={HomeScreen} />
          {/* Add more screens */}
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}`,
} as const;

/**
 * Maps a workflow node type to file specifications
 */
export function nodeToFileSpecs(node: WorkflowNode, stack: StackProfile): FileSpec[] {
  const { nodeType, config, label } = node.data;
  const specs: FileSpec[] = [];

  switch (nodeType) {
    case 'database':
      specs.push({
        path: 'packages/db/prisma/schema.prisma',
        template: 'prisma-schema',
        variables: {
          modelName: config?.tableName || toPascalCase(label),
          tenantId: config?.multiTenant ?? false,
        },
      });
      break;

    case 'api':
      const endpoint = config?.endpoint || toKebabCase(label);
      specs.push({
        path: `apps/api/src/routes/${endpoint}.ts`,
        template: 'api-route',
        variables: {
          routeName: toPascalCase(endpoint),
          endpoint,
        },
      });
      break;

    case 'ui':
      const component = config?.component || toPascalCase(label);
      specs.push({
        path: `apps/web/src/components/${component}.tsx`,
        template: 'react-component',
        variables: {
          componentName: component,
          className: toKebabCase(label),
        },
      });
      break;

    case 'agent':
      specs.push({
        path: `apps/agent-orchestrator/src/agents/${config?.agentName || toKebabCase(label)}.ts`,
        template: 'agent-config',
        variables: {
          agentName: config?.agentName || toKebabCase(label),
          displayName: label,
          description: node.data.description || '',
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
          temperature: 1.0,
          maxTokens: 0,
          lanes: '0, 1, 2, 3',
        },
      });
      break;

    case 'action':
      // Actions can generate various files depending on context
      if (config?.command?.includes('docker')) {
        specs.push({
          path: 'docker-compose.yml',
          template: 'docker-service',
          variables: {
            serviceName: toKebabCase(label),
            app: 'api',
            port: 3000,
          },
        });
      }
      break;

    case 'trigger':
      // Triggers may generate GitHub Actions or event handlers
      if (config?.event === 'git-push') {
        specs.push({
          path: '.github/workflows/ci.yml',
          template: 'github-action',
          variables: {
            workflowName: 'CI',
          },
        });
      }
      break;

    case 'notification':
      // Notification nodes typically don't generate files directly
      break;

    case 'condition':
      // Condition nodes are control flow, no direct file generation
      break;
  }

  return specs;
}

/**
 * Determines dependencies based on node types and stack
 */
export function nodeToDependencies(node: WorkflowNode, stack: StackProfile): DependencySpec[] {
  const { nodeType, config } = node.data;
  const deps: DependencySpec[] = [];

  switch (nodeType) {
    case 'database':
      if (stack.backend?.orm === 'prisma') {
        deps.push({ name: '@prisma/client', version: '^5.0.0', workspace: 'packages/db' });
        deps.push({ name: 'prisma', version: '^5.0.0', dev: true, workspace: 'packages/db' });
      }
      break;

    case 'api':
      if (stack.backend?.framework === 'fastify') {
        deps.push({ name: 'fastify', version: '^4.0.0', workspace: 'apps/api' });
        deps.push({ name: '@fastify/cors', version: '^8.0.0', workspace: 'apps/api' });
        deps.push({ name: 'zod', version: '^3.0.0', workspace: 'apps/api' });
      }
      break;

    case 'ui':
      if (stack.frontend?.framework === 'react') {
        deps.push({ name: 'react', version: '^18.0.0', workspace: 'apps/web' });
        deps.push({ name: 'react-dom', version: '^18.0.0', workspace: 'apps/web' });
      }
      if (stack.frontend?.styling === 'tailwind') {
        deps.push({ name: 'tailwindcss', version: '^3.0.0', dev: true, workspace: 'apps/web' });
      }
      break;

    case 'agent':
      deps.push({ name: '@anthropic-ai/sdk', version: '^0.20.0', workspace: 'packages/ai-gateway' });
      deps.push({ name: 'openai', version: '^4.0.0', workspace: 'packages/ai-gateway' });
      break;
  }

  return deps;
}

/**
 * Generates a complete code scaffold from a workflow template
 */
export function generateScaffold(
  template: WorkflowTemplateDefinition,
  variables: Record<string, unknown> = {}
): CodeScaffold {
  const scaffold: CodeScaffold = {
    directories: [],
    files: [],
    dependencies: [],
    commands: [],
  };

  const stack = template.codeSpecs.stackProfile;
  const allDeps: Map<string, DependencySpec[]> = new Map();

  // Generate base directories based on scaffold type
  switch (template.codeSpecs.scaffoldType) {
    case 'monorepo':
      scaffold.directories.push(
        'apps/web/src',
        'apps/api/src',
        'packages/shared/src',
        'packages/db/prisma'
      );
      break;
    case 'single-app':
      scaffold.directories.push('src', 'public');
      break;
    case 'plugin':
      scaffold.directories.push('includes', 'admin', 'public');
      break;
    case 'theme':
      scaffold.directories.push('templates', 'parts', 'patterns', 'styles');
      break;
    case 'service':
      scaffold.directories.push('src', 'config');
      break;
  }

  // Process each node
  for (const node of template.nodes) {
    // Get file specs for this node
    const fileSpecs = nodeToFileSpecs(node, stack);
    for (const spec of fileSpecs) {
      const content = applyTemplate(spec.template, { ...spec.variables, ...variables });
      scaffold.files.push({ path: spec.path, content });

      // Ensure directory exists
      const dir = spec.path.substring(0, spec.path.lastIndexOf('/'));
      if (dir && !scaffold.directories.includes(dir)) {
        scaffold.directories.push(dir);
      }
    }

    // Get dependencies for this node
    const deps = nodeToDependencies(node, stack);
    for (const dep of deps) {
      const workspace = dep.workspace || 'root';
      if (!allDeps.has(workspace)) {
        allDeps.set(workspace, []);
      }
      // Avoid duplicates
      const existing = allDeps.get(workspace)!;
      if (!existing.some(d => d.name === dep.name)) {
        existing.push(dep);
      }
    }
  }

  // Convert deps map to array
  for (const [workspace, deps] of allDeps) {
    scaffold.dependencies.push({ workspace, deps });
  }

  // Add setup commands
  scaffold.commands.push(
    { description: 'Install dependencies', command: 'pnpm install' },
    { description: 'Generate database client', command: 'pnpm db:generate' },
    { description: 'Run database migrations', command: 'pnpm db:migrate' },
    { description: 'Start development server', command: 'pnpm dev' }
  );

  return scaffold;
}

/**
 * Applies variables to a template string
 */
function applyTemplate(templateName: string, variables: Record<string, unknown>): string {
  const template = CODE_TEMPLATES[templateName as keyof typeof CODE_TEMPLATES];
  if (!template) {
    return `// TODO: Implement ${templateName}`;
  }

  let result: string = template;

  // Simple variable substitution
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value ?? ''));
  }

  // Handle conditionals {{#if var}}...{{/if}}
  result = result.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (_, varName, content) => {
    return variables[varName] ? content : '';
  });

  return result;
}

/**
 * Converts string to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

/**
 * Converts string to kebab-case
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Gets the default stack profile for a platform
 */
export function getDefaultStackProfile(platform: string): StackProfile {
  switch (platform) {
    case 'react':
    case 'universal':
      return {
        frontend: { framework: 'react', styling: 'tailwind', state: 'zustand' },
        backend: { runtime: 'node', framework: 'fastify', database: 'postgresql', orm: 'prisma' },
        infrastructure: { containerization: 'docker', hosting: 'gcp', ci: 'github-actions' },
      };
    case 'node':
      return {
        backend: { runtime: 'node', framework: 'fastify', database: 'postgresql', orm: 'prisma' },
        infrastructure: { containerization: 'docker', hosting: 'gcp', ci: 'github-actions' },
      };
    case 'wordpress':
      return {
        frontend: { framework: 'wordpress', styling: 'sass' },
        backend: { runtime: 'php', framework: 'wordpress', database: 'mysql' },
        infrastructure: { containerization: 'docker', hosting: 'self-hosted' },
      };
    case 'expo':
      return {
        frontend: { framework: 'expo', styling: 'tailwind', state: 'zustand' },
        backend: { runtime: 'node', framework: 'fastify', database: 'postgresql', orm: 'prisma' },
        infrastructure: { containerization: 'docker', hosting: 'gcp', ci: 'github-actions' },
      };
    case 'docker':
    case 'gcp':
      return {
        backend: { runtime: 'node', framework: 'fastify', database: 'postgresql', orm: 'prisma' },
        infrastructure: { containerization: 'docker', hosting: 'gcp', ci: 'github-actions' },
      };
    default:
      return {
        frontend: { framework: 'react', styling: 'tailwind', state: 'zustand' },
        backend: { runtime: 'node', framework: 'fastify', database: 'postgresql', orm: 'prisma' },
        infrastructure: { containerization: 'docker', hosting: 'gcp', ci: 'github-actions' },
      };
  }
}
