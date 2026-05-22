import type { AgentRecord } from "../contracts/publicTypes.js";

export function describeIdentityKernel(agent: AgentRecord): string {
  return `${agent.displayName} (${agent.role}) is governed by boundary profile ${agent.boundaryProfileId}.`;
}
