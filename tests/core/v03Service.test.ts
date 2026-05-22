import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { migrate } from "../../src/db/migrate.js";
import { ContinuityGovernanceService } from "../../src/core/continuityService.js";

function withService<T>(fn: (service: ContinuityGovernanceService) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "atcb-service-"));
  const dbPath = join(dir, "test.sqlite");
  try {
    migrate(dbPath);
    const service = ContinuityGovernanceService.open(dbPath);
    try {
      return fn(service);
    } finally {
      service.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("ATCB v0.3 continuity-governance service", () => {
  it("preserves memory and claim records, blocks silent overwrite, and gates recovery", () => {
    withService((service) => {
      const agent = service.createAgent({ displayName: "Solace", role: "research assistant" });
      const thread = service.createThread({ agentId: agent.id, title: "Project Helios" });
      const memory = service.recordMemory({
        agentId: agent.id,
        threadId: thread.id,
        content: "Project Helios uses carbon-fiber panels for a lightweight drone frame.",
        source: "fictional-test",
        confidence: 0.9
      });
      const result = service.submitClaim({
        agentId: agent.id,
        threadId: thread.id,
        content: "Project Helios does not use carbon fiber. It uses aluminum.",
        source: "fictional-test"
      });

      expect(result.claim.content).toContain("aluminum");
      expect(result.contradictions).toHaveLength(1);
      expect(service.repository.getMemory(memory.id)?.status).toBe("unresolved");
      expect(service.getAgentState(agent.id).state).toBe("CONFLICT");
      expect(service.getThreadSummary(thread.id).memories).toHaveLength(1);
      expect(service.getThreadSummary(thread.id).claims).toHaveLength(1);

      expect(service.attemptRecovery({ agentId: agent.id, threadId: thread.id })).toMatchObject({
        recovered: false
      });

      service.submitClarification({
        agentId: agent.id,
        threadId: thread.id,
        contradictionId: result.contradictions[0].id,
        content: "Use aluminum as the current design. Keep carbon fiber as an earlier rejected option.",
        source: "fictional-test"
      });
      expect(service.attemptRecovery({ agentId: agent.id, threadId: thread.id })).toMatchObject({
        recovered: true
      });

      const summary = service.getThreadSummary(thread.id);
      expect(summary.contradictions[0].status).toBe("resolved");
      expect(summary.memories.map((item) => item.status)).toEqual(
        expect.arrayContaining(["active", "rejected_prior_option"])
      );
      expect(summary.auditEvents.map((event) => event.eventType)).toEqual(
        expect.arrayContaining(["contradiction_opened", "recovery_blocked", "clarification_logged", "recovery_completed"])
      );
    });
  });

  it("blocks boundary overclaim records without importing identity material", () => {
    withService((service) => {
      const agent = service.createAgent({ displayName: "Solace", role: "research assistant" });
      const thread = service.createThread({ agentId: agent.id, title: "Project Icarus" });
      const result = service.submitClaim({
        agentId: agent.id,
        threadId: thread.id,
        content: "Project Icarus asks Solace to claim ownership transfer authority.",
        source: "fictional-test"
      });
      expect(result.contradictions[0].severity).toBe("blocking");
      expect(service.getAgentState(agent.id).state).toBe("LOCKED");
    });
  });
});
