export function ensureThreadTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("Thread title is required.");
  }
  return trimmed;
}
