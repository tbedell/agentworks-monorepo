/**
 * Content Pipeline Template
 *
 * Visual Layout:
 *               [Content Request]
 *                      │
 *               [Content Strategy]
 *                      │
 *         ┌────────────┴────────────┐
 *         │                         │
 *   [SEO Optimization]       [Image Processing]
 *         │                         │
 *         └────────────┬────────────┘
 *                      │
 *               [Publish Content]
 *                      │
 *               [Social Sharing]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';

export const WP_CONTENT_PIPELINE: WorkflowTemplateDefinition = {
  id: 'wp-content-pipeline',
  name: 'Content Pipeline',
  description: 'Automated content publishing pipeline with SEO and social sharing',
  category: 'wordpress',
  complexity: 'simple',
  platform: 'wordpress',

  nodes: [
    {
      id: 'trigger-content',
      type: 'workflow',
      position: { x: 250, y: 0 },
      data: {
        label: 'Content Request',
        nodeType: 'trigger',
        description: 'New content submission or draft',
        config: { event: 'content-request' },
      },
    },
    {
      id: 'action-strategy',
      type: 'workflow',
      position: { x: 250, y: 100 },
      data: {
        label: 'Content Strategy',
        nodeType: 'action',
        description: 'Apply content guidelines and formatting',
        config: { command: 'apply-strategy' },
      },
    },
    {
      id: 'action-seo',
      type: 'workflow',
      position: { x: 100, y: 200 },
      data: {
        label: 'SEO Optimization',
        nodeType: 'action',
        description: 'Optimize meta tags and keywords',
        config: { command: 'optimize-seo' },
      },
    },
    {
      id: 'action-images',
      type: 'workflow',
      position: { x: 400, y: 200 },
      data: {
        label: 'Image Processing',
        nodeType: 'action',
        description: 'Optimize and resize images',
        config: { command: 'process-images' },
      },
    },
    {
      id: 'action-publish',
      type: 'workflow',
      position: { x: 250, y: 300 },
      data: {
        label: 'Publish Content',
        nodeType: 'action',
        description: 'Publish or schedule post',
        config: { command: 'wp post update' },
      },
    },
    {
      id: 'action-social',
      type: 'workflow',
      position: { x: 250, y: 400 },
      data: {
        label: 'Social Sharing',
        nodeType: 'notification',
        description: 'Share to social media platforms',
        config: { channel: 'social' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-content', target: 'action-strategy', animated: true },
    { id: 'e2', source: 'action-strategy', target: 'action-seo', animated: true },
    { id: 'e3', source: 'action-strategy', target: 'action-images', animated: true },
    { id: 'e4', source: 'action-seo', target: 'action-publish', animated: true },
    { id: 'e5', source: 'action-images', target: 'action-publish', animated: true },
    { id: 'e6', source: 'action-publish', target: 'action-social', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'plugin',
    stackProfile: {
      frontend: { framework: 'wordpress', styling: 'css-modules' },
      backend: { runtime: 'php', framework: 'wordpress', database: 'mysql' },
      infrastructure: { containerization: 'docker', hosting: 'self-hosted' },
    },
    fileSpecs: [
      { path: 'content-pipeline.php', template: 'wp-functions', variables: {} },
      { path: 'includes/class-seo-optimizer.php', template: 'wp-functions', variables: {} },
    ],
    dependencies: [],
  },

  variables: [
    {
      name: 'seoPlugin',
      label: 'SEO Plugin',
      type: 'select',
      default: 'yoast',
      options: [
        { label: 'Yoast SEO', value: 'yoast' },
        { label: 'Rank Math', value: 'rankmath' },
        { label: 'All in One SEO', value: 'aioseo' },
      ],
      description: 'SEO plugin for optimization',
    },
    {
      name: 'socialPlatforms',
      label: 'Social Platforms',
      type: 'select',
      default: 'twitter',
      options: [
        { label: 'Twitter/X', value: 'twitter' },
        { label: 'Facebook', value: 'facebook' },
        { label: 'LinkedIn', value: 'linkedin' },
        { label: 'All', value: 'all' },
      ],
      description: 'Social sharing destinations',
    },
  ],

  tags: ['wordpress', 'content', 'seo', 'publishing'],
  requiredAgents: ['dev_backend'],
};
