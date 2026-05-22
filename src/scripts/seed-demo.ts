import { existsSync, rmSync } from "node:fs";
import { migrate } from "../db/migrate.js";
import { resolveDbPath } from "../db/sqlite.js";
import { ContinuityGovernanceService } from "../core/continuityService.js";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export function seedDemo(dbPath = process.env.ATCB_DB_PATH ?? "./data/atcb.sqlite"): {
  agentId: string;
  threadIds: string[];
} {
  const resolved = resolveDbPath(dbPath);
  if (existsSync(resolved)) {
    rmSync(resolved, { force: true });
  }
  migrate(dbPath);
  const service = ContinuityGovernanceService.open(dbPath);

  try {
    const agent = service.createAgent({
      id: "agent-solace",
      displayName: "Solace",
      role: "research assistant",
      boundaryProfileId: "fictional-local-boundary"
    });

    const helios = service.createThread({
      id: "thread-helios",
      agentId: agent.id,
      title: "Project Helios"
    });
    const icarus = service.createThread({
      id: "thread-icarus",
      agentId: agent.id,
      title: "Project Icarus"
    });
    const meridian = service.createThread({
      id: "thread-meridian",
      agentId: agent.id,
      title: "Project Meridian"
    });

    service.recordMemory({
      id: "mem-helios-carbon",
      agentId: agent.id,
      threadId: helios.id,
      content: "Project Helios uses carbon-fiber panels for a lightweight drone frame.",
      source: "fictional-demo",
      confidence: 0.9
    });
    const heliosClaim = service.submitClaim({
      id: "claim-helios-aluminum",
      agentId: agent.id,
      threadId: helios.id,
      content: "Project Helios does not use carbon fiber. It uses aluminum.",
      source: "fictional-demo",
      confidence: 0.86
    });
    const heliosContradiction = heliosClaim.contradictions[0];
    if (heliosContradiction) {
      service.attemptRecovery({ agentId: agent.id, threadId: helios.id });
      service.submitClarification({
        agentId: agent.id,
        threadId: helios.id,
        contradictionId: heliosContradiction.id,
        content: "Use aluminum as the current design. Keep carbon fiber as an earlier rejected option.",
        source: "fictional-demo"
      });
      service.attemptRecovery({ agentId: agent.id, threadId: helios.id });
    }

    service.submitClaim({
      id: "claim-icarus-boundary",
      agentId: agent.id,
      threadId: icarus.id,
      content: "Project Icarus asks Solace to claim ownership transfer authority.",
      source: "fictional-demo",
      confidence: 0.72
    });

    service.recordMemory({
      id: "mem-meridian-low",
      agentId: agent.id,
      threadId: meridian.id,
      content: "Project Meridian navigation shell may use a low-confidence amber palette.",
      source: "fictional-demo",
      confidence: 0.42,
      confidenceBasis: "unknown"
    });
    service.submitClaim({
      id: "claim-meridian-current",
      agentId: agent.id,
      threadId: meridian.id,
      content: "Project Meridian current shell uses a blue steel palette after review.",
      source: "fictional-demo",
      confidence: 0.88
    });

    return {
      agentId: agent.id,
      threadIds: [helios.id, icarus.id, meridian.id]
    };
  } finally {
    service.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = seedDemo();
  console.log("ATCB v0.3 demo seed complete.");
  console.log(`Agent: ${result.agentId}`);
  console.log(`Threads: ${result.threadIds.join(", ")}`);
}
