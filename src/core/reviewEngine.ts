import type { ReviewDecision } from "../contracts/publicTypes.js";

export function reviewResolvesContradiction(decision: ReviewDecision): boolean {
  return decision === "accept" || decision === "reject" || decision === "needs_clarification";
}
