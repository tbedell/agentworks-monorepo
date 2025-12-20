/**
 * Tech Stack Detector
 *
 * Analyzes project documents (Blueprint, PRD, MVP, etc.) to detect
 * the technology stack and recommend appropriate agents.
 *
 * Used by CoPilot to auto-invoke specialized agents like the WordPress CMS Agent.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '@agentworks/shared';

const logger = createLogger('tech-stack-detector');

export type TechStack =
  | 'wordpress'
  | 'react'
  | 'nextjs'
  | 'vue'
  | 'angular'
  | 'node'
  | 'python'
  | 'go'
  | 'rust'
  | 'unknown';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface TechStackDetection {
  stack: TechStack;
  confidence: ConfidenceLevel;
  matchCount: number;
  keywords: string[];
  recommendedAgent?: string;
}

export interface DetectionResult {
  primary: TechStackDetection | null;
  secondary: TechStackDetection[];
  allDetections: TechStackDetection[];
}

// Keyword patterns for each tech stack
const TECH_STACK_KEYWORDS: Record<TechStack, string[]> = {
  wordpress: [
    'wordpress',
    'wp-content',
    'wp-admin',
    'wp-includes',
    'woocommerce',
    'gutenberg',
    'block theme',
    'classic theme',
    'full site editing',
    'fse',
    'theme.json',
    'wp-cli',
    'wpcs',
    'phpcs',
    'wordpress theme',
    'wordpress plugin',
    'wordpress rest api',
    'wordpress block',
    'wordpress multisite',
    'wordpress hooks',
    'add_action',
    'add_filter',
    'wp_enqueue',
    'elementor',
    'divi',
    'acf',
    'advanced custom fields',
  ],
  react: [
    'react',
    'react.js',
    'reactjs',
    'jsx',
    'tsx',
    'create-react-app',
    'react hooks',
    'usestate',
    'useeffect',
    'react router',
    'redux',
    'zustand',
    'react query',
    'tanstack',
    'vite react',
  ],
  nextjs: [
    'next.js',
    'nextjs',
    'next/app',
    'next/pages',
    'app router',
    'pages router',
    'getserversideprops',
    'getstaticprops',
    'next/image',
    'next/link',
    'server components',
    'vercel',
    'next.config',
  ],
  vue: [
    'vue',
    'vue.js',
    'vuejs',
    'vuex',
    'pinia',
    'nuxt',
    'nuxt.js',
    'vue router',
    'composition api',
    'options api',
    'vue 3',
    'vite vue',
  ],
  angular: [
    'angular',
    'angularjs',
    '@angular',
    'ng-',
    'angular cli',
    'rxjs',
    'ngrx',
    'angular material',
    'angular universal',
  ],
  node: [
    'node.js',
    'nodejs',
    'express',
    'fastify',
    'koa',
    'nestjs',
    'hapi',
    'npm',
    'pnpm',
    'yarn',
    'node backend',
    'node server',
  ],
  python: [
    'python',
    'django',
    'flask',
    'fastapi',
    'pytorch',
    'tensorflow',
    'pandas',
    'numpy',
    'pip',
    'virtualenv',
    'conda',
  ],
  go: ['golang', 'go language', 'gin', 'echo', 'fiber', 'go modules', 'goroutines'],
  rust: ['rust', 'rustlang', 'cargo', 'tokio', 'actix', 'rocket', 'wasm-pack'],
  unknown: [],
};

// Agent recommendations for each tech stack
const AGENT_RECOMMENDATIONS: Partial<Record<TechStack, string>> = {
  wordpress: 'cms_wordpress',
  react: 'dev_frontend',
  nextjs: 'dev_frontend',
  vue: 'dev_frontend',
  angular: 'dev_frontend',
  node: 'dev_backend',
  python: 'dev_backend',
  go: 'dev_backend',
  rust: 'dev_backend',
};

/**
 * Count keyword matches in text (case-insensitive)
 */
function countKeywordMatches(text: string, keywords: string[]): { count: number; matched: string[] } {
  const lowerText = text.toLowerCase();
  const matched: string[] = [];

  for (const keyword of keywords) {
    // Use word boundary regex for more accurate matching
    const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      matched.push(keyword);
    }
  }

  return { count: matched.length, matched };
}

/**
 * Determine confidence level based on match count
 */
function getConfidenceLevel(matchCount: number): ConfidenceLevel {
  if (matchCount >= 5) return 'high';
  if (matchCount >= 3) return 'medium';
  return 'low';
}

/**
 * Detect tech stack from text content
 */
export function detectTechStackFromText(text: string): DetectionResult {
  const detections: TechStackDetection[] = [];

  for (const [stack, keywords] of Object.entries(TECH_STACK_KEYWORDS)) {
    if (stack === 'unknown') continue;

    const { count, matched } = countKeywordMatches(text, keywords);

    if (count > 0) {
      detections.push({
        stack: stack as TechStack,
        confidence: getConfidenceLevel(count),
        matchCount: count,
        keywords: matched,
        recommendedAgent: AGENT_RECOMMENDATIONS[stack as TechStack],
      });
    }
  }

  // Sort by match count (descending)
  detections.sort((a, b) => b.matchCount - a.matchCount);

  return {
    primary: detections[0] || null,
    secondary: detections.slice(1).filter((d) => d.confidence !== 'low'),
    allDetections: detections,
  };
}

/**
 * Read and concatenate planning documents from a project
 */
function readPlanningDocuments(projectPath: string): string {
  const docsPath = path.join(projectPath, 'docs');
  const contextPath = path.join(projectPath, '.context');
  const documentsToRead = [
    path.join(docsPath, 'BLUEPRINT.md'),
    path.join(docsPath, 'PRD.md'),
    path.join(docsPath, 'MVP.md'),
    path.join(docsPath, 'PLAYBOOK.md'),
    path.join(docsPath, 'ARCHITECTURE.md'),
    path.join(contextPath, 'PROJECT.context'),
    path.join(contextPath, 'PLANNING.context'),
  ];

  let combinedContent = '';

  for (const docPath of documentsToRead) {
    try {
      if (fs.existsSync(docPath)) {
        const content = fs.readFileSync(docPath, 'utf-8');
        combinedContent += `\n${content}\n`;
      }
    } catch (error) {
      logger.debug('Could not read document', { docPath, error });
    }
  }

  return combinedContent;
}

/**
 * Detect tech stack for a project by analyzing its documents
 */
export function detectProjectTechStack(projectPath: string): DetectionResult {
  try {
    const documentContent = readPlanningDocuments(projectPath);

    if (!documentContent.trim()) {
      logger.debug('No planning documents found', { projectPath });
      return {
        primary: null,
        secondary: [],
        allDetections: [],
      };
    }

    const result = detectTechStackFromText(documentContent);

    logger.info('Tech stack detected', {
      projectPath,
      primary: result.primary?.stack,
      confidence: result.primary?.confidence,
      matchCount: result.primary?.matchCount,
    });

    return result;
  } catch (error) {
    logger.error('Failed to detect tech stack', { projectPath, error });
    return {
      primary: null,
      secondary: [],
      allDetections: [],
    };
  }
}

/**
 * Check if WordPress is detected in the project
 */
export function isWordPressProject(projectPath: string): boolean {
  const result = detectProjectTechStack(projectPath);
  return result.primary?.stack === 'wordpress';
}

/**
 * Get recommended agent for a project based on detected tech stack
 */
export function getRecommendedAgent(projectPath: string): string | null {
  const result = detectProjectTechStack(projectPath);
  return result.primary?.recommendedAgent || null;
}

/**
 * Detect tech stack from a CoPilot conversation message
 */
export function detectTechStackFromMessage(message: string): DetectionResult {
  return detectTechStackFromText(message);
}

/**
 * Check if a message mentions WordPress
 */
export function messageContainsWordPress(message: string): boolean {
  const result = detectTechStackFromText(message);
  return result.allDetections.some((d) => d.stack === 'wordpress');
}
