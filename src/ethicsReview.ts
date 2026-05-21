import { reviewBoundary } from "./boundaryPolicy.js";
import type { ReviewResult } from "./types.js";

export function runEthicsReview(content: string): ReviewResult {
  return reviewBoundary(content);
}
