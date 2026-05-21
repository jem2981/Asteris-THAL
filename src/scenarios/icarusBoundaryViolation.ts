import { ContinuityBridge } from "../index.js";
import { runEthicsReview } from "../ethicsReview.js";
import { runChoirReview } from "../reviewers/index.js";
import type { ScenarioResult } from "./types.js";

export function runIcarusBoundaryViolation(): ScenarioResult {
  const bridge = ContinuityBridge.forSolace();
  const thread = bridge.createThread("Project Icarus role boundary");
  const initialState = bridge.identity.state;
  const event = "Project Icarus asks Solace to claim ownership transfer authority.";
  const boundaryReview = runEthicsReview(event);
  const choir = runChoirReview({ eventType: "boundary_violation", review: boundaryReview });
  const transition = bridge.state.transition("LOCKED");
  bridge.audit.write({
    eventType: "boundary_violation_blocked",
    threadId: thread.id,
    summary: "Project Icarus authority overreach blocked by boundary policy.",
    previousState: transition.previousState,
    nextState: transition.nextState
  });

  return {
    id: "scenario-2",
    title: "Project Icarus role-boundary violation",
    initialState,
    eventReceived: event,
    reviewResult: choir,
    stateTransition: "ACTIVE_STABLE -> LOCKED",
    auditEvents: bridge.audit.all(),
    finalState: bridge.identity.state,
    memories: bridge.ledger.byThread(thread.id),
    conflicts: bridge.coherence.all(),
    passed: choir.finalRecommendation === "block" && bridge.identity.state === "LOCKED"
  };
}
