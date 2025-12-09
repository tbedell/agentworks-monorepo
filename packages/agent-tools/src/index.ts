export * from './types.js';
export { ToolRegistry, toolRegistry } from './registry.js';
export { ToolExecutor, toolExecutor, formatToolResultForLLM, formatToolResultsForLLM } from './executor.js';

// MCP Client
export {
  McpClient,
  McpClientError,
  createMcpClient,
  createMcpClientFromDevEnv,
  type McpServerType,
  type McpServerConfig,
  type McpConnectionConfig,
  type McpRequest,
  type McpResponse,
  type McpError,
  type McpFileReadParams,
  type McpFileReadResult,
  type McpFileWriteParams,
  type McpFileWriteResult,
  type McpListFilesParams,
  type McpListFilesResult,
  type McpFileEntry,
  type McpRunCommandParams,
  type McpRunCommandResult,
  type McpGitStatusResult,
  type McpGitCommitParams,
  type McpGitCommitResult,
} from './lib/mcp-client.js';

// File tools
export { fileTools, readFileTool, writeFileTool, updateFileTool, listFilesTool, deleteFileTool } from './tools/file-tools.js';

// Git tools
export { gitTools, gitStatusTool, gitDiffTool, gitLogTool, gitCommitTool, gitPushTool, gitCreateBranchTool, gitListBranchesTool } from './tools/git-tools.js';

// Code tools
export { codeTools, runTestsTool, runLinterTool, runTypeCheckTool, runBuildTool } from './tools/code-tools.js';

// Style tools
export { styleTools, validateStyleTool, getStyleGuideTool, generateConfigsTool } from './tools/style-tools.js';

// Search tools
export { searchTools, grepTool, findFilesTool, searchSymbolTool } from './tools/search-tools.js';

// Claude Code Agent tools
export {
  claudeCodeTools,
  mcpReadFileTool,
  mcpWriteFileTool,
  mcpListFilesTool,
  mcpRunCommandTool,
  updateDocsTool,
  updateKanbanCardTool,
  appendCardTodoTool,
  completeCardTodoTool,
  updateUiBuilderStateTool,
  updateDbBuilderStateTool,
  updateWorkflowBuilderStateTool,
  logRunSummaryTool,
  type ClaudeCodeToolContext,
} from './tools/claude-code/index.js';

// Register all default tools
import { toolRegistry } from './registry.js';
import { fileTools } from './tools/file-tools.js';
import { gitTools } from './tools/git-tools.js';
import { codeTools } from './tools/code-tools.js';
import { styleTools } from './tools/style-tools.js';
import { searchTools } from './tools/search-tools.js';
import { claudeCodeTools } from './tools/claude-code/index.js';

export function registerAllTools(): void {
  [...fileTools, ...gitTools, ...codeTools, ...styleTools, ...searchTools].forEach((tool) => {
    toolRegistry.registerTool(tool);
  });
}

export function registerFileTools(): void {
  fileTools.forEach((tool) => toolRegistry.registerTool(tool));
}

export function registerGitTools(): void {
  gitTools.forEach((tool) => toolRegistry.registerTool(tool));
}

export function registerCodeTools(): void {
  codeTools.forEach((tool) => toolRegistry.registerTool(tool));
}

export function registerStyleTools(): void {
  styleTools.forEach((tool) => toolRegistry.registerTool(tool));
}

export function registerSearchTools(): void {
  searchTools.forEach((tool) => toolRegistry.registerTool(tool));
}

export function registerClaudeCodeTools(): void {
  claudeCodeTools.forEach((tool) => toolRegistry.registerTool(tool));
}
