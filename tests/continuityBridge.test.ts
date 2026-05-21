import { describe, expect, it } from "vitest";
import { ContinuityBridge } from "../src/index.js";

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
});
