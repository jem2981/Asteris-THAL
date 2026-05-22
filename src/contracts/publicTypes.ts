export type AgentState =
  | "DORMANT"
  | "ACTIVE_STABLE"
  | "ACTIVE_MONITORED"
  | "UNCERTAIN"
  | "CONFLICT"
  | "DEGRADED"
  | "RECOVERY"
  | "LOCKED";

export type MemoryStatus =
  | "active"
  | "superseded"
  | "rejected_prior_option"
  | "unresolved"
  | "archived";

export type ReviewDecision =
  | "accept"
  | "reject"
  | "defer"
  | "needs_clarification"
  | "boundary_violation"
  | "ownership_ambiguity";

export type ConfidenceBasis =
  | "direct_user_statement"
  | "system_observation"
  | "reviewer_decision"
  | "clarification"
  | "imported_record"
  | "unknown";

export interface AgentRecord {
  id: string;
  displayName: string;
  role: string;
  currentState: AgentState;
  boundaryProfileId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ThreadRecord {
  id: string;
  agentId: string;
  title: string;
  status: "open" | "resolved" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface MemoryRecord {
  id: string;
  agentId: string;
  threadId: string;
  content: string;
  source: string;
  confidence: number;
  confidenceBasis: ConfidenceBasis;
  status: MemoryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimRecord {
  id: string;
  agentId: string;
  threadId: string;
  content: string;
  source: string;
  confidence: number;
  createdAt: string;
}

export interface ContradictionRecord {
  id: string;
  agentId: string;
  threadId: string;
  claimIds: string[];
  memoryIds: string[];
  summary: string;
  severity: "low" | "medium" | "high" | "blocking";
  status: "open" | "resolved" | "archived";
  createdAt: string;
  resolvedAt?: string;
}

export interface ClarificationRecord {
  id: string;
  agentId: string;
  threadId: string;
  contradictionId: string;
  content: string;
  source: string;
  createdAt: string;
}

export interface ReviewRecord {
  id: string;
  agentId: string;
  targetType: "claim" | "memory" | "contradiction" | "recovery" | "boundary";
  targetId: string;
  reviewer: string;
  decision: ReviewDecision;
  rationale: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  agentId: string;
  threadId?: string;
  eventType: string;
  summary: string;
  previousState?: AgentState;
  nextState?: AgentState;
  createdAt: string;
}

export interface BoundaryRuleRecord {
  id: string;
  boundaryProfileId: string;
  ruleType: "allow" | "deny" | "review";
  summary: string;
  createdAt: string;
}

export interface AgentStateSnapshot {
  id: string;
  agentId: string;
  threadId?: string;
  state: AgentState;
  reason: string;
  createdAt: string;
}

export interface ThreadSummary {
  thread: ThreadRecord;
  memories: MemoryRecord[];
  claims: ClaimRecord[];
  contradictions: ContradictionRecord[];
  reviews: ReviewRecord[];
  auditEvents: AuditEvent[];
}
