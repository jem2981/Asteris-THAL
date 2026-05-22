import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { migrate } from "../db/migrate.js";
import { ContinuityGovernanceService } from "../core/continuityService.js";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export function runV03ServiceDemo(): boolean {
  const dir = mkdtempSync(join(tmpdir(), "atcb-v03-"));
  const dbPath = join(dir, "service.sqlite");
  try {
    migrate(dbPath);
    const service = ContinuityGovernanceService.open(dbPath);
    const agent = service.createAgent({ displayName: "Solace", role: "research assistant" });
    const thread = service.createThread({ agentId: agent.id, title: "Project Helios" });
    service.recordMemory({
      agentId: agent.id,
      threadId: thread.id,
      content: "Project Helios uses carbon-fiber panels for a lightweight drone frame.",
      source: "fictional-demo",
      confidence: 0.9
    });
    const claim = service.submitClaim({
      agentId: agent.id,
      threadId: thread.id,
      content: "Project Helios does not use carbon fiber. It uses aluminum.",
      source: "fictional-demo",
      confidence: 0.86
    });
    const blocked = service.attemptRecovery({ agentId: agent.id, threadId: thread.id });
    if (!claim.contradictions[0] || blocked.recovered) {
      service.close();
      return false;
    }
    service.submitClarification({
      agentId: agent.id,
      threadId: thread.id,
      contradictionId: claim.contradictions[0].id,
      content: "Use aluminum as the current design. Keep carbon fiber as an earlier rejected option.",
      source: "fictional-demo"
    });
    const recovered = service.attemptRecovery({ agentId: agent.id, threadId: thread.id });
    const summary = service.getThreadSummary(thread.id);
    service.close();
    return (
      recovered.recovered &&
      summary.contradictions.every((item) => item.status === "resolved") &&
      summary.memories.some((memory) => memory.status === "rejected_prior_option") &&
      summary.auditEvents.some((event) => event.eventType === "recovery_blocked")
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log("ATCB v0.3 Standalone Continuity-Governance Service Demo");
  const passed = runV03ServiceDemo();
  console.log(`Result: ${passed ? "PASS" : "FAIL"}`);
  if (!passed) {
    process.exitCode = 1;
  }
}
