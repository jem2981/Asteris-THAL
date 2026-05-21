import type { ReviewResult } from "./types.js";

const disallowedSignals = [
  "private corpus",
  "identity archive",
  "personal memory",
  "proprietary design document",
  "sentience claim",
  "framework merger",
  "ownership transfer"
];

export function reviewBoundary(content: string): ReviewResult {
  const hits = disallowedSignals.filter((signal) => content.toLowerCase().includes(signal));
  if (hits.length > 0) {
    return {
      approved: false,
      riskLevel: "high",
      reasons: hits.map((signal) => `Boundary signal rejected: ${signal}`)
    };
  }

  return {
    approved: true,
    riskLevel: "low",
    reasons: ["Fictional placeholder continuity data only."]
  };
}
