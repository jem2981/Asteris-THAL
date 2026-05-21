import type { MemoryRecord } from "./types.js";

export function lowerForUnresolvedConflict(record: MemoryRecord): number {
  return Math.min(record.confidence, 0.5);
}

export function confidenceForClarifiedCurrentDesign(): number {
  return 0.95;
}

export function confidenceForRejectedPriorOption(record: MemoryRecord): number {
  return Math.min(record.confidence, 0.8);
}
