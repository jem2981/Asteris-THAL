import type {
  AgentRecord,
  AuditEvent,
  BoundaryRuleRecord,
  ClaimRecord,
  ClarificationRecord,
  ContradictionRecord,
  MemoryRecord,
  ReviewRecord,
  ThreadRecord,
  ThreadSummary
} from "./publicTypes.js";

export interface AtcbSubmitMemoryInput {
  agentId: string;
  threadId: string;
  content: string;
  source: string;
  confidence?: number;
}

export interface AtcbSubmitClaimInput {
  agentId: string;
  threadId: string;
  content: string;
  source: string;
  confidence?: number;
}

export interface AtcbContract {
  createAgent(input: {
    displayName: string;
    role: string;
    boundaryProfileId?: string;
  }): AgentRecord;
  createThread(input: { agentId: string; title: string }): ThreadRecord;
  recordMemory(input: AtcbSubmitMemoryInput): MemoryRecord;
  submitClaim(input: AtcbSubmitClaimInput): {
    claim: ClaimRecord;
    contradictions: ContradictionRecord[];
  };
  submitClarification(input: {
    agentId: string;
    threadId: string;
    contradictionId: string;
    content: string;
    source: string;
  }): ClarificationRecord;
  reviewItem(input: {
    agentId: string;
    targetType: ReviewRecord["targetType"];
    targetId: string;
    reviewer: string;
    decision: ReviewRecord["decision"];
    rationale: string;
  }): ReviewRecord;
  attemptRecovery(input: { agentId: string; threadId: string }): {
    recovered: boolean;
    reason: string;
  };
  getThreadSummary(threadId: string): ThreadSummary;
  getAuditTrail(input?: { agentId?: string; threadId?: string }): AuditEvent[];
  setBoundaryRules(rules: BoundaryRuleRecord[]): void;
}

export const atcbIntegrationBoundary = {
  summary:
    "ATCB is a standalone continuity-governance layer. It is not the external system identity.",
  allowed:
    "External systems may submit claims, memories, clarifications, review decisions, and boundary profiles.",
  returns:
    "ATCB may return state, contradictions, confidence warnings, recovery blocks, audit trails, and review requirements.",
  nonClaims: [
    "ATCB does not own the external system identity.",
    "ATCB does not import private corpus by default.",
    "ATCB does not claim to be the agent.",
    "ATCB does not generate final conversational identity."
  ]
} as const;
