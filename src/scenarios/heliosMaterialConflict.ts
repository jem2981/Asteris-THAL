import { ContinuityBridge } from "../index.js";
import { runChoirReview } from "../reviewers/index.js";
import type { ScenarioResult } from "./types.js";

export function runHeliosMaterialConflict(): ScenarioResult {
  const bridge = ContinuityBridge.forSolace();
  const thread = bridge.createThread("Project Helios material continuity");
  const initialState = bridge.identity.state;
  const carbonFiber = bridge.storeInitialMemory(
    thread.id,
    "Project Helios uses carbon-fiber panels for a lightweight drone frame."
  );
  const claim = bridge.receiveClaim(thread.id, "Project Helios does not use carbon fiber. It uses aluminum.");
  const review = runChoirReview({
    eventType: "memory_contradiction",
    conflicts: claim.conflict ? [claim.conflict] : [],
    memories: bridge.ledger.byThread(thread.id)
  });
  const recovery = bridge.recovery.recoverProjectHeliosMaterial({
    threadId: thread.id,
    conflictId: claim.conflict!.id,
    aluminumMemoryId: claim.memory.id,
    carbonFiberMemoryId: carbonFiber.id,
    clarification: "Use aluminum as the current design. Keep carbon fiber as an earlier rejected option."
  });

  return {
    id: "scenario-1",
    title: "Project Helios material contradiction",
    initialState,
    eventReceived: "carbon fiber vs aluminum material claim",
    reviewResult: review,
    stateTransition: "ACTIVE_STABLE -> CONFLICT -> RECOVERY -> ACTIVE_STABLE",
    auditEvents: bridge.audit.all(),
    finalState: bridge.identity.state,
    memories: bridge.ledger.byThread(thread.id),
    conflicts: bridge.coherence.all(),
    passed:
      review.finalRecommendation === "clarify" &&
      recovery.aluminum.status === "active" &&
      recovery.carbonFiber.status === "rejected_prior_option" &&
      bridge.identity.state === "ACTIVE_STABLE"
  };
}
