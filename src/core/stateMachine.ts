import type { AgentState } from "../contracts/publicTypes.js";

export function stateForOpenContradictions(severity: "low" | "medium" | "high" | "blocking"): AgentState {
  if (severity === "blocking") {
    return "LOCKED";
  }
  if (severity === "high") {
    return "CONFLICT";
  }
  return "UNCERTAIN";
}

export function canReturnStable(openBlockingCount: number): boolean {
  return openBlockingCount === 0;
}
