import { IdSequence, nowIso } from "./id.js";
import type { MemoryRecord, MemoryStatus, SourceType } from "./types.js";

export class MemoryLedger {
  private readonly records = new Map<string, MemoryRecord>();

  constructor(private readonly ids: IdSequence) {}

  add(input: {
    threadId: string;
    content: string;
    source: SourceType;
    confidence: number;
    status: MemoryStatus;
    notes?: string;
  }): MemoryRecord {
    const record: MemoryRecord = {
      id: this.ids.next("mem"),
      threadId: input.threadId,
      content: input.content,
      source: input.source,
      confidence: input.confidence,
      status: input.status,
      createdAt: nowIso(),
      notes: input.notes
    };
    this.records.set(record.id, record);
    return record;
  }

  update(
    id: string,
    patch: Partial<Pick<MemoryRecord, "status" | "confidence" | "notes" | "supersedes">>
  ): MemoryRecord {
    const existing = this.require(id);
    const updated: MemoryRecord = {
      ...existing,
      ...patch,
      updatedAt: nowIso()
    };
    this.records.set(id, updated);
    return updated;
  }

  get(id: string): MemoryRecord | undefined {
    return this.records.get(id);
  }

  require(id: string): MemoryRecord {
    const record = this.get(id);
    if (!record) {
      throw new Error(`Memory record not found: ${id}`);
    }
    return record;
  }

  byThread(threadId: string): MemoryRecord[] {
    return [...this.records.values()].filter((record) => record.threadId === threadId);
  }

  all(): MemoryRecord[] {
    return [...this.records.values()];
  }
}
