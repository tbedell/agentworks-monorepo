/**
 * Portfolio/Blog Template
 *
 * Visual Layout:
 *                     [Site Init]
 *                            │
 *                     [Design Agent]
 *                            │
 *               ┌────────────┼────────────┐
 *               │            │            │
 *         [Hero]      [Projects]      [Blog]
 *               │            │            │
 *               └────────────┼────────────┘
 *                            │
 *               ┌────────────┼────────────┐
 *               │            │            │
 *         [About]      [Contact]      [MDX]
 *               │            │            │
 *               └────────────┼────────────┘
 *                            │
 *                     [Deploy]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';
import { getDefaultStackProfile } from '../../code-generation.js';

export const PORTFOLIO_BLOG: WorkflowTemplateDefinition = {
  id: 'portfolio-blog',
  name: 'Portfolio & Blog',
  description: 'Personal portfolio with project showcase and MDX-powered blog',
  category: 'web',
  complexity: 'simple',
  platform: 'react',

  nodes: [
    {
      id: 'trigger-init',
      type: 'workflow',
      position: { x: 250, y: 0 },
      data: {
        label: 'Site Init',
        nodeType: 'trigger',
        description: 'Initialize portfolio site',
        config: { event: 'site-init' },
      },
    },
    {
      id: 'agent-design',
      type: 'workflow',
      position: { x: 250, y: 100 },
      data: {
        label: 'Design Agent',
        nodeType: 'agent',
        description: 'Create visual design and layout',
        config: { agentName: 'design_ux' },
      },
    },
    {
      id: 'ui-hero',
      type: 'workflow',
      position: { x: 100, y: 200 },
      data: {
        label: 'Hero Section',
        nodeType: 'ui',
        description: 'Introduction and headline',
        config: { component: 'HeroSection' },
      },
    },
    {
      id: 'ui-projects',
      type: 'workflow',
      position: { x: 250, y: 200 },
      data: {
        label: 'Projects Grid',
        nodeType: 'ui',
        description: 'Portfolio project showcase',
        config: { component: 'ProjectsGrid' },
      },
    },
    {
      id: 'ui-blog',
      type: 'workflow',
      position: { x: 400, y: 200 },
      data: {
        label: 'Blog Section',
        nodeType: 'ui',
        description: 'Recent blog posts',
        config: { component: 'BlogSection' },
      },
    },
    {
      id: 'ui-about',
      type: 'workflow',
      position: { x: 100, y: 300 },
      data: {
        label: 'About Page',
        nodeType: 'ui',
        description: 'Biography and skills',
        config: { component: 'AboutPage' },
      },
    },
    {
      id: 'ui-contact',
      type: 'workflow',
      position: { x: 250, y: 300 },
      data: {
        label: 'Contact Form',
        nodeType: 'ui',
        description: 'Contact form with validation',
        config: { component: 'ContactForm' },
      },
    },
    {
      id: 'action-mdx',
      type: 'workflow',
      position: { x: 400, y: 300 },
      data: {
        label: 'MDX Setup',
        nodeType: 'action',
        description: 'Configure MDX for blog posts',
        config: { command: 'setup-mdx' },
      },
    },
    {
      id: 'action-deploy',
      type: 'workflow',
      position: { x: 250, y: 400 },
      data: {
        label: 'Deploy Site',
        nodeType: 'action',
        description: 'Deploy to Vercel or Cloudflare',
        config: { command: 'deploy' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-init', target: 'agent-design', animated: true },
    { id: 'e2', source: 'agent-design', target: 'ui-hero', animated: true },
    { id: 'e3', source: 'agent-design', target: 'ui-projects', animated: true },
    { id: 'e4', source: 'agent-design', target: 'ui-blog', animated: true },
    { id: 'e5', source: 'ui-hero', target: 'ui-about', animated: true },
    { id: 'e6', source: 'ui-projects', target: 'ui-contact', animated: true },
    { id: 'e7', source: 'ui-blog', target: 'action-mdx', animated: true },
    { id: 'e8', source: 'ui-about', target: 'action-deploy', animated: true },
    { id: 'e9', source: 'ui-contact', target: 'action-deploy', animated: true },
    { id: 'e10', source: 'action-mdx', target: 'action-deploy', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'single-app',
    stackProfile: {
      frontend: { framework: 'nextjs', styling: 'tailwind', state: 'context' },
      infrastructure: { containerization: 'none', hosting: 'vercel', ci: 'github-actions' },
    },
    fileSpecs: [
      { path: 'src/app/page.tsx', template: 'react-component', variables: { componentName: 'HomePage' } },
      { path: 'src/app/projects/page.tsx', template: 'react-component', variables: { componentName: 'ProjectsPage' } },
      { path: 'src/app/blog/page.tsx', template: 'react-component', variables: { componentName: 'BlogPage' } },
    ],
    dependencies: [
      { name: 'next', version: '^14.0.0', workspace: 'root' },
      { name: 'next-mdx-remote', version: '^4.0.0', workspace: 'root' },
      { name: 'tailwindcss', version: '^3.0.0', dev: true, workspace: 'root' },
    ],
  },

  variables: [
    {
      name: 'framework',
      label: 'Framework',
      type: 'select',
      default: 'nextjs',
      options: [
        { label: 'Next.js', value: 'nextjs' },
        { label: 'Astro', value: 'astro' },
        { label: 'Remix', value: 'remix' },
      ],
      description: 'Frontend framework',
    },
    {
      name: 'hosting',
      label: 'Hosting',
      type: 'select',
      default: 'vercel',
      options: [
        { label: 'Vercel', value: 'vercel' },
        { label: 'Cloudflare Pages', value: 'cloudflare' },
        { label: 'Netlify', value: 'netlify' },
      ],
      description: 'Deployment platform',
    },
  ],

  tags: ['portfolio', 'blog', 'personal', 'mdx'],
  requiredAgents: ['design_ux', 'dev_frontend'],
};
