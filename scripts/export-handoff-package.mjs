import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
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

const reviewCommit = "5ccd956";
const reviewTag = "atcb-v0.2-review-hardened";

const historicalBaselineNote = `## Historical Baseline Note

Some v0.1 materials are retained inside this v0.2 package as baseline evidence of the original MVP behavior. These files are preserved for traceability and should not be confused with the current v0.2 release surface.`;

const boundaryAttestation = `# ATCB v0.2 Boundary Attestation

No THAL engine integration.
No Asteris/Olympus/Enki corpus.
No private identity material.
No LLM/API calls.
Fictional/sanitized scenarios only.
No sentience claim.
No ownership transfer.
No identity fusion.
`;

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

  return `# Asteris-THAL Continuity Bridge v0.2 Review Handoff

## Artifact
Asteris-THAL Continuity Bridge v0.2

## Commit
${reviewCommit}

## Tag
${reviewTag}

## Verification
- npm run build - PASS
- npm test - PASS
- npm run demo - PASS
- npm run export:review - PASS

## Boundary
No THAL engine integration.
No Asteris/Olympus/Enki corpus.
No private identity material.
No LLM/API calls.
Fictional/sanitized scenarios only.
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
- boundary attestation
- implementation summary
- boundary summary
- demo output
- test output
- acceptance matrix
- review notes template
- Ray/Asteris review response ledger
- read-only historical v0.1 review HTML page
- read-only v0.2 dashboard

## Review Instructions
Please review the packet for conceptual alignment and boundary accuracy only. Do not treat this as repo access, code authority, corpus exchange, or system merger.

---

${boundaryAttestation}

---

${historicalBaselineNote}

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

function collectFiles(relativePath = "") {
  const absolutePath = join(stagingDir, relativePath);
  const stats = statSync(absolutePath);
  if (stats.isFile()) {
    return [relativePath.replace(/\\/g, "/")];
  }

  return readdirSync(absolutePath)
    .sort()
    .flatMap((entry) => collectFiles(join(relativePath, entry)));
}

function createZip() {
  const zipPath = join(handoffDir, "ATCB-v0.1-review-packet.zip");
  const v02ZipPath = join(handoffDir, "ATCB-v0.2-review-packet.zip");
  rmSync(stagingDir, { recursive: true, force: true });
  rmSync(zipPath, { force: true });
  rmSync(v02ZipPath, { force: true });
  mkdirSync(stagingDemoDir, { recursive: true });
  mkdirSync(join(stagingDir, "review-feedback"), { recursive: true });

  copyFileSync(
    join(handoffDir, "00-ATCB-v0.2-boundary-attestation.md"),
    join(stagingDir, "00-ATCB-v0.2-boundary-attestation.md")
  );
  copyFileSync(
    join(root, "review-feedback", "atcb-v0.2-ray-asteris-review-response.md"),
    join(stagingDir, "review-feedback", "atcb-v0.2-ray-asteris-review-response.md")
  );
  copyFileSync(
    join(handoffDir, "ATCB-v0.2-review-handoff.md"),
    join(stagingDir, "ATCB-v0.2-review-handoff.md")
  );
  copyFileSync(
    join(handoffDir, "ATCB-v0.2-review-handoff.txt"),
    join(stagingDir, "ATCB-v0.2-review-handoff.txt")
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

  const entries = [
    "00-ATCB-v0.2-boundary-attestation.md",
    ...collectFiles().filter((entry) => entry !== "00-ATCB-v0.2-boundary-attestation.md")
  ];

  try {
    execFileSync("tar", ["-a", "-cf", zipPath, ...entries], {
      cwd: stagingDir,
      encoding: "utf8"
    });
    copyFileSync(zipPath, v02ZipPath);
  } catch (error) {
    throw new Error(`Failed to create ZIP package: ${error.message}`);
  } finally {
    rmSync(stagingDir, { recursive: true, force: true });
  }

  return { zipPath, v02ZipPath };
}

runNodeScript(join(root, "scripts", "export-review-packet.mjs"));
requireFile(reviewPage);
requireFile(dashboardPage);

const markdown = createHandoffMarkdown();
const boundaryPath = join(handoffDir, "00-ATCB-v0.2-boundary-attestation.md");
const markdownPath = join(handoffDir, "ATCB-v0.1-review-handoff.md");
const textPath = join(handoffDir, "ATCB-v0.1-review-handoff.txt");
const markdownV02Path = join(handoffDir, "ATCB-v0.2-review-handoff.md");
const textV02Path = join(handoffDir, "ATCB-v0.2-review-handoff.txt");
const htmlPath = join(handoffDir, "ATCB-v0.1-review-page.html");
const dashboardPath = join(handoffDir, "ATCB-v0.2-dashboard.html");

writeFileSync(boundaryPath, boundaryAttestation, "utf8");
writeFileSync(markdownPath, markdown, "utf8");
writeFileSync(textPath, markdownToPlainText(markdown), "utf8");
writeFileSync(markdownV02Path, markdown, "utf8");
writeFileSync(textV02Path, markdownToPlainText(markdown), "utf8");
copyFileSync(reviewPage, htmlPath);
copyFileSync(dashboardPage, dashboardPath);

const { zipPath, v02ZipPath } = createZip();

console.log("ATCB v0.2 handoff package refreshed:");
console.log(boundaryPath);
console.log(markdownPath);
console.log(textPath);
console.log(markdownV02Path);
console.log(textV02Path);
console.log(htmlPath);
console.log(dashboardPath);
console.log(zipPath);
console.log(v02ZipPath);
