import type { AgentState } from "../contracts/publicTypes.js";

export interface AuditInput {
  agentId: string;
  threadId?: string;
  eventType: string;
  summary: string;
  previousState?: AgentState;
  nextState?: AgentState;
}
