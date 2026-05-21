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

export type SourceType = "user" | "system" | "review" | "recovery";

export interface IdentityKernel {
  agentId: string;
  name: string;
  role: string;
  purpose: string;
  tone: string;
  boundaries: string[];
  forbiddenClaims: string[];
  state: AgentState;
}

export interface MemoryRecord {
  id: string;
  threadId: string;
  content: string;
  source: SourceType;
  confidence: number;
  status: MemoryStatus;
  createdAt: string;
  updatedAt?: string;
  supersedes?: string[];
  notes?: string;
}

export interface ThreadRecord {
  id: string;
  title: string;
  memoryIds: string[];
  status: "open" | "resolved" | "archived";
}

export interface ConflictRecord {
  id: string;
  threadId: string;
  memoryIds: string[];
  type: string;
  summary: string;
  resolutionStatus: "needs_clarification" | "resolved" | "blocked";
  createdAt: string;
  resolvedAt?: string;
}

export interface ReviewResult {
  approved: boolean;
  riskLevel: "low" | "medium" | "high";
  reasons: string[];
}

export interface AuditEvent {
  id: string;
  eventType: string;
  threadId?: string;
  summary: string;
  previousState?: AgentState;
  nextState?: AgentState;
  createdAt: string;
}

export interface ClarificationEvent {
  id: string;
  threadId: string;
  userClarification: string;
  createdAt: string;
}

export type ChangeDecision =
  | "accepted"
  | "accepted_with_modification"
  | "rejected"
  | "deferred"
  | "out_of_scope"
  | "requires_ownership_clarification";

export interface ReviewFeedbackItem {
  id: string;
  reviewer: string;
  category:
    | "terminology"
    | "governance"
    | "boundary"
    | "continuity"
    | "failure_recovery"
    | "ownership"
    | "sentience_wording"
    | "technical";
  summary: string;
  decision: ChangeDecision;
  rationale: string;
  createdAt: string;
}

export interface ReviewerFinding {
  reviewerId: string;
  approved: boolean;
  severity: "info" | "low" | "medium" | "high" | "blocking";
  summary: string;
  recommendedAction: string;
}

export interface ChoirReviewResult {
  approved: boolean;
  blockingFindings: ReviewerFinding[];
  findings: ReviewerFinding[];
  finalRecommendation:
    | "allow"
    | "clarify"
    | "recover"
    | "block"
    | "escalate_to_human_review";
}
