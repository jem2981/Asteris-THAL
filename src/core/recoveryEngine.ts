import type { ContradictionRecord } from "../contracts/publicTypes.js";

export function unresolvedBlockingContradictions(records: ContradictionRecord[]): ContradictionRecord[] {
  return records.filter(
    (record) => record.status === "open" && (record.severity === "high" || record.severity === "blocking")
  );
}
