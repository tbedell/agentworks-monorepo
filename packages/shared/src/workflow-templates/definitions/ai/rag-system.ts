/**
 * RAG System Template
 *
 * Visual Layout:
 *                     [RAG Init]
 *                            │
 *                     [Architect Agent]
 *                            │
 *                     [Vector Database]
 *                            │
 *        ┌────────────┬──────┼──────┬────────────┐
 *        │            │      │      │            │
 *   [Embedding]  [Chunking] [Indexing] [Ingestion] [Search]
 *        │            │      │      │            │
 *        └────────────┴──────┼──────┴────────────┘
 *                            │
 *               ┌────────────┼────────────┐
 *               │            │            │
 *         [Retrieval]  [Reranking]  [Generation]
 *               │            │            │
 *               └────────────┼────────────┘
 *                            │
 *                     [Chat Interface]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';
import { getDefaultStackProfile } from '../../code-generation.js';

export const RAG_SYSTEM: WorkflowTemplateDefinition = {
  id: 'rag-system',
  name: 'RAG System',
  description: 'Retrieval-Augmented Generation with vector search and document processing',
  category: 'ai',
  complexity: 'complex',
  platform: 'node',

  nodes: [
    {
      id: 'trigger-init',
      type: 'workflow',
      position: { x: 300, y: 0 },
      data: {
        label: 'RAG Init',
        nodeType: 'trigger',
        description: 'Initialize RAG system',
        config: { event: 'rag-init' },
      },
    },
    {
      id: 'agent-architect',
      type: 'workflow',
      position: { x: 300, y: 100 },
      data: {
        label: 'Architect Agent',
        nodeType: 'agent',
        description: 'Design RAG architecture',
        config: { agentName: 'architect' },
      },
    },
    {
      id: 'db-vector',
      type: 'workflow',
      position: { x: 300, y: 200 },
      data: {
        label: 'Vector Database',
        nodeType: 'database',
        description: 'Configure vector store',
        config: { tableName: 'embeddings' },
      },
    },
    {
      id: 'action-embedding',
      type: 'workflow',
      position: { x: 75, y: 300 },
      data: {
        label: 'Embedding Model',
        nodeType: 'action',
        description: 'Configure text embeddings',
        config: { command: 'setup-embeddings' },
      },
    },
    {
      id: 'action-chunking',
      type: 'workflow',
      position: { x: 187, y: 300 },
      data: {
        label: 'Chunking',
        nodeType: 'action',
        description: 'Document chunking strategy',
        config: { command: 'setup-chunking' },
      },
    },
    {
      id: 'action-indexing',
      type: 'workflow',
      position: { x: 300, y: 300 },
      data: {
        label: 'Indexing',
        nodeType: 'action',
        description: 'Build search index',
        config: { command: 'build-index' },
      },
    },
    {
      id: 'action-ingestion',
      type: 'workflow',
      position: { x: 412, y: 300 },
      data: {
        label: 'Ingestion Pipeline',
        nodeType: 'action',
        description: 'Document processing pipeline',
        config: { command: 'setup-ingestion' },
      },
    },
    {
      id: 'action-search',
      type: 'workflow',
      position: { x: 525, y: 300 },
      data: {
        label: 'Hybrid Search',
        nodeType: 'action',
        description: 'Vector + keyword search',
        config: { command: 'setup-search' },
      },
    },
    {
      id: 'action-retrieval',
      type: 'workflow',
      position: { x: 150, y: 400 },
      data: {
        label: 'Retrieval',
        nodeType: 'action',
        description: 'Query and retrieve documents',
        config: { command: 'setup-retrieval' },
      },
    },
    {
      id: 'action-reranking',
      type: 'workflow',
      position: { x: 300, y: 400 },
      data: {
        label: 'Reranking',
        nodeType: 'action',
        description: 'Rerank retrieved results',
        config: { command: 'setup-reranking' },
      },
    },
    {
      id: 'action-generation',
      type: 'workflow',
      position: { x: 450, y: 400 },
      data: {
        label: 'Generation',
        nodeType: 'action',
        description: 'LLM response generation',
        config: { command: 'setup-generation' },
      },
    },
    {
      id: 'ui-chat',
      type: 'workflow',
      position: { x: 300, y: 500 },
      data: {
        label: 'Chat Interface',
        nodeType: 'ui',
        description: 'RAG-powered chat UI',
        config: { component: 'RAGChat' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-init', target: 'agent-architect', animated: true },
    { id: 'e2', source: 'agent-architect', target: 'db-vector', animated: true },
    { id: 'e3', source: 'db-vector', target: 'action-embedding', animated: true },
    { id: 'e4', source: 'db-vector', target: 'action-chunking', animated: true },
    { id: 'e5', source: 'db-vector', target: 'action-indexing', animated: true },
    { id: 'e6', source: 'db-vector', target: 'action-ingestion', animated: true },
    { id: 'e7', source: 'db-vector', target: 'action-search', animated: true },
    { id: 'e8', source: 'action-embedding', target: 'action-retrieval', animated: true },
    { id: 'e9', source: 'action-chunking', target: 'action-retrieval', animated: true },
    { id: 'e10', source: 'action-indexing', target: 'action-reranking', animated: true },
    { id: 'e11', source: 'action-ingestion', target: 'action-reranking', animated: true },
    { id: 'e12', source: 'action-search', target: 'action-generation', animated: true },
    { id: 'e13', source: 'action-retrieval', target: 'ui-chat', animated: true },
    { id: 'e14', source: 'action-reranking', target: 'ui-chat', animated: true },
    { id: 'e15', source: 'action-generation', target: 'ui-chat', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'monorepo',
    stackProfile: getDefaultStackProfile('node'),
    fileSpecs: [
      { path: 'apps/api/src/lib/rag/index.ts', template: 'api-route', variables: { routeName: 'RAG', endpoint: 'rag' } },
      { path: 'apps/api/src/lib/rag/embeddings.ts', template: 'api-route', variables: {} },
      { path: 'apps/api/src/lib/rag/retrieval.ts', template: 'api-route', variables: {} },
      { path: 'apps/web/src/components/RAGChat.tsx', template: 'react-component', variables: { componentName: 'RAGChat' } },
    ],
    dependencies: [
      { name: '@pinecone-database/pinecone', version: '^2.0.0', workspace: 'apps/api' },
      { name: 'openai', version: '^4.0.0', workspace: 'apps/api' },
      { name: 'langchain', version: '^0.1.0', workspace: 'apps/api' },
    ],
  },

  variables: [
    {
      name: 'vectorStore',
      label: 'Vector Store',
      type: 'select',
      default: 'pinecone',
      options: [
        { label: 'Pinecone', value: 'pinecone' },
        { label: 'Weaviate', value: 'weaviate' },
        { label: 'Qdrant', value: 'qdrant' },
        { label: 'Chroma', value: 'chroma' },
      ],
      description: 'Vector database provider',
    },
    {
      name: 'embeddingModel',
      label: 'Embedding Model',
      type: 'select',
      default: 'openai',
      options: [
        { label: 'OpenAI Ada-002', value: 'openai' },
        { label: 'Cohere Embed', value: 'cohere' },
        { label: 'Sentence Transformers', value: 'local' },
      ],
      description: 'Text embedding model',
    },
    {
      name: 'chunkSize',
      label: 'Chunk Size',
      type: 'number',
      default: 512,
      description: 'Document chunk size in tokens',
    },
  ],

  tags: ['ai', 'rag', 'retrieval', 'embeddings', 'vector-search'],
  requiredAgents: ['architect', 'dev_backend', 'dev_frontend'],
};
