import { IdSequence, nowIso } from "./id.js";
import type { ReviewFeedbackItem } from "./types.js";

export class ChangeControlLedger {
  private readonly feedback = new Map<string, ReviewFeedbackItem>();

  constructor(private readonly ids = new IdSequence()) {}

  record(input: Omit<ReviewFeedbackItem, "id" | "createdAt">): ReviewFeedbackItem {
    const item: ReviewFeedbackItem = {
      id: this.ids.next("feedback"),
      createdAt: nowIso(),
      ...input
    };
    this.feedback.set(item.id, item);
    return item;
  }

  all(): ReviewFeedbackItem[] {
    return [...this.feedback.values()];
  }
}
