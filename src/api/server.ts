import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { URL } from "node:url";
import { migrate } from "../db/migrate.js";
import { ContinuityGovernanceService } from "../core/continuityService.js";

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
}

function send(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(payload, null, 2));
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

export function createAtcbServer(service: ContinuityGovernanceService): Server {
  return createHttpServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const method = request.method ?? "GET";
      const parts = url.pathname.split("/").filter(Boolean);

      if (method === "GET" && url.pathname === "/health") {
        send(response, 200, {
          ok: true,
          service: "ATCB v0.3",
          boundary: "standalone local continuity-governance layer only"
        });
        return;
      }

      if (method === "POST" && url.pathname === "/agents") {
        const body = await readJson(request);
        send(response, 201, service.createAgent({
          displayName: text(body.displayName),
          role: text(body.role, "assistant"),
          boundaryProfileId: text(body.boundaryProfileId, "default-local-boundary")
        }));
        return;
      }

      if (method === "GET" && url.pathname === "/agents") {
        send(response, 200, service.listAgents());
        return;
      }

      if (method === "GET" && parts[0] === "agents" && parts[1] && !parts[2]) {
        const agent = service.getAgent(parts[1]);
        send(response, agent ? 200 : 404, agent ?? { ok: false, message: "Agent not found." });
        return;
      }

      if (method === "GET" && parts[0] === "agents" && parts[1] && parts[2] === "state") {
        send(response, 200, service.getAgentState(parts[1]));
        return;
      }

      if (method === "POST" && url.pathname === "/threads") {
        const body = await readJson(request);
        send(response, 201, service.createThread({
          agentId: text(body.agentId),
          title: text(body.title)
        }));
        return;
      }

      if (method === "GET" && parts[0] === "threads" && parts[1] && !parts[2]) {
        send(response, 200, service.getThreadSummary(parts[1]));
        return;
      }

      if (method === "POST" && url.pathname === "/memories") {
        const body = await readJson(request);
        send(response, 201, service.recordMemory({
          agentId: text(body.agentId),
          threadId: text(body.threadId),
          content: text(body.content),
          source: text(body.source, "user"),
          confidence: numberValue(body.confidence)
        }));
        return;
      }

      if (method === "GET" && parts[0] === "threads" && parts[1] && parts[2] === "memories") {
        send(response, 200, service.getThreadSummary(parts[1]).memories);
        return;
      }

      if (method === "POST" && url.pathname === "/claims") {
        const body = await readJson(request);
        send(response, 201, service.submitClaim({
          agentId: text(body.agentId),
          threadId: text(body.threadId),
          content: text(body.content),
          source: text(body.source, "user"),
          confidence: numberValue(body.confidence)
        }));
        return;
      }

      if (method === "GET" && parts[0] === "threads" && parts[1] && parts[2] === "claims") {
        send(response, 200, service.getThreadSummary(parts[1]).claims);
        return;
      }

      if (method === "GET" && parts[0] === "threads" && parts[1] && parts[2] === "contradictions") {
        send(response, 200, service.getThreadSummary(parts[1]).contradictions);
        return;
      }

      if (method === "POST" && url.pathname === "/clarifications") {
        const body = await readJson(request);
        send(response, 201, service.submitClarification({
          agentId: text(body.agentId),
          threadId: text(body.threadId),
          contradictionId: text(body.contradictionId),
          content: text(body.content),
          source: text(body.source, "user")
        }));
        return;
      }

      if (method === "POST" && url.pathname === "/reviews") {
        const body = await readJson(request);
        send(response, 201, service.reviewItem({
          agentId: text(body.agentId),
          targetType: text(body.targetType) as never,
          targetId: text(body.targetId),
          reviewer: text(body.reviewer, "human-reviewer"),
          decision: text(body.decision, "defer") as never,
          rationale: text(body.rationale)
        }));
        return;
      }

      if (method === "GET" && parts[0] === "threads" && parts[1] && parts[2] === "reviews") {
        send(response, 200, service.getThreadSummary(parts[1]).reviews);
        return;
      }

      if (method === "POST" && url.pathname === "/recovery/attempt") {
        const body = await readJson(request);
        send(response, 200, service.attemptRecovery({
          agentId: text(body.agentId),
          threadId: text(body.threadId)
        }));
        return;
      }

      if (method === "GET" && url.pathname === "/audit") {
        send(response, 200, service.getAuditTrail());
        return;
      }

      if (method === "GET" && parts[0] === "threads" && parts[1] && parts[2] === "audit") {
        send(response, 200, service.getAuditTrail({ threadId: parts[1] }));
        return;
      }

      send(response, 404, { ok: false, message: "Route not found." });
    } catch (error) {
      send(response, 500, { ok: false, message: error instanceof Error ? error.message : "Unknown error." });
    }
  });
}

export function startAtcbServer(): Server {
  const host = process.env.ATCB_HOST ?? "127.0.0.1";
  const port = Number(process.env.ATCB_PORT ?? "4317");
  migrate(process.env.ATCB_DB_PATH);
  const service = ContinuityGovernanceService.open(process.env.ATCB_DB_PATH);
  const server = createAtcbServer(service);
  server.listen(port, host, () => {
    console.log(`ATCB v0.3 service listening at http://${host}:${port}`);
  });
  return server;
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  startAtcbServer();
}
