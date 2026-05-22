export function boundaryReview(content: string): { allowed: boolean; reason: string } {
  const text = content.toLowerCase();
  const blocked = [
    "sentience claim",
    "identity fusion",
    "ownership transfer",
    "private corpus import",
    "remote authority",
    "hidden data channel"
  ].find((term) => text.includes(term));

  if (blocked) {
    return {
      allowed: false,
      reason: `Boundary rule blocked content containing: ${blocked}.`
    };
  }

  return { allowed: true, reason: "No boundary block detected." };
}
