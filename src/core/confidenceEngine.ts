import type { ConfidenceBasis } from "../contracts/publicTypes.js";

export function scoreConfidence(input: { confidence?: number; basis?: ConfidenceBasis }): number {
  if (typeof input.confidence === "number") {
    return Math.max(0, Math.min(1, input.confidence));
  }
  switch (input.basis) {
    case "clarification":
      return 0.92;
    case "reviewer_decision":
      return 0.88;
    case "direct_user_statement":
      return 0.8;
    case "system_observation":
      return 0.74;
    case "imported_record":
      return 0.6;
    default:
      return 0.5;
  }
}

export function conflictConfidence(confidence: number): number {
  return Math.max(0.2, Math.min(confidence, 0.45));
}
