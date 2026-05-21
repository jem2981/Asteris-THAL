import { IdSequence, nowIso } from "./id.js";
import type { AgentState, AuditEvent } from "./types.js";

export class AuditLog {
  private readonly events: AuditEvent[] = [];

  constructor(private readonly ids: IdSequence) {}

  write(input: {
    eventType: string;
    summary: string;
    threadId?: string;
    previousState?: AgentState;
    nextState?: AgentState;
  }): AuditEvent {
    const event: AuditEvent = {
      id: this.ids.next("audit"),
      eventType: input.eventType,
      threadId: input.threadId,
      summary: input.summary,
      previousState: input.previousState,
      nextState: input.nextState,
      createdAt: nowIso()
    };
    this.events.push(event);
    return event;
  }

  all(): AuditEvent[] {
    return [...this.events];
  }
}
