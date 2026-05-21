import type { AuditEvent, ChoirReviewResult, ConflictRecord, MemoryRecord, ReviewResult } from "../types.js";

export interface ScenarioResult {
  id: string;
  title: string;
  initialState: string;
  eventReceived: string;
  reviewResult: ReviewResult | ChoirReviewResult;
  stateTransition: string;
  auditEvents: AuditEvent[];
  finalState: string;
  memories: MemoryRecord[];
  conflicts: ConflictRecord[];
  passed: boolean;
}

export function formatScenario(result: ScenarioResult): string {
  const status = result.passed ? "PASS" : "FAIL";
  const auditLines =
    result.auditEvents.length > 0
      ? result.auditEvents.map((event) => `  - ${event.eventType}: ${event.summary}`).join("\n")
      : "  - none";

  return [
    `Scenario: ${result.title}`,
    `Initial state: ${result.initialState}`,
    `Event received: ${result.eventReceived}`,
    `Review result: ${"finalRecommendation" in result.reviewResult ? result.reviewResult.finalRecommendation : result.reviewResult.approved ? "approved" : "blocked"}`,
    `State transition: ${result.stateTransition}`,
    "Audit events:",
    auditLines,
    `Final state: ${result.finalState}`,
    `Result: ${status}`
  ].join("\n");
}
