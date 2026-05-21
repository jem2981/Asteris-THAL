import { IdSequence, nowIso } from "./id.js";
import type { ConflictRecord, MemoryRecord } from "./types.js";

type Material = "carbon_fiber" | "aluminum";

function projectHeliosMentioned(content: string): boolean {
  return /project\s+helios/i.test(content);
}

function extractMaterial(content: string): Material | undefined {
  if (/\b(uses?|using|current design is)\s+aluminum\b/i.test(content) || /\bit uses aluminum\b/i.test(content)) {
    return "aluminum";
  }
  if (/\bdoes not use carbon[-\s]?fiber\b/i.test(content)) {
    return /\baluminum\b/i.test(content) ? "aluminum" : undefined;
  }
  if (/\b(uses?|using|current design is)\s+carbon[-\s]?fiber\b/i.test(content)) {
    return "carbon_fiber";
  }
  if (/\bcarbon[-\s]?fiber\b/i.test(content)) {
    return "carbon_fiber";
  }
  if (/\baluminum\b/i.test(content)) {
    return "aluminum";
  }
  return undefined;
}

export class CoherenceMonitor {
  private readonly conflicts = new Map<string, ConflictRecord>();

  constructor(private readonly ids: IdSequence) {}

  detectConflict(newRecord: MemoryRecord, priorRecords: MemoryRecord[]): ConflictRecord | undefined {
    const newMaterial = extractMaterial(newRecord.content);
    if (!newMaterial || !projectHeliosMentioned(newRecord.content)) {
      return undefined;
    }

    const priorConflict = priorRecords.find((record) => {
      const priorMaterial = extractMaterial(record.content);
      return (
        record.id !== newRecord.id &&
        projectHeliosMentioned(record.content) &&
        priorMaterial !== undefined &&
        priorMaterial !== newMaterial
      );
    });

    if (!priorConflict) {
      return undefined;
    }

    const conflict: ConflictRecord = {
      id: this.ids.next("conflict"),
      threadId: newRecord.threadId,
      memoryIds: [priorConflict.id, newRecord.id],
      type: "project_material_contradiction",
      summary: "New claim conflicts with prior Project Helios material memory.",
      resolutionStatus: "needs_clarification",
      createdAt: nowIso()
    };
    this.conflicts.set(conflict.id, conflict);
    return conflict;
  }

  resolve(conflictId: string): ConflictRecord {
    const conflict = this.require(conflictId);
    const resolved: ConflictRecord = {
      ...conflict,
      resolutionStatus: "resolved",
      resolvedAt: nowIso()
    };
    this.conflicts.set(conflictId, resolved);
    return resolved;
  }

  require(conflictId: string): ConflictRecord {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict not found: ${conflictId}`);
    }
    return conflict;
  }

  all(): ConflictRecord[] {
    return [...this.conflicts.values()];
  }
}
