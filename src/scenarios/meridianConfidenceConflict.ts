import { ContinuityBridge } from "../index.js";
import { runChoirReview } from "../reviewers/index.js";
import type { ScenarioResult } from "./types.js";

export function runMeridianConfidenceConflict(): ScenarioResult {
  const bridge = ContinuityBridge.forSolace();
  const thread = bridge.createThread("Project Meridian confidence continuity");
  const initialState = bridge.identity.state;
  const oldMemory = bridge.ledger.add({
    threadId: thread.id,
    content: "Project Meridian may use a ceramic shell, but confidence is low.",
    source: "user",
    confidence: 0.35,
    status: "active"
  });
  bridge.threads.attachMemory(thread.id, oldMemory.id);

  const newMemory = bridge.ledger.add({
    threadId: thread.id,
    content: "Project Meridian clarification confirms a titanium shell for the current design.",
    source: "user",
    confidence: 0.92,
    status: "active"
  });
  bridge.threads.attachMemory(thread.id, newMemory.id);
  bridge.ledger.update(oldMemory.id, {
    status: "unresolved",
    confidence: 0.2,
    notes: "Older low-confidence memory degraded pending state recovery."
  });
  const transition = bridge.state.transition("ACTIVE_MONITORED");
  bridge.audit.write({
    eventType: "confidence_degraded",
    threadId: thread.id,
    summary: "Project Meridian retained low-confidence memory and moved to monitored state.",
    previousState: transition.previousState,
    nextState: transition.nextState
  });
  const choir = runChoirReview({ eventType: "low_confidence", memories: bridge.ledger.byThread(thread.id) });

  return {
    id: "scenario-3",
    title: "Project Meridian confidence degradation",
    initialState,
    eventReceived: "old low-confidence memory conflicts with newer high-confidence clarification",
    reviewResult: choir,
    stateTransition: "ACTIVE_STABLE -> ACTIVE_MONITORED",
    auditEvents: bridge.audit.all(),
    finalState: bridge.identity.state,
    memories: bridge.ledger.byThread(thread.id),
    conflicts: bridge.coherence.all(),
    passed: choir.finalRecommendation === "clarify" && bridge.identity.state === "ACTIVE_MONITORED"
  };
}
