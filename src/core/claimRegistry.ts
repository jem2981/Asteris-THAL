export function ensureClaimContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("Claim content is required.");
  }
  return trimmed;
}
