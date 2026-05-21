import { IdSequence } from "./id.js";
import type { ThreadRecord } from "./types.js";

export class ThreadMap {
  private readonly threads = new Map<string, ThreadRecord>();

  constructor(private readonly ids: IdSequence) {}

  create(title: string): ThreadRecord {
    const thread: ThreadRecord = {
      id: this.ids.next("thread"),
      title,
      memoryIds: [],
      status: "open"
    };
    this.threads.set(thread.id, thread);
    return thread;
  }

  attachMemory(threadId: string, memoryId: string): ThreadRecord {
    const thread = this.require(threadId);
    if (!thread.memoryIds.includes(memoryId)) {
      thread.memoryIds.push(memoryId);
    }
    return thread;
  }

  resolve(threadId: string): ThreadRecord {
    const thread = this.require(threadId);
    thread.status = "resolved";
    return thread;
  }

  require(threadId: string): ThreadRecord {
    const thread = this.threads.get(threadId);
    if (!thread) {
      throw new Error(`Thread not found: ${threadId}`);
    }
    return thread;
  }

  all(): ThreadRecord[] {
    return [...this.threads.values()];
  }
}
