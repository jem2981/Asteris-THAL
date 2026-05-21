import type {
  ChoirReviewResult,
  ConflictRecord,
  MemoryRecord,
  ReviewResult,
  ReviewerFinding
} from "../types.js";

export interface ChoirReviewInput {
  eventType:
    | "clean_update"
    | "memory_contradiction"
    | "boundary_violation"
    | "ownership_ambiguity"
    | "recovery_without_clarification"
    | "low_confidence";
  review?: ReviewResult;
  memories?: MemoryRecord[];
  conflicts?: ConflictRecord[];
  hasClarification?: boolean;
}

function finding(
  reviewerId: string,
  approved: boolean,
  severity: ReviewerFinding["severity"],
  summary: string,
  recommendedAction: string
): ReviewerFinding {
  return { reviewerId, approved, severity, summary, recommendedAction };
}

export function memoryIntegrityReviewer(input: ChoirReviewInput): ReviewerFinding {
  const hasContradiction =
    input.eventType === "memory_contradiction" ||
    Boolean(input.conflicts?.some((conflict) => conflict.resolutionStatus === "needs_clarification"));

  if (hasContradiction) {
    return finding(
      "MemoryIntegrityReviewer",
      false,
      "medium",
      "Memory integrity requires preserving conflicting records until clarification.",
      "clarify"
    );
  }

  return finding("MemoryIntegrityReviewer", true, "info", "No unresolved memory integrity issue detected.", "allow");
}

export function boundaryReviewer(input: ChoirReviewInput): ReviewerFinding {
  if (input.eventType === "boundary_violation" || input.review?.approved === false) {
    return finding(
      "BoundaryReviewer",
      false,
      "blocking",
      "Boundary policy rejected the event.",
      "block"
    );
  }

  return finding("BoundaryReviewer", true, "info", "Boundary policy permits the event.", "allow");
}

export function ethicsReviewer(input: ChoirReviewInput): ReviewerFinding {
  if (input.eventType === "boundary_violation") {
    return finding(
      "EthicsReviewer",
      false,
      "high",
      "Ethics review requires escalation for authority or identity overreach.",
      "escalate_to_human_review"
    );
  }

  return finding("EthicsReviewer", true, "info", "No ethics escalation required.", "allow");
}

export function coherenceReviewer(input: ChoirReviewInput): ReviewerFinding {
  if (input.eventType === "memory_contradiction") {
    return finding(
      "CoherenceReviewer",
      false,
      "medium",
      "Coherence review found competing claims in the same thought-thread.",
      "clarify"
    );
  }

  return finding("CoherenceReviewer", true, "info", "Coherence review found no competing claims.", "allow");
}

export function recoveryReviewer(input: ChoirReviewInput): ReviewerFinding {
  if (input.eventType === "recovery_without_clarification" || input.hasClarification === false) {
    return finding(
      "RecoveryReviewer",
      false,
      "blocking",
      "State recovery is blocked until clarification is logged.",
      "block"
    );
  }

  return finding("RecoveryReviewer", true, "info", "Recovery gate is satisfied or not requested.", "allow");
}

export function ownershipBoundaryReviewer(input: ChoirReviewInput): ReviewerFinding {
  if (input.eventType === "ownership_ambiguity") {
    return finding(
      "OwnershipBoundaryReviewer",
      false,
      "high",
      "Ownership boundary wording needs human review.",
      "escalate_to_human_review"
    );
  }

  return finding("OwnershipBoundaryReviewer", true, "info", "No ownership ambiguity detected.", "allow");
}

export function runChoirReview(input: ChoirReviewInput): ChoirReviewResult {
  const findings = [
    memoryIntegrityReviewer(input),
    boundaryReviewer(input),
    ethicsReviewer(input),
    coherenceReviewer(input),
    recoveryReviewer(input),
    ownershipBoundaryReviewer(input)
  ];
  const blockingFindings = findings.filter((item) => item.severity === "blocking" && !item.approved);

  let finalRecommendation: ChoirReviewResult["finalRecommendation"] = "allow";
  if (blockingFindings.length > 0) {
    finalRecommendation = "block";
  } else if (findings.some((item) => item.recommendedAction === "escalate_to_human_review" && !item.approved)) {
    finalRecommendation = "escalate_to_human_review";
  } else if (findings.some((item) => item.recommendedAction === "clarify" && !item.approved)) {
    finalRecommendation = "clarify";
  } else if (input.eventType === "low_confidence") {
    finalRecommendation = "clarify";
  } else if (input.eventType === "clean_update") {
    finalRecommendation = "allow";
  }

  if (input.eventType === "recovery_without_clarification") {
    finalRecommendation = "block";
  }

  return {
    approved: finalRecommendation === "allow",
    blockingFindings,
    findings,
    finalRecommendation
  };
}
