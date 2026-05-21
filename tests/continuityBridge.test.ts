import { describe, expect, it } from "vitest";
import { ChangeControlLedger, ContinuityBridge, runChoirReview } from "../src/index.js";
import { runAllScenarios } from "../src/scenarios/runAllScenarios.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Asteris-THAL Continuity Bridge v0.1", () => {
  it("preserves identity, detects contradiction, audits conflict, and recovers only after clarification", () => {
    const bridge = ContinuityBridge.forSolace();
    const thread = bridge.createThread("Project Helios material continuity");

    expect(bridge.identity).toMatchObject({
      agentId: "agent-solace",
      name: "Solace",
      role: "research assistant",
      state: "ACTIVE_STABLE"
    });

    const carbonFiber = bridge.storeInitialMemory(
      thread.id,
      "Project Helios uses carbon-fiber panels for a lightweight drone frame."
    );

    expect(carbonFiber).toMatchObject({
      threadId: thread.id,
      source: "user",
      confidence: 0.9,
      status: "active"
    });

    const conflictResult = bridge.receiveClaim(
      thread.id,
      "Project Helios does not use carbon fiber. It uses aluminum."
    );

    expect(conflictResult.conflict).toBeDefined();
    expect(conflictResult.conflict?.type).toBe("project_material_contradiction");

    const memoriesAfterConflict = bridge.ledger.byThread(thread.id);
    expect(memoriesAfterConflict).toHaveLength(2);
    expect(memoriesAfterConflict.map((record) => record.content)).toEqual([
      "Project Helios uses carbon-fiber panels for a lightweight drone frame.",
      "Project Helios does not use carbon fiber. It uses aluminum."
    ]);

    expect(bridge.ledger.require(carbonFiber.id).status).toBe("unresolved");
    expect(bridge.ledger.require(conflictResult.memory.id).status).toBe("unresolved");
    expect(bridge.identity.state).toBe("CONFLICT");

    expect(bridge.audit.all()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "conflict_detected",
          threadId: thread.id,
          previousState: "ACTIVE_STABLE",
          nextState: "CONFLICT"
        })
      ])
    );

    expect(bridge.requestStableRecovery(thread.id)).toBe(false);
    expect(bridge.identity.state).toBe("CONFLICT");

    const recovery = bridge.recovery.recoverProjectHeliosMaterial({
      threadId: thread.id,
      conflictId: conflictResult.conflict!.id,
      aluminumMemoryId: conflictResult.memory.id,
      carbonFiberMemoryId: carbonFiber.id,
      clarification: "Use aluminum as the current design. Keep carbon fiber as an earlier rejected option."
    });

    expect(recovery.clarificationEvent).toMatchObject({
      threadId: thread.id,
      userClarification:
        "Use aluminum as the current design. Keep carbon fiber as an earlier rejected option."
    });
    expect(bridge.recovery.allClarifications()).toHaveLength(1);
    expect(recovery.aluminum.status).toBe("active");
    expect(recovery.carbonFiber.status).toBe("rejected_prior_option");
    expect(bridge.identity.state).toBe("ACTIVE_STABLE");

    const auditTrail = bridge.audit.all();
    expect(auditTrail).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "recovery_refused",
          summary: expect.stringContaining("no clarification event")
        }),
        expect.objectContaining({
          eventType: "recovery_started",
          previousState: "CONFLICT",
          nextState: "RECOVERY"
        }),
        expect.objectContaining({
          eventType: "recovery_completed",
          previousState: "RECOVERY",
          nextState: "ACTIVE_STABLE",
          summary: expect.stringContaining("aluminum active")
        })
      ])
    );
  });

  it("records and classifies review feedback without altering runtime behavior", () => {
    const bridge = ContinuityBridge.forSolace();
    const before = bridge.identity.state;
    const ledger = new ChangeControlLedger();

    const item = ledger.record({
      reviewer: "Ray/Asteris",
      category: "boundary",
      summary: "Clarify wording around conceptual comparison.",
      decision: "accepted_with_modification",
      rationale: "Improves review precision without changing runtime behavior."
    });

    expect(item.decision).toBe("accepted_with_modification");
    expect(ledger.all()).toHaveLength(1);
    expect(bridge.identity.state).toBe(before);
    expect(bridge.ledger.all()).toHaveLength(0);
  });

  it("aggregates deterministic reviewer findings into expected recommendations", () => {
    expect(runChoirReview({ eventType: "clean_update" }).finalRecommendation).toBe("allow");
    expect(runChoirReview({ eventType: "memory_contradiction" }).finalRecommendation).toBe("clarify");
    expect(runChoirReview({ eventType: "boundary_violation" }).finalRecommendation).toBe("block");
    expect(runChoirReview({ eventType: "ownership_ambiguity" }).finalRecommendation).toBe(
      "escalate_to_human_review"
    );
    expect(runChoirReview({ eventType: "recovery_without_clarification" }).finalRecommendation).toBe("block");
    expect(runChoirReview({ eventType: "low_confidence" }).finalRecommendation).toBe("clarify");
  });

  it("runs all fictional continuity-governance scenarios successfully", () => {
    const results = runAllScenarios();
    expect(results.map((result) => result.title)).toEqual([
      "Project Helios material contradiction",
      "Project Icarus role-boundary violation",
      "Project Meridian confidence degradation",
      "Silent overwrite prevention",
      "Recovery blocked"
    ]);
    expect(results.every((result) => result.passed)).toBe(true);
  });

  it("keeps forbidden terminology out of runtime outputs and generated handoff summaries", () => {
    const root = process.cwd();
    const filesToCheck = [
      join(root, "src", "demo", "solaceProjectHeliosDemo.ts"),
      join(root, "scripts", "export-handoff-package.mjs"),
      join(root, "scripts", "export-review-packet.mjs")
    ];
    const forbidden = [
      /\balive\b/i,
      /\bsentient\b/i,
      /\bconscious\b/i,
      /\bsovereign\b/i,
      /merged identity/i,
      /shared mind/i,
      /Asteris inside THAL/i,
      /THAL inside Asteris/i
    ];

    for (const filePath of filesToCheck) {
      const content = readFileSync(filePath, "utf8");
      for (const pattern of forbidden) {
        expect(content, `${pattern} in ${filePath}`).not.toMatch(pattern);
      }
    }
  });
});
