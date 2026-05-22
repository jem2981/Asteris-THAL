import type { SqliteDatabase } from "../db/sqlite.js";
import { openDatabase } from "../db/sqlite.js";
import { AtcbRepository } from "../db/repositories/atcbRepository.js";
import type {
  AgentRecord,
  AgentState,
  AuditEvent,
  ClaimRecord,
  ClarificationRecord,
  ConfidenceBasis,
  ContradictionRecord,
  MemoryRecord,
  ReviewRecord,
  ThreadRecord,
  ThreadSummary
} from "../contracts/publicTypes.js";
import { detectContradictions } from "./contradictionEngine.js";
import { boundaryReview } from "./boundaryEngine.js";
import { conflictConfidence, scoreConfidence } from "./confidenceEngine.js";
import { stateForOpenContradictions } from "./stateMachine.js";
import { unresolvedBlockingContradictions } from "./recoveryEngine.js";
import { ensureClaimContent } from "./claimRegistry.js";
import { ensureThreadTitle } from "./threadRegistry.js";

export class ContinuityGovernanceService {
  readonly repository: AtcbRepository;

  constructor(
    private readonly db: SqliteDatabase,
    repository = new AtcbRepository(db)
  ) {
    this.repository = repository;
  }

  static open(dbPath?: string): ContinuityGovernanceService {
    return new ContinuityGovernanceService(openDatabase(dbPath));
  }

  close(): void {
    this.db.close();
  }

  createAgent(input: {
    displayName: string;
    role: string;
    boundaryProfileId?: string;
    id?: string;
  }): AgentRecord {
    const agent = this.repository.createAgent(input);
    this.repository.createAuditEvent({
      agentId: agent.id,
      eventType: "agent_created",
      summary: `Agent ${agent.displayName} registered for continuity governance.`,
      nextState: agent.currentState
    });
    return agent;
  }

  listAgents(): AgentRecord[] {
    return this.repository.listAgents();
  }

  getAgent(agentId: string): AgentRecord | undefined {
    return this.repository.getAgent(agentId);
  }

  createThread(input: { agentId: string; title: string; id?: string }): ThreadRecord {
    const thread = this.repository.createThread({
      ...input,
      title: ensureThreadTitle(input.title)
    });
    this.repository.createAuditEvent({
      agentId: thread.agentId,
      threadId: thread.id,
      eventType: "thread_created",
      summary: `Thread opened: ${thread.title}.`
    });
    return thread;
  }

  recordMemory(input: {
    agentId: string;
    threadId: string;
    content: string;
    source: string;
    confidence?: number;
    confidenceBasis?: ConfidenceBasis;
    id?: string;
  }): MemoryRecord {
    const basis = input.confidenceBasis ?? "direct_user_statement";
    const memory = this.repository.createMemory({
      ...input,
      confidence: scoreConfidence({ confidence: input.confidence, basis }),
      confidenceBasis: basis,
      status: "active"
    });
    this.repository.createAuditEvent({
      agentId: memory.agentId,
      threadId: memory.threadId,
      eventType: "memory_recorded",
      summary: "Memory recorded with provenance, confidence, and active status."
    });
    return memory;
  }

  submitClaim(input: {
    agentId: string;
    threadId: string;
    content: string;
    source: string;
    confidence?: number;
    id?: string;
  }): { claim: ClaimRecord; contradictions: ContradictionRecord[] } {
    const content = ensureClaimContent(input.content);
    const boundary = boundaryReview(content);
    const claim = this.repository.createClaim({
      ...input,
      content,
      confidence: scoreConfidence({ confidence: input.confidence, basis: "direct_user_statement" })
    });

    const memories = this.repository.listMemories(input.threadId);
    const drafts = boundary.allowed
      ? detectContradictions(claim, memories)
      : [
          {
            claimIds: [claim.id],
            memoryIds: [],
            summary: boundary.reason,
            severity: "blocking" as const
          }
        ];

    const contradictions = drafts.map((draft) =>
      this.repository.createContradiction({
        agentId: input.agentId,
        threadId: input.threadId,
        ...draft
      })
    );

    for (const contradiction of contradictions) {
      for (const memoryId of contradiction.memoryIds) {
        const memory = this.repository.getMemory(memoryId);
        if (memory) {
          this.repository.updateMemory(memory.id, {
            status: "unresolved",
            confidence: conflictConfidence(memory.confidence)
          });
        }
      }
      const previousState = this.repository.requireAgent(input.agentId).currentState;
      const nextState = stateForOpenContradictions(contradiction.severity);
      this.repository.updateAgentState(input.agentId, nextState, "contradiction_opened", input.threadId);
      this.repository.createAuditEvent({
        agentId: input.agentId,
        threadId: input.threadId,
        eventType: "contradiction_opened",
        summary: contradiction.summary,
        previousState,
        nextState
      });
    }

    if (contradictions.length === 0) {
      this.repository.createAuditEvent({
        agentId: input.agentId,
        threadId: input.threadId,
        eventType: "claim_recorded",
        summary: "Claim recorded with no contradiction detected."
      });
    }

    return { claim, contradictions };
  }

  submitClarification(input: {
    agentId: string;
    threadId: string;
    contradictionId: string;
    content: string;
    source: string;
  }): ClarificationRecord {
    const contradiction = this.repository.getContradiction(input.contradictionId);
    if (!contradiction) {
      throw new Error(`Contradiction not found: ${input.contradictionId}`);
    }
    const clarification = this.repository.createClarification(input);
    this.repository.resolveContradiction(input.contradictionId);

    const text = input.content.toLowerCase();
    for (const memoryId of contradiction.memoryIds) {
      const memory = this.repository.getMemory(memoryId);
      if (!memory) {
        continue;
      }
      if (text.includes("rejected") || text.includes("earlier")) {
        this.repository.updateMemory(memoryId, {
          status: "rejected_prior_option",
          confidence: 0.62,
          confidenceBasis: "clarification"
        });
      }
    }

    for (const claimId of contradiction.claimIds) {
      const claim = this.repository.getClaim(claimId);
      if (claim) {
        this.repository.createMemory({
          agentId: claim.agentId,
          threadId: claim.threadId,
          content: claim.content,
          source: input.source,
          confidence: 0.92,
          confidenceBasis: "clarification",
          status: "active"
        });
      }
    }

    this.repository.createAuditEvent({
      agentId: input.agentId,
      threadId: input.threadId,
      eventType: "clarification_logged",
      summary: "Clarification logged and contradiction marked resolved."
    });
    return clarification;
  }

  reviewItem(input: {
    agentId: string;
    targetType: ReviewRecord["targetType"];
    targetId: string;
    reviewer: string;
    decision: ReviewRecord["decision"];
    rationale: string;
  }): ReviewRecord {
    const review = this.repository.createReview(input);
    this.repository.createAuditEvent({
      agentId: input.agentId,
      eventType: "review_recorded",
      summary: `${input.reviewer} recorded ${input.decision} for ${input.targetType}:${input.targetId}.`
    });
    return review;
  }

  attemptRecovery(input: { agentId: string; threadId: string }): { recovered: boolean; reason: string } {
    const open = this.repository.listContradictions(input.threadId, "open");
    const blocking = unresolvedBlockingContradictions(open);
    if (blocking.length > 0) {
      this.repository.createAuditEvent({
        agentId: input.agentId,
        threadId: input.threadId,
        eventType: "recovery_blocked",
        summary: "ACTIVE_STABLE recovery blocked because unresolved contradictions remain."
      });
      return {
        recovered: false,
        reason: "Recovery requires clarification or review resolution for all blocking/open contradictions."
      };
    }

    const previousState = this.repository.requireAgent(input.agentId).currentState;
    this.repository.updateAgentState(input.agentId, "RECOVERY", "recovery_started", input.threadId);
    this.repository.createAuditEvent({
      agentId: input.agentId,
      threadId: input.threadId,
      eventType: "recovery_started",
      summary: "Recovery started after contradictions were resolved.",
      previousState,
      nextState: "RECOVERY"
    });
    this.repository.updateAgentState(input.agentId, "ACTIVE_STABLE", "recovery_completed", input.threadId);
    this.repository.createAuditEvent({
      agentId: input.agentId,
      threadId: input.threadId,
      eventType: "recovery_completed",
      summary: "Agent returned to ACTIVE_STABLE after clarification-gated recovery.",
      previousState: "RECOVERY",
      nextState: "ACTIVE_STABLE"
    });
    return { recovered: true, reason: "Recovery completed." };
  }

  getAgentState(agentId: string): { state: AgentState; snapshots: ReturnType<AtcbRepository["listStateSnapshots"]> } {
    const agent = this.repository.requireAgent(agentId);
    return {
      state: agent.currentState,
      snapshots: this.repository.listStateSnapshots(agentId)
    };
  }

  getThreadSummary(threadId: string): ThreadSummary {
    const thread = this.repository.getThread(threadId);
    if (!thread) {
      throw new Error(`Thread not found: ${threadId}`);
    }
    return {
      thread,
      memories: this.repository.listMemories(threadId),
      claims: this.repository.listClaims(threadId),
      contradictions: this.repository.listContradictions(threadId),
      reviews: this.repository.listReviews(threadId),
      auditEvents: this.repository.listAudit({ threadId })
    };
  }

  getAuditTrail(input: { agentId?: string; threadId?: string } = {}): AuditEvent[] {
    return this.repository.listAudit(input);
  }
}
