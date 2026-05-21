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

console.log(`Review packet refreshed at ${outputDir}`);
console.log(`Read-only review page refreshed at ${join(reviewDir, "atcb-v0.1-review.html")}`);
