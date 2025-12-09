export interface ProjectFileInfo {
  id: string;
  projectId: string;
  path: string;
  type: FileType;
  language: string | null;
  size: number;
  hash: string | null;
  lastAgentId: string | null;
  gitStatus: GitStatus | null;
  isGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type FileType = 'source' | 'test' | 'config' | 'doc' | 'asset';

export type GitStatus = 'untracked' | 'modified' | 'staged' | 'committed';

export interface ProjectMetadata {
  projectId: string;
  tenantSlug: string;
  projectSlug: string;
  name: string;
  createdAt: Date;
  lastModifiedAt: Date;
  fileCount: number;
}

export interface CreateFileOptions {
  agentId?: string;
  type?: FileType;
  language?: string;
  isGenerated?: boolean;
}

export interface UpdateFileOptions {
  agentId?: string;
}

export interface ListFilesOptions {
  directory?: string;
  type?: FileType;
  recursive?: boolean;
  includeContent?: boolean;
}

export interface FileWithContent extends ProjectFileInfo {
  content: string;
}

export interface SyncResult {
  added: string[];
  modified: string[];
  deleted: string[];
  errors: Array<{ path: string; error: string }>;
}

export interface ProjectStructure {
  agentworks: {
    projectJson: string;
    agents: Record<string, AgentDocFiles>;
    styleGuide: string;
    github: string;
  };
  docs: {
    blueprint: string;
    prd: string;
    mvp: string;
    architecture: string;
  };
  src: string;
  tests: string;
  packageJson: string;
  gitignore: string;
}

export interface AgentDocFiles {
  plan: string;
  task: string;
  todo: string;
}

export interface ProjectInitOptions {
  tenantSlug: string;
  projectSlug: string;
  projectName: string;
  projectId: string;
  primaryLanguage?: string;
  frameworks?: string[];
}

export const DIRECTORY_STRUCTURE = {
  AGENTWORKS_DIR: '.agentworks',
  AGENTS_DIR: '.agentworks/agents',
  DOCS_DIR: 'docs',
  SRC_DIR: 'src',
  TESTS_DIR: 'tests',
} as const;

export const FILE_TYPE_PATTERNS: Record<FileType, string[]> = {
  source: ['*.ts', '*.tsx', '*.js', '*.jsx', '*.py', '*.go', '*.rs', '*.java'],
  test: ['*.test.ts', '*.test.tsx', '*.spec.ts', '*.spec.tsx', '*.test.js', '*.spec.js'],
  config: ['*.json', '*.yaml', '*.yml', '*.toml', '*.env*', 'Dockerfile', 'docker-compose*'],
  doc: ['*.md', '*.mdx', '*.rst', '*.txt'],
  asset: ['*.png', '*.jpg', '*.jpeg', '*.gif', '*.svg', '*.ico', '*.css', '*.scss'],
};

export const LANGUAGE_EXTENSIONS: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  py: 'python',
  go: 'go',
  rs: 'rust',
  java: 'java',
  rb: 'ruby',
  php: 'php',
  cs: 'csharp',
  cpp: 'cpp',
  c: 'c',
  swift: 'swift',
  kt: 'kotlin',
  scala: 'scala',
  md: 'markdown',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  sql: 'sql',
  html: 'html',
  css: 'css',
  scss: 'scss',
  sh: 'shell',
  bash: 'shell',
};
