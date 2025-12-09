import type { AgentName } from '@agentworks/shared';
import { AGENT_DEFINITIONS, type AgentDefinition } from './definitions.js';

class AgentRegistry {
  private agents: Map<AgentName, AgentDefinition> = new Map();

  constructor() {
    for (const def of AGENT_DEFINITIONS) {
      this.agents.set(def.name, def);
    }
  }

  get(name: AgentName): AgentDefinition | undefined {
    return this.agents.get(name);
  }

  getAll(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  getByLane(laneNumber: number): AgentDefinition[] {
    return this.getAll().filter((agent) => agent.allowedLanes.includes(laneNumber));
  }

  isAllowedInLane(name: AgentName, laneNumber: number): boolean {
    const agent = this.get(name);
    return agent ? agent.allowedLanes.includes(laneNumber) : false;
  }
}

export const agentRegistry = new AgentRegistry();
