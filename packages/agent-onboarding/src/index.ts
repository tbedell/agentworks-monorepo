/**
 * @module @agentworks/agent-onboarding
 * @description Agent onboarding system for the AgentWorks platform.
 *
 * Provides:
 * - Type definitions for agent onboarding configuration
 * - Pre-built agent templates for the 8-role team model
 * - Comprehensive configuration validation
 * - Workspace file generation (IDENTITY.md, SOUL.md, TOOLS.md, AGENTS.md)
 * - Full onboarding orchestration service
 */

export * from './types.js';
export * from './templates.js';
export * from './validator.js';
export * from './file-generator.js';
export { AgentOnboardingService, agentOnboardingService } from './onboarding-service.js';
