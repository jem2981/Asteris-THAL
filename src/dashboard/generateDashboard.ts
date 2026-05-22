import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { seedDemo } from "../scripts/seed-demo.js";
import { ContinuityGovernanceService } from "../core/continuityService.js";
import { fileURLToPath } from "node:url";

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function generateDashboard(outputPath = "review/atcb-v0.3-dashboard.html"): string {
  const dir = mkdtempSync(join(tmpdir(), "atcb-dashboard-"));
  const dbPath = join(dir, "dashboard.sqlite");
  try {
    const seeded = seedDemo(dbPath);
    const service = ContinuityGovernanceService.open(dbPath);
    const agents = service.listAgents();
    const summaries = seeded.threadIds.map((threadId) => service.getThreadSummary(threadId));
    const audit = service.getAuditTrail();
    const unresolved = summaries.flatMap((summary) =>
      summary.contradictions.filter((contradiction) => contradiction.status === "open")
    );
    const lowConfidence = summaries.flatMap((summary) =>
      summary.memories.filter((memory) => memory.confidence < 0.7)
    );
    const blockedRecoveries = audit.filter((event) => event.eventType === "recovery_blocked");
    service.close();

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ATCB v0.3 Continuity-Governance Dashboard</title>
  <style>
    :root { color-scheme: dark; --bg:#0f1318; --panel:#171d25; --panel2:#202936; --text:#edf4f8; --muted:#a9b6c4; --line:#334153; --ok:#75d6b1; --warn:#ffd166; --bad:#ff9b9b; }
    * { box-sizing: border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.5 system-ui, Segoe UI, sans-serif; }
    header, section { padding:24px clamp(16px,4vw,48px); border-bottom:1px solid var(--line); }
    h1 { margin:0 0 8px; font-size:clamp(30px,5vw,54px); line-height:1.05; }
    h2 { margin:0 0 14px; font-size:22px; }
    p { color:var(--muted); margin:0 0 10px; }
    .banner { background:#121923; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; }
    .card { border:1px solid var(--line); background:var(--panel); border-radius:8px; padding:14px; }
    .action-card { display:block; color:var(--text); text-decoration:none; transition:border-color .15s ease, transform .15s ease; }
    .action-card:hover { border-color:var(--ok); transform:translateY(-1px); }
    .action-card strong { display:block; font-size:18px; margin-bottom:6px; }
    .badge { display:inline-flex; padding:3px 8px; border-radius:999px; border:1px solid var(--line); background:var(--panel2); color:var(--muted); font-size:12px; }
    .ok { color:var(--ok); } .warn { color:var(--warn); } .bad { color:var(--bad); }
    table { width:100%; border-collapse:collapse; overflow:auto; }
    th, td { text-align:left; border-bottom:1px solid var(--line); padding:10px; vertical-align:top; }
    th { color:var(--muted); font-weight:700; }
    code, pre { font-family:ui-monospace, SFMono-Regular, Consolas, monospace; }
  </style>
</head>
<body>
  <header class="banner">
    <span class="badge">fictional-data local service</span>
    <h1>ATCB v0.3 Continuity-Governance Dashboard</h1>
    <p>ATCB is a continuity-governance layer, not a mind. No sentience claim. No identity fusion. No private corpus import.</p>
  </header>

  <section>
    <h2>Review Access</h2>
    <div class="grid">
      <a class="card action-card" href="/deliverables/ray/">
        <strong>Review Downloads</strong>
        <p>Open the private Ray/Asteris handoff page for v0.3, v0.2, and v0.1 packages.</p>
      </a>
      <a class="card action-card" href="/chat/">
        <strong>Handoff Chat</strong>
        <p>Open the simple real-time handoff chat for informal coordination.</p>
      </a>
    </div>
  </section>

  <section>
    <h2>System Health</h2>
    <div class="grid">
      <div class="card"><strong class="ok">Local service ready</strong><p>SQLite-backed deterministic records, no external calls.</p></div>
      <div class="card"><strong>${agents.length}</strong><p>Agents</p></div>
      <div class="card"><strong>${summaries.length}</strong><p>Threads</p></div>
      <div class="card"><strong class="${unresolved.length ? "bad" : "ok"}">${unresolved.length}</strong><p>Unresolved contradictions</p></div>
    </div>
  </section>

  <section>
    <h2>Agents</h2>
    <div class="grid">${agents
      .map((agent) => `<div class="card"><strong>${esc(agent.displayName)}</strong><p>${esc(agent.role)}</p><span class="badge">${agent.currentState}</span></div>`)
      .join("")}</div>
  </section>

  <section>
    <h2>Threads</h2>
    <table><thead><tr><th>Thread</th><th>Memories</th><th>Claims</th><th>Contradictions</th></tr></thead><tbody>${summaries
      .map(
        (summary) =>
          `<tr><td>${esc(summary.thread.title)}</td><td>${summary.memories.length}</td><td>${summary.claims.length}</td><td>${summary.contradictions.length}</td></tr>`
      )
      .join("")}</tbody></table>
  </section>

  <section>
    <h2>Unresolved Contradictions</h2>
    <table><thead><tr><th>Severity</th><th>Summary</th></tr></thead><tbody>${unresolved
      .map((item) => `<tr><td>${item.severity}</td><td>${esc(item.summary)}</td></tr>`)
      .join("") || `<tr><td colspan="2" class="ok">None</td></tr>`}</tbody></table>
  </section>

  <section>
    <h2>Low-Confidence Memories</h2>
    <table><thead><tr><th>Status</th><th>Confidence</th><th>Memory</th></tr></thead><tbody>${lowConfidence
      .map((memory) => `<tr><td>${memory.status}</td><td>${memory.confidence.toFixed(2)}</td><td>${esc(memory.content)}</td></tr>`)
      .join("") || `<tr><td colspan="3" class="ok">None</td></tr>`}</tbody></table>
  </section>

  <section>
    <h2>Blocked Recoveries</h2>
    <table><thead><tr><th>Event</th><th>Summary</th></tr></thead><tbody>${blockedRecoveries
      .map((event) => `<tr><td>${esc(event.eventType)}</td><td>${esc(event.summary)}</td></tr>`)
      .join("") || `<tr><td colspan="2" class="ok">None</td></tr>`}</tbody></table>
  </section>

  <section>
    <h2>Review Queue</h2>
    <p>Open high or blocking contradictions require clarification or human review before stable recovery.</p>
  </section>

  <section>
    <h2>Audit Log</h2>
    <table><thead><tr><th>Event</th><th>Summary</th></tr></thead><tbody>${audit
      .slice(-12)
      .map((event) => `<tr><td>${esc(event.eventType)}</td><td>${esc(event.summary)}</td></tr>`)
      .join("")}</tbody></table>
  </section>
</body>
</html>`;

    const resolvedOutput = resolve(process.cwd(), outputPath);
    mkdirSync(dirname(resolvedOutput), { recursive: true });
    writeFileSync(resolvedOutput, html, "utf8");
    return resolvedOutput;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`ATCB v0.3 dashboard generated at ${generateDashboard()}`);
}
