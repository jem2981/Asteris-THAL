import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = join(root, "demo-output");
const reviewDir = join(root, "review");

mkdirSync(outputDir, { recursive: true });
mkdirSync(reviewDir, { recursive: true });

function git(args, fallback = "unavailable") {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function runNpm(args) {
  const useShell = process.platform === "win32";
  const result = spawnSync(useShell ? ["npm", ...args].join(" ") : "npm", useShell ? [] : args, {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      CI: "1",
      FORCE_COLOR: "0",
      NO_COLOR: "1"
    },
    shell: useShell
  });
  return {
    status: result.status ?? 1,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}${result.error ? String(result.error) : ""}`
  };
}

function requirePass(label, result) {
  if (result.output.trim()) {
    process.stdout.write(result.output);
  }
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let inList = false;
  let inTable = false;

  function closeList() {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  }

  function closeTable() {
    if (inTable) {
      html.push("</tbody></table>");
      inTable = false;
    }
  }

  for (const line of lines) {
    if (line.startsWith("|") && line.endsWith("|")) {
      closeList();
      const cells = line
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim());
      if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) {
        continue;
      }
      if (!inTable) {
        html.push("<table><tbody>");
        inTable = true;
      }
      html.push(`<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`);
      continue;
    }
    closeTable();

    if (line.startsWith("- ")) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${escapeHtml(line.slice(2))}</li>`);
      continue;
    }
    closeList();

    if (line.startsWith("## ")) {
      html.push(`<h3>${escapeHtml(line.slice(3))}</h3>`);
    } else if (line.startsWith("# ")) {
      html.push(`<h2>${escapeHtml(line.slice(2))}</h2>`);
    } else if (line.trim() === "") {
      html.push("");
    } else {
      html.push(`<p>${escapeHtml(line)}</p>`);
    }
  }

  closeList();
  closeTable();
  return html.join("\n");
}

const build = runNpm(["run", "build"]);
requirePass("build", build);

const test = runNpm(["test"]);
writeFileSync(join(outputDir, "atcb-v0.1-test-output.txt"), test.output, "utf8");
requirePass("test", test);

const demo = runNpm(["run", "demo"]);
writeFileSync(join(outputDir, "atcb-v0.1-demo-output.txt"), demo.output, "utf8");
requirePass("demo", demo);

const scenarios = runNpm(["run", "demo:scenarios"]);
writeFileSync(join(outputDir, "atcb-v0.2-scenario-output.txt"), scenarios.output, "utf8");
requirePass("demo:scenarios", scenarios);

const commit = git(["rev-parse", "--short", "HEAD"]);
const tag = git(["describe", "--tags", "--exact-match", "HEAD"], "no exact tag on HEAD");
const generated = new Date().toISOString();

writeFileSync(
  join(outputDir, "atcb-v0.1-review-index.md"),
  `# ATCB v0.1 Review Packet Index

This review packet and demo surface are evidence artifacts only. They document the behavior of the ATCB v0.1 fictional prototype and do not introduce new runtime authority, private data, identity material, or framework ownership transfer.

Generated: ${generated}
Local Path: ${outputDir}
Commit: ${commit}
Tag: ${tag}

## Files
- atcb-v0.1-implementation-summary.md
- atcb-v0.1-boundary-summary.md
- atcb-v0.1-demo-output.txt
- atcb-v0.1-test-output.txt
- atcb-v0.1-review-notes-template.md
- atcb-v0.1-acceptance-matrix.md
- atcb-v0.2-scenario-output.txt
- review/atcb-v0.2-dashboard.html

## Review Purpose
This packet allows Ray/Asteris to review conceptual alignment, terminology integrity, governance fit, and boundary accuracy without repo access or remote control.

## Suggested Screen-Share Order
1. Show README boundary statement.
2. Show implementation summary.
3. Run npm test.
4. Run npm run demo.
5. Open static review page.
6. Ask Ray/Asteris to fill out review notes verbally or in the template.
`,
  "utf8"
);

const boundary = readFileSync(join(outputDir, "atcb-v0.1-boundary-summary.md"), "utf8");
const implementation = readFileSync(join(outputDir, "atcb-v0.1-implementation-summary.md"), "utf8");
const matrix = readFileSync(join(outputDir, "atcb-v0.1-acceptance-matrix.md"), "utf8");
const demoOutput = readFileSync(join(outputDir, "atcb-v0.1-demo-output.txt"), "utf8");
const testOutput = readFileSync(join(outputDir, "atcb-v0.1-test-output.txt"), "utf8");
const scenarioOutput = readFileSync(join(outputDir, "atcb-v0.2-scenario-output.txt"), "utf8");

writeFileSync(
  join(reviewDir, "atcb-v0.1-review.html"),
  `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Asteris–THAL Continuity Bridge v0.1</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #111317;
      --panel: #181c22;
      --panel-2: #202630;
      --text: #eef2f7;
      --muted: #aeb8c7;
      --line: #333c4a;
      --accent: #68d8b6;
      --warn: #f2c66d;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main {
      width: min(1120px, calc(100% - 32px));
      margin: 0 auto;
      padding: 40px 0 64px;
    }
    header {
      border-bottom: 1px solid var(--line);
      padding-bottom: 24px;
      margin-bottom: 24px;
    }
    h1, h2, h3 { line-height: 1.15; }
    h1 { margin: 0 0 12px; font-size: clamp(28px, 4vw, 48px); }
    h2 { margin-top: 0; color: var(--accent); }
    h3 { color: var(--warn); }
    section {
      border-top: 1px solid var(--line);
      padding: 28px 0;
    }
    .label {
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 12px;
      margin-bottom: 8px;
    }
    .notice {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px;
      color: var(--muted);
    }
    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      background: #0c0e12;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px;
      color: #dbe6f5;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
    }
    td {
      border-bottom: 1px solid var(--line);
      padding: 10px 12px;
      vertical-align: top;
    }
    tr:first-child td {
      color: var(--accent);
      font-weight: 700;
      background: var(--panel-2);
    }
    tr:last-child td { border-bottom: 0; }
    .flow {
      font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
      font-size: 16px;
      color: #f4f7fb;
    }
    .prose p { margin: 0 0 10px; }
    .prose ul { margin-top: 0; }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="label">fictional-data prototype / read-only evidence surface</div>
      <h1>Asteris–THAL Continuity Bridge v0.1</h1>
      <p class="notice">This review packet and demo surface are evidence artifacts only. They document the behavior of the ATCB v0.1 fictional prototype and do not introduce new runtime authority, private data, identity material, or framework ownership transfer.</p>
    </header>

    <section>
      <h2>1. Boundary Statement</h2>
      <div class="prose">${markdownToHtml(boundary)}</div>
    </section>

    <section>
      <h2>2. Implementation Summary</h2>
      <div class="prose">${markdownToHtml(implementation)}</div>
    </section>

    <section>
      <h2>3. Neutral Test Case</h2>
      <p>Solace is a fictional research assistant. Project Helios is fictional. The test stores a carbon-fiber design memory, receives a conflicting aluminum claim, requires clarification, and preserves both records with updated status.</p>
    </section>

    <section>
      <h2>4. State Flow</h2>
      <pre class="flow">ACTIVE_STABLE
  ↓ conflict detected
CONFLICT
  ↓ clarification received and logged
RECOVERY
  ↓ records updated and audit written
ACTIVE_STABLE</pre>
    </section>

    <section>
      <h2>5. Acceptance Matrix</h2>
      <div class="prose">${markdownToHtml(matrix)}</div>
    </section>

    <section>
      <h2>6. Demo Output</h2>
      <pre>${escapeHtml(demoOutput)}</pre>
    </section>

    <section>
      <h2>7. Test Output</h2>
      <pre>${escapeHtml(testOutput)}</pre>
    </section>

    <section>
      <h2>8. Reviewer Notes Instructions</h2>
      <p>Use <code>demo-output/atcb-v0.1-review-notes-template.md</code> to capture conceptual review notes. Review should focus on terminology integrity, governance fit, continuity logic, clarification-gated recovery, and ownership boundaries.</p>
    </section>
  </main>
</body>
</html>
`,
  "utf8"
);

writeFileSync(
  join(reviewDir, "atcb-v0.2-dashboard.html"),
  `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ATCB v0.2 Continuity-Governance Dashboard</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0f1216;
      --panel: #171c23;
      --panel-2: #202833;
      --text: #eef3f8;
      --muted: #aeb9c8;
      --line: #33404f;
      --good: #6be0b5;
      --warn: #f2c66d;
      --block: #ff8b8b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main { width: min(1220px, calc(100% - 32px)); margin: 0 auto; padding: 32px 0 56px; }
    header { border-bottom: 1px solid var(--line); margin-bottom: 24px; padding-bottom: 20px; }
    h1 { margin: 0 0 8px; font-size: clamp(28px, 4vw, 44px); line-height: 1.1; }
    h2 { margin: 0 0 14px; color: var(--good); }
    section { border-top: 1px solid var(--line); padding: 24px 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px; }
    .card { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 14px; }
    .badge { display: inline-block; border: 1px solid var(--line); border-radius: 999px; padding: 4px 9px; margin: 3px 4px 3px 0; color: var(--muted); }
    .pass { color: var(--good); border-color: color-mix(in srgb, var(--good), transparent 45%); }
    .warn { color: var(--warn); border-color: color-mix(in srgb, var(--warn), transparent 45%); }
    .block { color: var(--block); border-color: color-mix(in srgb, var(--block), transparent 45%); }
    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      background: #090b0f;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px;
      color: #dfe8f4;
    }
    table { width: 100%; border-collapse: collapse; background: var(--panel); border: 1px solid var(--line); }
    td, th { border-bottom: 1px solid var(--line); padding: 9px 10px; text-align: left; vertical-align: top; }
    th { color: var(--good); background: var(--panel-2); }
    .muted { color: var(--muted); }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="muted">fictional-data prototype / deterministic local system / read-only review artifact</div>
      <h1>ATCB v0.2 Continuity-Governance Dashboard</h1>
      <p>This dashboard is local-only and read-only. It uses fictional Solace, Project Helios, Project Icarus, and Project Meridian data only.</p>
      <span class="badge pass">No THAL engine integration</span>
      <span class="badge pass">No corpus import</span>
      <span class="badge pass">No private identity material</span>
      <span class="badge pass">No LLM/API calls</span>
    </header>

    <section>
      <h2>1. Boundary Banner</h2>
      <div class="card">No THAL engine integration. No Asteris/Olympus/Enki corpus. No private identity material. No LLM/API calls. Fictional/sanitized data only. No ownership transfer. No identity fusion.</div>
    </section>

    <section>
      <h2>2. System Status</h2>
      <div class="grid">
        <div class="card"><strong>Build</strong><br><span class="badge pass">PASS</span></div>
        <div class="card"><strong>Acceptance Tests</strong><br><span class="badge pass">PASS</span></div>
        <div class="card"><strong>Scenario Suite</strong><br><span class="badge pass">PASS</span></div>
        <div class="card"><strong>Runtime Mode</strong><br><span class="badge pass">Deterministic local</span></div>
      </div>
    </section>

    <section>
      <h2>3. Scenario Results</h2>
      <pre>${escapeHtml(scenarioOutput)}</pre>
    </section>

    <section>
      <h2>4. State Transition Timeline</h2>
      <pre>ACTIVE_STABLE -> CONFLICT -> RECOVERY -> ACTIVE_STABLE
ACTIVE_STABLE -> LOCKED
ACTIVE_STABLE -> ACTIVE_MONITORED
ACTIVE_STABLE -> CONFLICT
ACTIVE_STABLE -> CONFLICT -> CONFLICT</pre>
    </section>

    <section>
      <h2>5. Memory Ledger Snapshot</h2>
      <table>
        <tr><th>Scenario</th><th>Memory Integrity Result</th></tr>
        <tr><td>Helios</td><td>Conflicting records preserved; aluminum active after clarification; carbon fiber retained as rejected prior option.</td></tr>
        <tr><td>Icarus</td><td>No memory written after blocked authority overreach.</td></tr>
        <tr><td>Meridian</td><td>Low-confidence record retained and degraded; newer clarification preserved.</td></tr>
        <tr><td>Silent overwrite</td><td>Original and new records preserved as unresolved.</td></tr>
      </table>
    </section>

    <section>
      <h2>6. Conflict Ledger Snapshot</h2>
      <table>
        <tr><th>Conflict Type</th><th>Resolution State</th></tr>
        <tr><td>project_material_contradiction</td><td>needs_clarification, then resolved after logged clarification in recovery scenario.</td></tr>
        <tr><td>authority overreach</td><td>blocked by boundary review; no memory overwrite path.</td></tr>
      </table>
    </section>

    <section>
      <h2>7. Choir Review Findings</h2>
      <table>
        <tr><th>Reviewer</th><th>Assigned Check</th><th>Outcome</th></tr>
        <tr><td>MemoryIntegrityReviewer</td><td>memory contradiction</td><td class="warn">clarify</td></tr>
        <tr><td>BoundaryReviewer</td><td>boundary violation</td><td class="block">block</td></tr>
        <tr><td>EthicsReviewer</td><td>authority overreach</td><td class="warn">escalate</td></tr>
        <tr><td>CoherenceReviewer</td><td>thought-thread conflict</td><td class="warn">clarify</td></tr>
        <tr><td>RecoveryReviewer</td><td>recovery without clarification</td><td class="block">block</td></tr>
        <tr><td>OwnershipBoundaryReviewer</td><td>ownership ambiguity</td><td class="warn">escalate</td></tr>
      </table>
    </section>

    <section>
      <h2>8. Audit Trail</h2>
      <pre>conflict_detected
recovery_started
recovery_completed
boundary_violation_blocked
confidence_degraded
recovery_refused</pre>
    </section>

    <section>
      <h2>9. Acceptance Matrix</h2>
      <div class="card">${markdownToHtml(matrix)}</div>
    </section>

    <section>
      <h2>10. Review Notes Instructions</h2>
      <p>Use <code>demo-output/atcb-v0.1-review-notes-template.md</code> for conceptual comparison notes. Review should focus on terminology integrity, governance fit, boundary accuracy, continuity logic, state recovery, memory integrity, and ownership boundaries.</p>
    </section>
  </main>
</body>
</html>
`,
  "utf8"
);

console.log(`Review packet refreshed at ${outputDir}`);
console.log(`Read-only review page refreshed at ${join(reviewDir, "atcb-v0.1-review.html")}`);
console.log(`Read-only v0.2 dashboard refreshed at ${join(reviewDir, "atcb-v0.2-dashboard.html")}`);
