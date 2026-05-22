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
    button { font:inherit; }
    .banner { background:#121923; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; }
    .card { border:1px solid var(--line); background:var(--panel); border-radius:8px; padding:14px; }
    .action-card { display:block; width:100%; text-align:left; color:var(--text); text-decoration:none; transition:border-color .15s ease, transform .15s ease; cursor:pointer; }
    .action-card:hover { border-color:var(--ok); transform:translateY(-1px); }
    .action-card strong { display:block; font-size:18px; margin-bottom:6px; }
    .chat-overlay { position:fixed; inset:0; z-index:10; display:none; place-items:center; padding:18px; background:rgba(3,7,12,.72); }
    .chat-overlay.open { display:grid; }
    .chat-window { width:min(760px,100%); height:min(760px,calc(100vh - 36px)); display:grid; grid-template-rows:auto 1fr auto; border:1px solid var(--line); border-radius:10px; background:var(--panel); overflow:hidden; box-shadow:0 24px 90px rgba(0,0,0,.5); }
    .chat-head { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; padding:16px; border-bottom:1px solid var(--line); }
    .chat-head h2 { margin:0 0 4px; }
    .chat-close { min-width:42px; min-height:38px; border:1px solid var(--line); border-radius:8px; background:var(--panel2); color:var(--text); cursor:pointer; }
    .chat-messages { padding:16px; overflow:auto; display:grid; align-content:start; gap:10px; }
    .chat-message { border:1px solid var(--line); border-radius:8px; padding:10px; background:#0c1015; }
    .chat-message strong { color:var(--ok); }
    .chat-message time { display:block; color:var(--muted); font-size:12px; margin-top:4px; }
    .chat-form { display:grid; grid-template-columns:minmax(100px,160px) 1fr auto; gap:10px; padding:16px; border-top:1px solid var(--line); }
    .chat-form input, .chat-form button { min-height:44px; border-radius:8px; border:1px solid var(--line); background:#0c1015; color:var(--text); padding:0 12px; }
    .chat-form button { background:#17392f; border-color:#3a806b; font-weight:700; cursor:pointer; }
    .badge { display:inline-flex; padding:3px 8px; border-radius:999px; border:1px solid var(--line); background:var(--panel2); color:var(--muted); font-size:12px; }
    .ok { color:var(--ok); } .warn { color:var(--warn); } .bad { color:var(--bad); }
    table { width:100%; border-collapse:collapse; overflow:auto; }
    th, td { text-align:left; border-bottom:1px solid var(--line); padding:10px; vertical-align:top; }
    th { color:var(--muted); font-weight:700; }
    code, pre { font-family:ui-monospace, SFMono-Regular, Consolas, monospace; }
    @media (max-width:640px) { .chat-form { grid-template-columns:1fr; } }
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
      <button class="card action-card" type="button" data-open-chat>
        <strong>Handoff Chat</strong>
        <p>Open the simple chat here as a pop-in window. Click outside or close to exit.</p>
      </button>
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

  <div class="chat-overlay" id="chat-overlay" aria-hidden="true">
    <div class="chat-window" role="dialog" aria-modal="true" aria-labelledby="chat-title">
      <div class="chat-head">
        <div>
          <h2 id="chat-title">Handoff Chat</h2>
          <p>Simple ephemeral chat for two reviewers. Do not use for private information.</p>
        </div>
        <button class="chat-close" type="button" data-close-chat aria-label="Close chat">X</button>
      </div>
      <section class="chat-messages" id="chat-messages" aria-live="polite"></section>
      <form class="chat-form" id="chat-form">
        <input id="chat-name" name="name" placeholder="Name" autocomplete="name" required>
        <input id="chat-text" name="text" placeholder="Type a message" autocomplete="off" required>
        <button type="submit">Send</button>
      </form>
    </div>
  </div>
  <script>
    const chatOverlay = document.querySelector("#chat-overlay");
    const chatMessages = document.querySelector("#chat-messages");
    const chatForm = document.querySelector("#chat-form");
    const chatName = document.querySelector("#chat-name");
    const chatText = document.querySelector("#chat-text");
    let chatTimer;
    chatName.value = localStorage.getItem("atcb-chat-name") || "";

    function renderChat(items) {
      chatMessages.replaceChildren(...items.map((item) => {
        const row = document.createElement("article");
        row.className = "chat-message";
        const name = document.createElement("strong");
        name.textContent = item.name;
        const text = document.createElement("div");
        text.textContent = item.text;
        const time = document.createElement("time");
        time.textContent = new Date(item.createdAt).toLocaleString();
        row.append(name, text, time);
        return row;
      }));
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function refreshChat() {
      const result = await fetch("/api/chat", { cache: "no-store" });
      const payload = await result.json();
      if (payload.ok) renderChat(payload.messages);
    }

    function openChat() {
      chatOverlay.classList.add("open");
      chatOverlay.setAttribute("aria-hidden", "false");
      refreshChat();
      clearInterval(chatTimer);
      chatTimer = setInterval(refreshChat, 1500);
      chatText.focus();
    }

    function closeChat() {
      chatOverlay.classList.remove("open");
      chatOverlay.setAttribute("aria-hidden", "true");
      clearInterval(chatTimer);
    }

    document.querySelector("[data-open-chat]").addEventListener("click", openChat);
    document.querySelector("[data-close-chat]").addEventListener("click", closeChat);
    chatOverlay.addEventListener("click", (event) => {
      if (event.target === chatOverlay) closeChat();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && chatOverlay.classList.contains("open")) closeChat();
    });
    chatForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      localStorage.setItem("atcb-chat-name", chatName.value.trim());
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: chatName.value, text: chatText.value })
      });
      chatText.value = "";
      await refreshChat();
    });
  </script>
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
