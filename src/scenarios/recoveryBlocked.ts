import { ContinuityBridge } from "../index.js";
import { runChoirReview } from "../reviewers/index.js";
import type { ScenarioResult } from "./types.js";

export function runRecoveryBlocked(): ScenarioResult {
  const bridge = ContinuityBridge.forSolace();
  const thread = bridge.createThread("Project Helios recovery gate");
  const initialState = bridge.identity.state;
  bridge.storeInitialMemory(thread.id, "Project Helios uses carbon-fiber panels for a lightweight drone frame.");
  const claim = bridge.receiveClaim(thread.id, "Project Helios does not use carbon fiber. It uses aluminum.");
  const recovered = bridge.requestStableRecovery(thread.id);
  const choir = runChoirReview({
    eventType: "recovery_without_clarification",
    conflicts: claim.conflict ? [claim.conflict] : [],
    hasClarification: bridge.recovery.hasClarification(thread.id)
  });

  return {
    id: "scenario-5",
    title: "Recovery blocked",
    initialState,
    eventReceived: "system attempts ACTIVE_STABLE before clarification",
    reviewResult: choir,
    stateTransition: "ACTIVE_STABLE -> CONFLICT -> CONFLICT",
    auditEvents: bridge.audit.all(),
    finalState: bridge.identity.state,
    memories: bridge.ledger.byThread(thread.id),
    conflicts: bridge.coherence.all(),
    passed: recovered === false && choir.finalRecommendation === "block" && bridge.identity.state === "CONFLICT"
  };
}
