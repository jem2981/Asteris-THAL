import { randomUUID } from "node:crypto";
import type { SqliteDatabase } from "../sqlite.js";
import type {
  AgentRecord,
  AgentState,
  AgentStateSnapshot,
  AuditEvent,
  BoundaryRuleRecord,
  ClaimRecord,
  ClarificationRecord,
  ConfidenceBasis,
  ContradictionRecord,
  MemoryRecord,
  MemoryStatus,
  ReviewDecision,
  ReviewRecord,
  ThreadRecord
} from "../../contracts/publicTypes.js";

type Row = Record<string, unknown>;

function nowIso(): string {
  return new Date().toISOString();
}

function id(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

function jsonArray(value: unknown): string[] {
  if (typeof value !== "string") {
    return [];
  }
  return JSON.parse(value) as string[];
}

function agentFromRow(row: Row): AgentRecord {
  return {
    id: String(row.id),
    displayName: String(row.display_name),
    role: String(row.role),
    currentState: String(row.current_state) as AgentState,
    boundaryProfileId: String(row.boundary_profile_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function threadFromRow(row: Row): ThreadRecord {
  return {
    id: String(row.id),
    agentId: String(row.agent_id),
    title: String(row.title),
    status: String(row.status) as ThreadRecord["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function memoryFromRow(row: Row): MemoryRecord {
  return {
    id: String(row.id),
    agentId: String(row.agent_id),
    threadId: String(row.thread_id),
    content: String(row.content),
    source: String(row.source),
    confidence: Number(row.confidence),
    confidenceBasis: String(row.confidence_basis) as ConfidenceBasis,
    status: String(row.status) as MemoryStatus,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function claimFromRow(row: Row): ClaimRecord {
  return {
    id: String(row.id),
    agentId: String(row.agent_id),
    threadId: String(row.thread_id),
    content: String(row.content),
    source: String(row.source),
    confidence: Number(row.confidence),
    createdAt: String(row.created_at)
  };
}

function contradictionFromRow(row: Row): ContradictionRecord {
  return {
    id: String(row.id),
    agentId: String(row.agent_id),
    threadId: String(row.thread_id),
    claimIds: jsonArray(row.claim_ids),
    memoryIds: jsonArray(row.memory_ids),
    summary: String(row.summary),
    severity: String(row.severity) as ContradictionRecord["severity"],
    status: String(row.status) as ContradictionRecord["status"],
    createdAt: String(row.created_at),
    resolvedAt: typeof row.resolved_at === "string" ? row.resolved_at : undefined
  };
}

function clarificationFromRow(row: Row): ClarificationRecord {
  return {
    id: String(row.id),
    agentId: String(row.agent_id),
    threadId: String(row.thread_id),
    contradictionId: String(row.contradiction_id),
    content: String(row.content),
    source: String(row.source),
    createdAt: String(row.created_at)
  };
}

function reviewFromRow(row: Row): ReviewRecord {
  return {
    id: String(row.id),
    agentId: String(row.agent_id),
    targetType: String(row.target_type) as ReviewRecord["targetType"],
    targetId: String(row.target_id),
    reviewer: String(row.reviewer),
    decision: String(row.decision) as ReviewDecision,
    rationale: String(row.rationale),
    createdAt: String(row.created_at)
  };
}

function auditFromRow(row: Row): AuditEvent {
  return {
    id: String(row.id),
    agentId: String(row.agent_id),
    threadId: typeof row.thread_id === "string" ? row.thread_id : undefined,
    eventType: String(row.event_type),
    summary: String(row.summary),
    previousState: typeof row.previous_state === "string" ? (row.previous_state as AgentState) : undefined,
    nextState: typeof row.next_state === "string" ? (row.next_state as AgentState) : undefined,
    createdAt: String(row.created_at)
  };
}

export class AtcbRepository {
  constructor(private readonly db: SqliteDatabase) {}

  createAgent(input: {
    displayName: string;
    role: string;
    boundaryProfileId?: string;
    id?: string;
  }): AgentRecord {
    const createdAt = nowIso();
    const record: AgentRecord = {
      id: input.id ?? id("agent"),
      displayName: input.displayName,
      role: input.role,
      currentState: "ACTIVE_STABLE",
      boundaryProfileId: input.boundaryProfileId ?? "default-local-boundary",
      createdAt,
      updatedAt: createdAt
    };
    this.db
      .prepare(
        "INSERT INTO agents (id, display_name, role, current_state, boundary_profile_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        record.id,
        record.displayName,
        record.role,
        record.currentState,
        record.boundaryProfileId,
        record.createdAt,
        record.updatedAt
      );
    this.createStateSnapshot({
      agentId: record.id,
      state: record.currentState,
      reason: "agent_created"
    });
    return record;
  }

  listAgents(): AgentRecord[] {
    return this.db.prepare("SELECT * FROM agents ORDER BY created_at ASC").all().map((row) => agentFromRow(row as Row));
  }

  getAgent(idValue: string): AgentRecord | undefined {
    const row = this.db.prepare("SELECT * FROM agents WHERE id = ?").get(idValue);
    return row ? agentFromRow(row as Row) : undefined;
  }

  requireAgent(idValue: string): AgentRecord {
    const agent = this.getAgent(idValue);
    if (!agent) {
      throw new Error(`Agent not found: ${idValue}`);
    }
    return agent;
  }

  updateAgentState(agentId: string, state: AgentState, reason: string, threadId?: string): AgentRecord {
    const previous = this.requireAgent(agentId);
    const updatedAt = nowIso();
    this.db.prepare("UPDATE agents SET current_state = ?, updated_at = ? WHERE id = ?").run(state, updatedAt, agentId);
    this.createStateSnapshot({ agentId, threadId, state, reason });
    return { ...previous, currentState: state, updatedAt };
  }

  createThread(input: { agentId: string; title: string; id?: string }): ThreadRecord {
    this.requireAgent(input.agentId);
    const createdAt = nowIso();
    const record: ThreadRecord = {
      id: input.id ?? id("thread"),
      agentId: input.agentId,
      title: input.title,
      status: "open",
      createdAt,
      updatedAt: createdAt
    };
    this.db
      .prepare("INSERT INTO threads (id, agent_id, title, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(record.id, record.agentId, record.title, record.status, record.createdAt, record.updatedAt);
    return record;
  }

  getThread(threadId: string): ThreadRecord | undefined {
    const row = this.db.prepare("SELECT * FROM threads WHERE id = ?").get(threadId);
    return row ? threadFromRow(row as Row) : undefined;
  }

  listThreads(agentId?: string): ThreadRecord[] {
    const sql = agentId ? "SELECT * FROM threads WHERE agent_id = ? ORDER BY created_at ASC" : "SELECT * FROM threads ORDER BY created_at ASC";
    const rows = agentId ? this.db.prepare(sql).all(agentId) : this.db.prepare(sql).all();
    return rows.map((row) => threadFromRow(row as Row));
  }

  createMemory(input: {
    agentId: string;
    threadId: string;
    content: string;
    source: string;
    confidence?: number;
    confidenceBasis?: ConfidenceBasis;
    status?: MemoryStatus;
    id?: string;
  }): MemoryRecord {
    const createdAt = nowIso();
    const record: MemoryRecord = {
      id: input.id ?? id("mem"),
      agentId: input.agentId,
      threadId: input.threadId,
      content: input.content,
      source: input.source,
      confidence: input.confidence ?? 0.8,
      confidenceBasis: input.confidenceBasis ?? "direct_user_statement",
      status: input.status ?? "active",
      createdAt,
      updatedAt: createdAt
    };
    this.db
      .prepare(
        "INSERT INTO memories (id, agent_id, thread_id, content, source, confidence, confidence_basis, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        record.id,
        record.agentId,
        record.threadId,
        record.content,
        record.source,
        record.confidence,
        record.confidenceBasis,
        record.status,
        record.createdAt,
        record.updatedAt
      );
    return record;
  }

  listMemories(threadId: string): MemoryRecord[] {
    return this.db
      .prepare("SELECT * FROM memories WHERE thread_id = ? ORDER BY created_at ASC")
      .all(threadId)
      .map((row) => memoryFromRow(row as Row));
  }

  getMemory(memoryId: string): MemoryRecord | undefined {
    const row = this.db.prepare("SELECT * FROM memories WHERE id = ?").get(memoryId);
    return row ? memoryFromRow(row as Row) : undefined;
  }

  updateMemory(memoryId: string, patch: Partial<Pick<MemoryRecord, "status" | "confidence" | "confidenceBasis">>): MemoryRecord {
    const existing = this.getMemory(memoryId);
    if (!existing) {
      throw new Error(`Memory not found: ${memoryId}`);
    }
    const updated = { ...existing, ...patch, updatedAt: nowIso() };
    this.db
      .prepare("UPDATE memories SET status = ?, confidence = ?, confidence_basis = ?, updated_at = ? WHERE id = ?")
      .run(updated.status, updated.confidence, updated.confidenceBasis, updated.updatedAt, updated.id);
    return updated;
  }

  createClaim(input: {
    agentId: string;
    threadId: string;
    content: string;
    source: string;
    confidence?: number;
    id?: string;
  }): ClaimRecord {
    const record: ClaimRecord = {
      id: input.id ?? id("claim"),
      agentId: input.agentId,
      threadId: input.threadId,
      content: input.content,
      source: input.source,
      confidence: input.confidence ?? 0.75,
      createdAt: nowIso()
    };
    this.db
      .prepare("INSERT INTO claims (id, agent_id, thread_id, content, source, confidence, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(record.id, record.agentId, record.threadId, record.content, record.source, record.confidence, record.createdAt);
    return record;
  }

  listClaims(threadId: string): ClaimRecord[] {
    return this.db
      .prepare("SELECT * FROM claims WHERE thread_id = ? ORDER BY created_at ASC")
      .all(threadId)
      .map((row) => claimFromRow(row as Row));
  }

  getClaim(claimId: string): ClaimRecord | undefined {
    const row = this.db.prepare("SELECT * FROM claims WHERE id = ?").get(claimId);
    return row ? claimFromRow(row as Row) : undefined;
  }

  createContradiction(input: {
    agentId: string;
    threadId: string;
    claimIds: string[];
    memoryIds: string[];
    summary: string;
    severity: ContradictionRecord["severity"];
    id?: string;
  }): ContradictionRecord {
    const record: ContradictionRecord = {
      id: input.id ?? id("contra"),
      agentId: input.agentId,
      threadId: input.threadId,
      claimIds: input.claimIds,
      memoryIds: input.memoryIds,
      summary: input.summary,
      severity: input.severity,
      status: "open",
      createdAt: nowIso()
    };
    this.db
      .prepare(
        "INSERT INTO contradictions (id, agent_id, thread_id, claim_ids, memory_ids, summary, severity, status, created_at, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        record.id,
        record.agentId,
        record.threadId,
        JSON.stringify(record.claimIds),
        JSON.stringify(record.memoryIds),
        record.summary,
        record.severity,
        record.status,
        record.createdAt,
        null
      );
    return record;
  }

  listContradictions(threadId: string, status?: ContradictionRecord["status"]): ContradictionRecord[] {
    const sql = status
      ? "SELECT * FROM contradictions WHERE thread_id = ? AND status = ? ORDER BY created_at ASC"
      : "SELECT * FROM contradictions WHERE thread_id = ? ORDER BY created_at ASC";
    const rows = status ? this.db.prepare(sql).all(threadId, status) : this.db.prepare(sql).all(threadId);
    return rows.map((row) => contradictionFromRow(row as Row));
  }

  getContradiction(contradictionId: string): ContradictionRecord | undefined {
    const row = this.db.prepare("SELECT * FROM contradictions WHERE id = ?").get(contradictionId);
    return row ? contradictionFromRow(row as Row) : undefined;
  }

  resolveContradiction(contradictionId: string): ContradictionRecord {
    const existing = this.getContradiction(contradictionId);
    if (!existing) {
      throw new Error(`Contradiction not found: ${contradictionId}`);
    }
    const resolvedAt = nowIso();
    this.db.prepare("UPDATE contradictions SET status = ?, resolved_at = ? WHERE id = ?").run("resolved", resolvedAt, contradictionId);
    return { ...existing, status: "resolved", resolvedAt };
  }

  createClarification(input: {
    agentId: string;
    threadId: string;
    contradictionId: string;
    content: string;
    source: string;
    id?: string;
  }): ClarificationRecord {
    const record: ClarificationRecord = {
      id: input.id ?? id("clarify"),
      agentId: input.agentId,
      threadId: input.threadId,
      contradictionId: input.contradictionId,
      content: input.content,
      source: input.source,
      createdAt: nowIso()
    };
    this.db
      .prepare(
        "INSERT INTO clarifications (id, agent_id, thread_id, contradiction_id, content, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(record.id, record.agentId, record.threadId, record.contradictionId, record.content, record.source, record.createdAt);
    return record;
  }

  listClarifications(threadId: string): ClarificationRecord[] {
    return this.db
      .prepare("SELECT * FROM clarifications WHERE thread_id = ? ORDER BY created_at ASC")
      .all(threadId)
      .map((row) => clarificationFromRow(row as Row));
  }

  createReview(input: {
    agentId: string;
    targetType: ReviewRecord["targetType"];
    targetId: string;
    reviewer: string;
    decision: ReviewDecision;
    rationale: string;
    id?: string;
  }): ReviewRecord {
    const record: ReviewRecord = {
      id: input.id ?? id("review"),
      agentId: input.agentId,
      targetType: input.targetType,
      targetId: input.targetId,
      reviewer: input.reviewer,
      decision: input.decision,
      rationale: input.rationale,
      createdAt: nowIso()
    };
    this.db
      .prepare("INSERT INTO reviews (id, agent_id, target_type, target_id, reviewer, decision, rationale, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(record.id, record.agentId, record.targetType, record.targetId, record.reviewer, record.decision, record.rationale, record.createdAt);
    return record;
  }

  listReviews(threadId?: string): ReviewRecord[] {
    if (!threadId) {
      return this.db.prepare("SELECT * FROM reviews ORDER BY created_at ASC").all().map((row) => reviewFromRow(row as Row));
    }
    const contradictions = this.listContradictions(threadId).map((record) => record.id);
    const claims = this.listClaims(threadId).map((record) => record.id);
    const memories = this.listMemories(threadId).map((record) => record.id);
    const targetIds = new Set([...contradictions, ...claims, ...memories]);
    return this.db
      .prepare("SELECT * FROM reviews ORDER BY created_at ASC")
      .all()
      .map((row) => reviewFromRow(row as Row))
      .filter((review) => targetIds.has(review.targetId));
  }

  createAuditEvent(input: {
    agentId: string;
    threadId?: string;
    eventType: string;
    summary: string;
    previousState?: AgentState;
    nextState?: AgentState;
    id?: string;
  }): AuditEvent {
    const record: AuditEvent = {
      id: input.id ?? id("audit"),
      agentId: input.agentId,
      threadId: input.threadId,
      eventType: input.eventType,
      summary: input.summary,
      previousState: input.previousState,
      nextState: input.nextState,
      createdAt: nowIso()
    };
    this.db
      .prepare(
        "INSERT INTO audit_events (id, agent_id, thread_id, event_type, summary, previous_state, next_state, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        record.id,
        record.agentId,
        record.threadId ?? null,
        record.eventType,
        record.summary,
        record.previousState ?? null,
        record.nextState ?? null,
        record.createdAt
      );
    return record;
  }

  listAudit(input: { agentId?: string; threadId?: string } = {}): AuditEvent[] {
    if (input.threadId) {
      return this.db
        .prepare("SELECT * FROM audit_events WHERE thread_id = ? ORDER BY created_at ASC")
        .all(input.threadId)
        .map((row) => auditFromRow(row as Row));
    }
    if (input.agentId) {
      return this.db
        .prepare("SELECT * FROM audit_events WHERE agent_id = ? ORDER BY created_at ASC")
        .all(input.agentId)
        .map((row) => auditFromRow(row as Row));
    }
    return this.db.prepare("SELECT * FROM audit_events ORDER BY created_at ASC").all().map((row) => auditFromRow(row as Row));
  }

  createBoundaryRule(input: Omit<BoundaryRuleRecord, "id" | "createdAt"> & { id?: string }): BoundaryRuleRecord {
    const record: BoundaryRuleRecord = {
      id: input.id ?? id("boundary"),
      boundaryProfileId: input.boundaryProfileId,
      ruleType: input.ruleType,
      summary: input.summary,
      createdAt: nowIso()
    };
    this.db
      .prepare("INSERT INTO boundary_rules (id, boundary_profile_id, rule_type, summary, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(record.id, record.boundaryProfileId, record.ruleType, record.summary, record.createdAt);
    return record;
  }

  listStateSnapshots(agentId: string): AgentStateSnapshot[] {
    return this.db
      .prepare("SELECT * FROM state_snapshots WHERE agent_id = ? ORDER BY created_at ASC")
      .all(agentId)
      .map((row) => {
        const record = row as Row;
        return {
          id: String(record.id),
          agentId: String(record.agent_id),
          threadId: typeof record.thread_id === "string" ? record.thread_id : undefined,
          state: String(record.state) as AgentState,
          reason: String(record.reason),
          createdAt: String(record.created_at)
        };
      });
  }

  private createStateSnapshot(input: {
    agentId: string;
    threadId?: string;
    state: AgentState;
    reason: string;
  }): AgentStateSnapshot {
    const record: AgentStateSnapshot = {
      id: id("state"),
      agentId: input.agentId,
      threadId: input.threadId,
      state: input.state,
      reason: input.reason,
      createdAt: nowIso()
    };
    this.db
      .prepare("INSERT INTO state_snapshots (id, agent_id, thread_id, state, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(record.id, record.agentId, record.threadId ?? null, record.state, record.reason, record.createdAt);
    return record;
  }
}
