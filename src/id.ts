export class IdSequence {
  private counts = new Map<string, number>();

  next(prefix: string): string {
    const nextValue = (this.counts.get(prefix) ?? 0) + 1;
    this.counts.set(prefix, nextValue);
    return `${prefix}-${String(nextValue).padStart(4, "0")}`;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}
