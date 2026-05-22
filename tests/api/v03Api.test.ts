import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { migrate } from "../../src/db/migrate.js";
import { ContinuityGovernanceService } from "../../src/core/continuityService.js";
import { createAtcbServer } from "../../src/api/server.js";

let server: Server;
let service: ContinuityGovernanceService;
let baseUrl: string;
let dir: string;

async function post(path: string, body: Record<string, unknown>) {
  const result = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return {
    status: result.status,
    json: await result.json()
  };
}

describe("ATCB v0.3 local REST API", () => {
  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), "atcb-api-"));
    const dbPath = join(dir, "api.sqlite");
    migrate(dbPath);
    service = ContinuityGovernanceService.open(dbPath);
    server = createAtcbServer(service);
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Server did not bind to a local port.");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    service.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("supports health and create/read continuity records", async () => {
    const health = await fetch(`${baseUrl}/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({ ok: true, service: "ATCB v0.3" });

    const agent = await post("/agents", { displayName: "Solace", role: "research assistant" });
    expect(agent.status).toBe(201);
    const thread = await post("/threads", { agentId: agent.json.id, title: "Project Helios" });
    const memory = await post("/memories", {
      agentId: agent.json.id,
      threadId: thread.json.id,
      content: "Project Helios uses carbon-fiber panels for a lightweight drone frame.",
      source: "fictional-api-test",
      confidence: 0.9
    });
    expect(memory.status).toBe(201);

    const claim = await post("/claims", {
      agentId: agent.json.id,
      threadId: thread.json.id,
      content: "Project Helios does not use carbon fiber. It uses aluminum.",
      source: "fictional-api-test"
    });
    expect(claim.json.contradictions).toHaveLength(1);

    const blocked = await post("/recovery/attempt", { agentId: agent.json.id, threadId: thread.json.id });
    expect(blocked.json.recovered).toBe(false);

    const contradictions = await fetch(`${baseUrl}/threads/${thread.json.id}/contradictions`);
    expect(await contradictions.json()).toHaveLength(1);
  });
});
