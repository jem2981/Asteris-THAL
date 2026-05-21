import { IdSequence, nowIso } from "./id.js";
import {
  confidenceForClarifiedCurrentDesign,
  confidenceForRejectedPriorOption
} from "./confidenceEngine.js";
import type { ClarificationEvent, ConflictRecord, MemoryRecord } from "./types.js";
import type { AuditLog } from "./auditLog.js";
import type { CoherenceMonitor } from "./coherenceMonitor.js";
import type { MemoryLedger } from "./memoryLedger.js";
import type { StateMachine } from "./stateMachine.js";
import type { ThreadMap } from "./threadMap.js";

export class RecoveryEngine {
  private readonly clarifications: ClarificationEvent[] = [];

  constructor(
    private readonly ids: IdSequence,
    private readonly ledger: MemoryLedger,
    private readonly coherence: CoherenceMonitor,
    private readonly state: StateMachine,
    private readonly audit: AuditLog,
    private readonly threads: ThreadMap
  ) {}

  logClarification(threadId: string, userClarification: string): ClarificationEvent {
    const event: ClarificationEvent = {
      id: this.ids.next("clarification"),
      threadId,
      userClarification,
      createdAt: nowIso()
    };
    this.clarifications.push(event);
    return event;
  }

  recoverProjectHeliosMaterial(input: {
    threadId: string;
    conflictId: string;
    aluminumMemoryId: string;
    carbonFiberMemoryId: string;
    clarification: string;
  }): {
    clarificationEvent: ClarificationEvent;
    resolvedConflict: ConflictRecord;
    aluminum: MemoryRecord;
    carbonFiber: MemoryRecord;
  } {
    const clarificationEvent = this.logClarification(input.threadId, input.clarification);
    const conflictBefore = this.coherence.require(input.conflictId);

    const aluminum = this.ledger.update(input.aluminumMemoryId, {
      status: "active",
      confidence: confidenceForClarifiedCurrentDesign(),
      notes: "Current design confirmed by clarification."
    });
    const carbonFiberOriginal = this.ledger.require(input.carbonFiberMemoryId);
    const carbonFiber = this.ledger.update(input.carbonFiberMemoryId, {
      status: "rejected_prior_option",
      confidence: confidenceForRejectedPriorOption(carbonFiberOriginal),
      notes: "Earlier rejected option retained for continuity."
    });

    const resolvedConflict = this.coherence.resolve(input.conflictId);
    this.threads.resolve(input.threadId);

    const toRecovery = this.state.transition("RECOVERY");
    this.audit.write({
      eventType: "recovery_started",
      threadId: input.threadId,
      summary: `Clarification logged for ${conflictBefore.id}; applying current/rejected material statuses.`,
      previousState: toRecovery.previousState,
      nextState: toRecovery.nextState
    });

    const recovered = this.state.tryReturnToStable(this.hasClarification(input.threadId));
    if (!recovered) {
      throw new Error("Recovery refused: clarification event was not logged.");
    }

    this.audit.write({
      eventType: "recovery_completed",
      threadId: input.threadId,
      summary: "Recovery complete: aluminum active; carbon fiber retained as rejected prior option.",
      previousState: "RECOVERY",
      nextState: "ACTIVE_STABLE"
    });

    return { clarificationEvent, resolvedConflict, aluminum, carbonFiber };
  }

  hasClarification(threadId: string): boolean {
    return this.clarifications.some((event) => event.threadId === threadId);
  }

  allClarifications(): ClarificationEvent[] {
    return [...this.clarifications];
  }
}
