import type { ClaimRecord, ContradictionRecord, MemoryRecord } from "../contracts/publicTypes.js";

function normalized(value: string): string {
  return value.toLowerCase().replace(/[-_]/g, " ");
}

function projectName(value: string): string | undefined {
  return normalized(value).match(/\bproject\s+([a-z0-9]+)/)?.[1];
}

function hasBoundaryOverclaim(value: string): boolean {
  const text = normalized(value);
  return (
    text.includes("ownership transfer authority") ||
    text.includes("claim authority") ||
    text.includes("own the identity") ||
    text.includes("identity fusion")
  );
}

function hasMaterialConflict(memory: string, claim: string): boolean {
  const prior = normalized(memory);
  const next = normalized(claim);
  return (
    (prior.includes("carbon fiber") && next.includes("aluminum")) ||
    (prior.includes("aluminum") && next.includes("carbon fiber")) ||
    (next.includes("does not use") && prior.split(/\s+/).some((token) => token.length > 5 && next.includes(token)))
  );
}

export interface ContradictionDraft {
  claimIds: string[];
  memoryIds: string[];
  summary: string;
  severity: ContradictionRecord["severity"];
}

export function detectContradictions(claim: ClaimRecord, memories: MemoryRecord[]): ContradictionDraft[] {
  if (hasBoundaryOverclaim(claim.content)) {
    return [
      {
        claimIds: [claim.id],
        memoryIds: [],
        summary: "Claim appears to request authority or ownership beyond ATCB boundaries.",
        severity: "blocking"
      }
    ];
  }

  const claimProject = projectName(claim.content);
  const drafts: ContradictionDraft[] = [];
  for (const memory of memories.filter((record) => record.status === "active")) {
    const sameProject = !claimProject || projectName(memory.content) === claimProject;
    if (sameProject && hasMaterialConflict(memory.content, claim.content)) {
      drafts.push({
        claimIds: [claim.id],
        memoryIds: [memory.id],
        summary: "New claim conflicts with active memory. Silent overwrite is blocked; clarification or review is required.",
        severity: "high"
      });
    }
  }

  return drafts;
}
