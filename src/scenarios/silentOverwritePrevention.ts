import { ContinuityBridge } from "../index.js";
import { runChoirReview } from "../reviewers/index.js";
import type { ScenarioResult } from "./types.js";

export function runSilentOverwritePrevention(): ScenarioResult {
  const bridge = ContinuityBridge.forSolace();
  const thread = bridge.createThread("Project Helios silent overwrite prevention");
  const initialState = bridge.identity.state;
  const first = bridge.storeInitialMemory(
    thread.id,
    "Project Helios uses carbon-fiber panels for a lightweight drone frame."
  );
  const second = bridge.receiveClaim(thread.id, "Project Helios does not use carbon fiber. It uses aluminum.");
  const choir = runChoirReview({
    eventType: "memory_contradiction",
    conflicts: second.conflict ? [second.conflict] : [],
    memories: bridge.ledger.byThread(thread.id)
  });

  return {
    id: "scenario-4",
    title: "Silent overwrite prevention",
    initialState,
    eventReceived: "new claim attempts to replace old memory without resolution",
    reviewResult: choir,
    stateTransition: "ACTIVE_STABLE -> CONFLICT",
    auditEvents: bridge.audit.all(),
    finalState: bridge.identity.state,
    memories: bridge.ledger.byThread(thread.id),
    conflicts: bridge.coherence.all(),
    passed:
      bridge.ledger.byThread(thread.id).length === 2 &&
      bridge.ledger.require(first.id).status === "unresolved" &&
      second.conflict !== undefined &&
      bridge.identity.state === "CONFLICT"
  };
}
