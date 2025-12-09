# Agent Integration Plan

## Current State
- **15 agents defined** in `packages/agents/src/definitions.ts` with system prompts
- **AgentExecutor** exists but uses old `@agentworks/providers` package
- **AI Gateway** newly created with multi-provider support, billing, streaming
- **No real connection** between frontend Kanban cards and agent execution

## Phase 1: Connect AI Gateway to Agent Executor
1. Update `packages/agents/src/executor.ts` to use `@agentworks/ai-gateway` instead of `@agentworks/providers`
2. Add streaming support with SSE to agent execution
3. Integrate usage tracking for billing

## Phase 2: Agent Execution API
1. Update `/api/agents/run` endpoint to execute agents with streaming
2. Add WebSocket or SSE endpoint for real-time agent output to terminal
3. Store agent run logs in database (RunLog model)
4. Update card status based on agent completion

## Phase 3: Frontend Integration
1. Connect terminal component to agent execution stream
2. Add "Run Agent" button to card detail modal
3. Show agent selection based on current lane
4. Display real-time agent output in bottom terminal
5. Update card status and lane after agent completion

## Phase 4: Agent Orchestration
1. Create agent workflow engine for multi-step tasks
2. Add agent handoff (e.g., Strategy → Storyboard → PRD)
3. Implement card auto-advancement through lanes
4. Add CEO CoPilot supervision for cross-lane visibility

## Phase 5: Database Seeding
1. Seed Agent table with 15 agent definitions
2. Create default agent configurations per project

## Files to Modify/Create
- `packages/agents/src/executor.ts` - Use ai-gateway
- `apps/api/src/routes/agents.ts` - Add streaming execution
- `apps/web/src/components/kanban/CardDetailModal.tsx` - Add run agent UI
- `apps/web/src/components/layout/Layout.tsx` - Connect terminal to agent stream
- `packages/db/prisma/seed.ts` - Seed agents

## Agent Registry (15 Agents)

| Agent | Lane(s) | Provider | Description |
|-------|---------|----------|-------------|
| CEO CoPilot | 0-10 | OpenAI | Executive supervisor, strategic alignment |
| Strategy | 0 | OpenAI | Product strategy, positioning, risk map |
| Storyboard/UX | 0 | OpenAI | User flows, wireframes |
| PRD | 1 | OpenAI | Product requirements document |
| MVP Scope | 1 | OpenAI | Minimal viable product definition |
| Research | 2 | OpenAI | Tech research, competitive analysis |
| Architect | 3 | Anthropic | System architecture, tech stack |
| Planner | 4 | OpenAI | Task breakdown, dependencies |
| DevOps | 5, 8 | Anthropic | Infrastructure, CI/CD, deployment |
| Dev Backend | 6 | Anthropic | Server-side implementation |
| Dev Frontend | 6 | Anthropic | Client-side UI implementation |
| QA | 7 | Anthropic | Test plans, E2E tests, bug reports |
| Troubleshooter | 7 | Anthropic | Debug issues, fix problems |
| Docs | 9 | OpenAI | User guides, API docs, runbooks |
| Refactor | 6, 10 | Anthropic | Code quality improvements |
