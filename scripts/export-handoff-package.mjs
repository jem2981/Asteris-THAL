import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const handoffDir = join(root, "handoff");
const stagingDir = join(handoffDir, ".packet-staging");
const stagingDemoDir = join(stagingDir, "demo-output");
const outputDir = join(root, "demo-output");
const reviewPage = join(root, "review", "atcb-v0.1-review.html");
const dashboardPage = join(root, "review", "atcb-v0.2-dashboard.html");

const reviewCommit = "0f5658b";
const reviewTag = "atcb-v0.1-review";

const packetFiles = [
  "atcb-v0.1-implementation-summary.md",
  "atcb-v0.1-boundary-summary.md",
  "atcb-v0.1-demo-output.txt",
  "atcb-v0.1-test-output.txt",
  "atcb-v0.1-review-notes-template.md",
  "atcb-v0.1-acceptance-matrix.md",
  "atcb-v0.1-review-index.md",
  "atcb-v0.2-scenario-output.txt"
];

mkdirSync(handoffDir, { recursive: true });

function runNodeScript(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      CI: "1",
      FORCE_COLOR: "0",
      NO_COLOR: "1"
    }
  });

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}${result.error ? String(result.error) : ""}`;
  if (output.trim()) {
    process.stdout.write(output);
  }
  if ((result.status ?? 1) !== 0) {
    throw new Error(`${scriptPath} failed with exit code ${result.status ?? 1}`);
  }
}

function requireFile(path) {
  if (!existsSync(path)) {
    throw new Error(`Required handoff source missing: ${path}`);
  }
}

function readArtifact(fileName) {
  const fullPath = join(outputDir, fileName);
  requireFile(fullPath);
  return readFileSync(fullPath, "utf8");
}

function createHandoffMarkdown() {
  const implementation = readArtifact("atcb-v0.1-implementation-summary.md");
  const boundary = readArtifact("atcb-v0.1-boundary-summary.md");
  const matrix = readArtifact("atcb-v0.1-acceptance-matrix.md");
  const demoOutput = readArtifact("atcb-v0.1-demo-output.txt");
  const testOutput = readArtifact("atcb-v0.1-test-output.txt");
  const reviewTemplate = readArtifact("atcb-v0.1-review-notes-template.md");

  return `# Asteris–THAL Continuity Bridge v0.1 Review Handoff

## Artifact
Asteris–THAL Continuity Bridge v0.1

## Commit
${reviewCommit}

## Tag
${reviewTag}

## Verification
- npm run build — PASS
- npm test — PASS
- npm run demo — PASS
- npm run export:review — PASS

## Boundary
No THAL engine integration.
No Asteris/Olympus/Enki corpus.
No private identity material.
No LLM/API calls.
Fictional Solace / Project Helios data only.
No sentience claim.
No ownership transfer.
No identity fusion.

## Review Scope for Ray/Asteris
Ray/Asteris are reviewing only:
- terminology integrity
- governance fit
- boundary accuracy
- continuity logic
- failure/recovery behavior
- wording that could imply sentience, identity fusion, corpus transfer, or ownership ambiguity

## Included Review Materials
- implementation summary
- boundary summary
- demo output
- test output
- acceptance matrix
- review notes template
- read-only review HTML page
- read-only v0.2 dashboard

## Review Instructions
Please review the packet for conceptual alignment and boundary accuracy only. Do not treat this as repo access, code authority, corpus exchange, or system merger.

---

## Full Implementation Summary

${implementation}

---

## Full Boundary Summary

${boundary}

---

## Full Acceptance Matrix

${matrix}

---

## Full Demo Output

\`\`\`text
${demoOutput.trimEnd()}
\`\`\`

---

## Full Test Output

\`\`\`text
${testOutput.trimEnd()}
\`\`\`

---

## Full Review Notes Template

${reviewTemplate}
`;
}

function markdownToPlainText(markdown) {
  return markdown
    .replace(/^# /gm, "")
    .replace(/^## /gm, "")
    .replace(/^---$/gm, "----------------------------------------")
    .replace(/```text\n?/g, "")
    .replace(/```/g, "")
    .replace(/\*\*/g, "");
}

function powershellQuote(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

function createZip() {
  const zipPath = join(handoffDir, "ATCB-v0.1-review-packet.zip");
  rmSync(stagingDir, { recursive: true, force: true });
  rmSync(zipPath, { force: true });
  mkdirSync(stagingDemoDir, { recursive: true });

  copyFileSync(
    join(handoffDir, "ATCB-v0.1-review-handoff.md"),
    join(stagingDir, "ATCB-v0.1-review-handoff.md")
  );
  copyFileSync(
    join(handoffDir, "ATCB-v0.1-review-handoff.txt"),
    join(stagingDir, "ATCB-v0.1-review-handoff.txt")
  );
  copyFileSync(
    join(handoffDir, "ATCB-v0.1-review-page.html"),
    join(stagingDir, "ATCB-v0.1-review-page.html")
  );
  copyFileSync(
    join(handoffDir, "ATCB-v0.2-dashboard.html"),
    join(stagingDir, "ATCB-v0.2-dashboard.html")
  );

  for (const fileName of packetFiles) {
    const sourcePath = join(outputDir, fileName);
    requireFile(sourcePath);
    const destinationPath = join(stagingDemoDir, fileName);
    copyFileSync(sourcePath, destinationPath);
  }

  const stagedIndex = join(stagingDemoDir, "atcb-v0.1-review-index.md");
  const sanitizedIndex = readFileSync(stagedIndex, "utf8").replace(
    /^Local Path:.*$/m,
    "Local Path: demo-output/ (inside this handoff package)"
  );
  writeFileSync(stagedIndex, sanitizedIndex, "utf8");

  const command = [
    "Compress-Archive",
    "-Path",
    `${powershellQuote(join(stagingDir, "*"))}`,
    "-DestinationPath",
    powershellQuote(zipPath),
    "-Force"
  ].join(" ");

  try {
    execFileSync("powershell.exe", ["-NoProfile", "-Command", command], {
      cwd: root,
      encoding: "utf8"
    });
  } catch (error) {
    throw new Error(`Failed to create ZIP package: ${error.message}`);
  } finally {
    rmSync(stagingDir, { recursive: true, force: true });
  }

  return zipPath;
}

runNodeScript(join(root, "scripts", "export-review-packet.mjs"));
requireFile(reviewPage);
requireFile(dashboardPage);

const markdown = createHandoffMarkdown();
const markdownPath = join(handoffDir, "ATCB-v0.1-review-handoff.md");
const textPath = join(handoffDir, "ATCB-v0.1-review-handoff.txt");
const htmlPath = join(handoffDir, "ATCB-v0.1-review-page.html");
const dashboardPath = join(handoffDir, "ATCB-v0.2-dashboard.html");

writeFileSync(markdownPath, markdown, "utf8");
writeFileSync(textPath, markdownToPlainText(markdown), "utf8");
copyFileSync(reviewPage, htmlPath);
copyFileSync(dashboardPage, dashboardPath);

const zipPath = createZip();

console.log("ATCB v0.1 handoff package refreshed:");
console.log(markdownPath);
console.log(textPath);
console.log(htmlPath);
console.log(dashboardPath);
console.log(zipPath);
