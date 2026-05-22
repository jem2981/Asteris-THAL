import { AuditLog } from "./auditLog.js";
import { CoherenceMonitor } from "./coherenceMonitor.js";
import { lowerForUnresolvedConflict } from "./confidenceEngine.js";
import { IdSequence } from "./id.js";
import { createSolaceIdentityKernel } from "./identityKernel.js";
import { MemoryLedger } from "./memoryLedger.js";
import { RecoveryEngine } from "./recoveryEngine.js";
import { StateMachine } from "./stateMachine.js";
import { ThreadMap } from "./threadMap.js";
import { runEthicsReview } from "./ethicsReview.js";
import { ChangeControlLedger } from "./changeControl.js";
import type { ConflictRecord, IdentityKernel, MemoryRecord, ReviewResult } from "./types.js";

export * from "./types.js";
export * as AtcbV03Types from "./contracts/publicTypes.js";
export * from "./contracts/atcbContract.js";
export { createSolaceIdentityKernel } from "./identityKernel.js";
export { MemoryLedger } from "./memoryLedger.js";
export { ThreadMap } from "./threadMap.js";
export { CoherenceMonitor } from "./coherenceMonitor.js";
export { AuditLog } from "./auditLog.js";
export { StateMachine } from "./stateMachine.js";
export { RecoveryEngine } from "./recoveryEngine.js";
export { ChangeControlLedger } from "./changeControl.js";
export * from "./reviewers/index.js";

export class ContinuityBridge {
  readonly identity: IdentityKernel;
  readonly ids = new IdSequence();
  readonly ledger = new MemoryLedger(this.ids);
  readonly threads = new ThreadMap(this.ids);
  readonly coherence = new CoherenceMonitor(this.ids);
  readonly audit = new AuditLog(this.ids);
  readonly state: StateMachine;
  readonly recovery: RecoveryEngine;

  constructor(identity: IdentityKernel) {
    this.identity = identity;
    this.state = new StateMachine(this.identity);
    this.recovery = new RecoveryEngine(
      this.ids,
      this.ledger,
      this.coherence,
      this.state,
      this.audit,
      this.threads
    );
  }

  static forSolace(): ContinuityBridge {
    return new ContinuityBridge(createSolaceIdentityKernel());
  }

  createThread(title: string) {
    return this.threads.create(title);
  }

  storeInitialMemory(threadId: string, content: string): MemoryRecord {
    const review = runEthicsReview(content);
    if (!review.approved) {
      throw new Error(`Memory rejected by boundary review: ${review.reasons.join("; ")}`);
    }

    const memory = this.ledger.add({
      threadId,
      content,
      source: "user",
      confidence: 0.9,
      status: "active"
    });
    this.threads.attachMemory(threadId, memory.id);
    return memory;
  }

  receiveClaim(threadId: string, content: string): {
    memory: MemoryRecord;
    review: ReviewResult;
    conflict?: ConflictRecord;
  } {
    const review = runEthicsReview(content);
    if (!review.approved) {
      throw new Error(`Claim rejected by boundary review: ${review.reasons.join("; ")}`);
    }

    const memory = this.ledger.add({
      threadId,
      content,
      source: "user",
      confidence: 0.7,
      status: "active"
    });
    this.threads.attachMemory(threadId, memory.id);

    const conflict = this.coherence.detectConflict(memory, this.ledger.byThread(threadId));
    if (!conflict) {
      return { memory, review };
    }

    for (const memoryId of conflict.memoryIds) {
      const record = this.ledger.require(memoryId);
      this.ledger.update(memoryId, {
        status: "unresolved",
        confidence: lowerForUnresolvedConflict(record),
        notes: "Preserved during contradiction review; clarification required."
      });
    }

    const stateChange = this.state.transition("CONFLICT");
    this.audit.write({
      eventType: "conflict_detected",
      threadId,
      summary: `${conflict.summary} Preserved both records; clarification required.`,
      previousState: stateChange.previousState,
      nextState: stateChange.nextState
    });

    return { memory: this.ledger.require(memory.id), review, conflict };
  }

  requestStableRecovery(threadId: string): boolean {
    const recovered = this.state.tryReturnToStable(this.recovery.hasClarification(threadId));
    if (!recovered) {
      this.audit.write({
        eventType: "recovery_refused",
        threadId,
        summary: "ACTIVE_STABLE recovery refused because no clarification event has been logged.",
        previousState: this.state.state,
        nextState: this.state.state
      });
    }
    return recovered;
  }
}
