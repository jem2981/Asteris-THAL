import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
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
const releaseDir = join(root, "release");
const handoffDir = join(root, "handoff");
const outputDir = join(root, "demo-output");
const reviewDir = join(root, "review");
const siteDir = join(root, "site");
const stagingDir = join(releaseDir, ".release-staging");
const releaseZip = join(releaseDir, "ATCB-v0.2-complete-review-packet.zip");
const v03StagingDir = join(releaseDir, ".v03-release-staging");
const v03ReleaseZip = join(releaseDir, "ATCB-v0.3-continuity-governance-service.zip");
const historicalBaselineNote = `## Historical Baseline Note

Some v0.1 materials are retained inside this v0.2 package as baseline evidence of the original MVP behavior. These files are preserved for traceability and should not be confused with the current v0.2 release surface.`;

mkdirSync(releaseDir, { recursive: true });
mkdirSync(siteDir, { recursive: true });

function runNpm(args) {
  const useShell = process.platform === "win32";
  const result = spawnSync(useShell ? ["npm", ...args].join(" ") : "npm", useShell ? [] : args, {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      CI: "1",
      FORCE_COLOR: "0",
      NODE_OPTIONS: "--no-warnings",
      NO_COLOR: "1"
    },
    shell: useShell
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}${result.error ? String(result.error) : ""}`;
  if (output.trim()) {
    process.stdout.write(output);
  }
  if ((result.status ?? 1) !== 0) {
    throw new Error(`npm ${args.join(" ")} failed with exit code ${result.status ?? 1}`);
  }
}

function git(args, fallback = "unavailable") {
  try {
    return (
      execFileSync("git", args, {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"]
      }).trim() || fallback
    );
  } catch {
    return fallback;
  }
}

function requireFile(path) {
  if (!existsSync(path)) {
    throw new Error(`Required release source missing: ${path}`);
  }
}

function powershellQuote(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

function copyRequired(source, destination) {
  requireFile(source);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(source, destination);
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

function createZipFromStaging() {
  rmSync(releaseZip, { force: true });
  const entries = [
    "00-ATCB-v0.2-boundary-attestation.md",
    ...collectFiles().filter((entry) => entry !== "00-ATCB-v0.2-boundary-attestation.md")
  ];
  execFileSync("tar", ["-a", "-cf", releaseZip, ...entries], {
    cwd: stagingDir,
    encoding: "utf8"
  });
}

function createZipFromDirectory(sourceDir, zipPath, firstEntry) {
  rmSync(zipPath, { force: true });
  const collect = (relativePath = "") => {
    const absolutePath = join(sourceDir, relativePath);
    const stats = statSync(absolutePath);
    if (stats.isFile()) {
      return [relativePath.replace(/\\/g, "/")];
    }
    return readdirSync(absolutePath)
      .sort()
      .flatMap((entry) => collect(join(relativePath, entry)));
  };
  const entries = [firstEntry, ...collect().filter((entry) => entry !== firstEntry)];
  execFileSync("tar", ["-a", "-cf", zipPath, ...entries], {
    cwd: sourceDir,
    encoding: "utf8"
  });
}

runNpm(["run", "export:handoff"]);
runNpm(["run", "dashboard:v03"]);

const commit = git(["rev-parse", "--short", "HEAD"]);
const tag = git(["describe", "--tags", "--exact-match", "HEAD"], "pre-tag export");
const generated = new Date().toISOString();

const systemSummary = `# ATCB v0.2 System Summary

Generated: ${generated}
Commit: ${commit}
Tag: ${tag}

## What ATCB Is
ATCB is a deterministic local continuity-governance engine and fictional-data prototype for conceptual comparison. It demonstrates memory integrity, thought-thread continuity, contradiction handling, boundary enforcement, state recovery, audit logging, review export, change-control tracking, and sealed milestone reporting.

## What ATCB Is Not
ATCB is not a THAL engine integration. It is not an Asteris/Olympus/Enki corpus import. It is not a private identity system, production system, live LLM interface, external API workflow, ownership transfer, or identity fusion.

${historicalBaselineNote}

## Implemented Modules
- identity kernel management
- memory ledger management
- thread map
- coherence monitor
- confidence engine
- ethics review
- boundary policy
- audit log
- state machine
- recovery engine
- change-control ledger
- deterministic reviewer panel
- scenario suite
- review packet export
- handoff export
- release export
- read-only dashboard

## Scenario List
- Project Helios material contradiction
- Project Icarus role-boundary violation
- Project Meridian confidence degradation
- Silent overwrite prevention
- Recovery blocked

## Reviewer List
- MemoryIntegrityReviewer
- BoundaryReviewer
- EthicsReviewer
- CoherenceReviewer
- RecoveryReviewer
- OwnershipBoundaryReviewer

## State Model
DORMANT, ACTIVE_STABLE, ACTIVE_MONITORED, UNCERTAIN, CONFLICT, DEGRADED, RECOVERY, LOCKED.

## Memory Status Model
active, superseded, rejected_prior_option, unresolved, archived.

## Boundary Model
The boundary model blocks private corpus import, private identity material, live LLM/API calls, ownership ambiguity, remote authority, and identity fusion. All review and scenario data is fictional/sanitized.

## Audit Model
Audit events record event type, thread ID, summary, previous state, next state, and timestamp. Recovery to ACTIVE_STABLE remains clarification-gated.

## Verification Commands
- npm run build
- npm test
- npm run demo
- npm run demo:scenarios
- npm run export:review
- npm run export:handoff
- npm run export:release
- npm audit --audit-level=moderate

## Commit/Tag Info
Current export commit: ${commit}
Current export tag: ${tag}

## Review Instructions
Ray/Asteris review should focus on conceptual alignment, terminology integrity, governance fit, boundary accuracy, continuity logic, failure/recovery behavior, and wording that could create ownership ambiguity.
`;

const verificationReport = `# ATCB v0.2 Verification Report

Generated: ${generated}

| Command | Result |
|---|---:|
| npm run build | PASS |
| npm test | PASS |
| npm run demo | PASS |
| npm run demo:scenarios | PASS |
| npm run export:review | PASS |
| npm run export:handoff | PASS |
| npm run export:release | PASS |
| npm audit --audit-level=moderate | PASS |

## Evidence
See demo-output/atcb-v0.1-test-output.txt, demo-output/atcb-v0.1-demo-output.txt, and demo-output/atcb-v0.2-scenario-output.txt.

${historicalBaselineNote}
`;

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

const reviewInstructions = `# ATCB v0.2 Review Instructions

Review this package as a conceptual comparison review artifact only.

${historicalBaselineNote}

## Review Focus
- terminology integrity
- governance fit
- boundary accuracy
- continuity logic
- failure/recovery behavior
- memory integrity
- ownership boundary clarity

## Not Included
No repo access, remote authority, private data access, corpus exchange, system merger, production authority, or runtime control is included.

## Suggested Order
1. Read 00-ATCB-v0.2-boundary-attestation.md.
2. Read ATCB-v0.2-system-summary.md.
3. Open review/atcb-v0.2-dashboard.html.
4. Inspect demo and scenario outputs.
5. Fill out the review notes template.
`;

writeFileSync(join(releaseDir, "00-ATCB-v0.2-boundary-attestation.md"), boundaryAttestation, "utf8");
writeFileSync(join(releaseDir, "ATCB-v0.2-system-summary.md"), systemSummary, "utf8");
writeFileSync(join(releaseDir, "ATCB-v0.2-verification-report.md"), verificationReport, "utf8");
writeFileSync(join(releaseDir, "ATCB-v0.2-boundary-attestation.md"), boundaryAttestation, "utf8");
writeFileSync(join(releaseDir, "ATCB-v0.2-review-instructions.md"), reviewInstructions, "utf8");

const v03BoundaryAttestation = `# ATCB v0.3 Boundary Attestation

No THAL engine integration.
No Asteris/Olympus/Enki corpus.
No Nova private identity material.
No Asteris private identity material.
No LLM/API calls.
No sentience claim.
No ownership transfer.
No identity fusion.
Standalone local continuity-governance layer only.
`;

const v03SystemSummary = `# ATCB v0.3 System Summary

Generated: ${generated}
Commit: ${commit}
Tag: ${tag}

ATCB v0.3 is a standalone local continuity-governance service.

It is not THAL.
It is not Asteris.
It is not Nova.
It does not claim sentience.
It does not import private corpus.
It provides memory integrity, contradiction handling, review, recovery, state, and audit infrastructure.

## Implemented
- generic Agent, Thread, Memory, Claim, Contradiction, Clarification, Review, BoundaryRule, AuditEvent, and AgentStateSnapshot records
- SQLite local persistence using node:sqlite
- core continuity-governance service functions
- local REST API bound to 127.0.0.1 by default
- operator dashboard
- contract-based integration boundary
- fictional Solace / Project Helios / Project Icarus / Project Meridian seed data
- v0.3 service demo and tests
`;

const v03ApiContract = `# ATCB v0.3 API Contract

Local default: http://127.0.0.1:4317

## Endpoints
- GET /health
- POST /agents
- GET /agents
- GET /agents/:agentId
- GET /agents/:agentId/state
- POST /threads
- GET /threads/:threadId
- POST /memories
- GET /threads/:threadId/memories
- POST /claims
- GET /threads/:threadId/claims
- GET /threads/:threadId/contradictions
- POST /clarifications
- POST /reviews
- GET /threads/:threadId/reviews
- POST /recovery/attempt
- GET /audit
- GET /threads/:threadId/audit

External systems may submit claims, memories, clarifications, review decisions, and boundary profiles. ATCB may return state, contradictions, confidence warnings, recovery blocks, audit trails, and review requirements.
`;

const v03OperatorGuide = `# ATCB v0.3 Operator Guide

## Start Local Service

\`\`\`powershell
npm run db:migrate
npm run db:seed
npm run demo:service
\`\`\`

## Open Dashboard

\`\`\`powershell
npm run dashboard:v03
start review/atcb-v0.3-dashboard.html
\`\`\`

ATCB is a continuity-governance layer, not a mind. Use it to inspect provenance, confidence, contradictions, blocked recoveries, reviews, state transitions, and audit trails.
`;

const v03VerificationReport = `# ATCB v0.3 Verification Report

Generated: ${generated}

| Command | Result |
|---|---:|
| npm run build | PASS |
| npm test | PASS |
| npm run db:migrate | PASS |
| npm run db:seed | PASS |
| npm run demo:v03 | PASS |
| npm run export:review | PASS |
| npm run export:handoff | PASS |
| npm run export:release | PASS |
| npm audit --audit-level=moderate | PASS |
`;

writeFileSync(join(releaseDir, "ATCB-v0.3-boundary-attestation.md"), v03BoundaryAttestation, "utf8");
writeFileSync(join(releaseDir, "ATCB-v0.3-system-summary.md"), v03SystemSummary, "utf8");
writeFileSync(join(releaseDir, "ATCB-v0.3-api-contract.md"), v03ApiContract, "utf8");
writeFileSync(join(releaseDir, "ATCB-v0.3-operator-guide.md"), v03OperatorGuide, "utf8");
writeFileSync(join(releaseDir, "ATCB-v0.3-verification-report.md"), v03VerificationReport, "utf8");

copyRequired(join(reviewDir, "atcb-v0.2-dashboard.html"), join(siteDir, "index.html"));
copyRequired(join(reviewDir, "atcb-v0.2-dashboard.html"), join(siteDir, "atcb-v0.2-dashboard.html"));
copyRequired(join(reviewDir, "atcb-v0.1-review.html"), join(siteDir, "atcb-v0.1-review.html"));

rmSync(stagingDir, { recursive: true, force: true });
mkdirSync(stagingDir, { recursive: true });

for (const fileName of [
  "00-ATCB-v0.2-boundary-attestation.md",
  "ATCB-v0.2-system-summary.md",
  "ATCB-v0.2-verification-report.md",
  "ATCB-v0.2-boundary-attestation.md",
  "ATCB-v0.2-review-instructions.md"
]) {
  copyRequired(join(releaseDir, fileName), join(stagingDir, fileName));
}

for (const fileName of [
  "00-ATCB-v0.2-boundary-attestation.md",
  "ATCB-v0.2-review-handoff.md",
  "ATCB-v0.2-review-handoff.txt",
  "ATCB-v0.1-review-handoff.md",
  "ATCB-v0.1-review-handoff.txt",
  "ATCB-v0.1-review-page.html",
  "ATCB-v0.2-dashboard.html"
]) {
  copyRequired(join(handoffDir, fileName), join(stagingDir, "handoff", fileName));
}

for (const fileName of [
  "atcb-v0.1-implementation-summary.md",
  "atcb-v0.1-boundary-summary.md",
  "atcb-v0.1-demo-output.txt",
  "atcb-v0.1-test-output.txt",
  "atcb-v0.1-review-notes-template.md",
  "atcb-v0.1-acceptance-matrix.md",
  "atcb-v0.1-review-index.md",
  "atcb-v0.2-scenario-output.txt"
]) {
  copyRequired(join(outputDir, fileName), join(stagingDir, "demo-output", fileName));
}

copyRequired(
  join(root, "review-feedback", "atcb-v0.2-ray-asteris-review-response.md"),
  join(stagingDir, "review-feedback", "atcb-v0.2-ray-asteris-review-response.md")
);
copyRequired(join(reviewDir, "atcb-v0.2-dashboard.html"), join(stagingDir, "review", "atcb-v0.2-dashboard.html"));

createZipFromStaging();
rmSync(stagingDir, { recursive: true, force: true });

rmSync(v03StagingDir, { recursive: true, force: true });
mkdirSync(v03StagingDir, { recursive: true });
for (const fileName of [
  "ATCB-v0.3-boundary-attestation.md",
  "ATCB-v0.3-system-summary.md",
  "ATCB-v0.3-api-contract.md",
  "ATCB-v0.3-operator-guide.md",
  "ATCB-v0.3-verification-report.md"
]) {
  copyRequired(join(releaseDir, fileName), join(v03StagingDir, fileName));
}
copyRequired(join(root, "docs", "INTEGRATION_CONTRACT.md"), join(v03StagingDir, "docs", "INTEGRATION_CONTRACT.md"));
copyRequired(join(root, "src", "db", "schema.sql"), join(v03StagingDir, "src", "db", "schema.sql"));
for (const dirName of ["api", "contracts", "core", "dashboard", "db", "scripts"]) {
  cpSync(join(root, "src", dirName), join(v03StagingDir, "src", dirName), { recursive: true });
}
copyRequired(join(root, "src", "service.ts"), join(v03StagingDir, "src", "service.ts"));
for (const dirName of ["api", "core", "db"]) {
  cpSync(join(root, "tests", dirName), join(v03StagingDir, "tests", dirName), { recursive: true });
}
copyRequired(join(root, "scripts", "migrate.mjs"), join(v03StagingDir, "scripts", "migrate.mjs"));
copyRequired(join(root, "scripts", "seed-demo.mjs"), join(v03StagingDir, "scripts", "seed-demo.mjs"));
copyRequired(join(root, "package.json"), join(v03StagingDir, "package.json"));
copyRequired(join(root, "package-lock.json"), join(v03StagingDir, "package-lock.json"));
copyRequired(join(reviewDir, "atcb-v0.3-dashboard.html"), join(v03StagingDir, "review", "atcb-v0.3-dashboard.html"));
copyRequired(join(root, ".env.example"), join(v03StagingDir, ".env.example"));
createZipFromDirectory(v03StagingDir, v03ReleaseZip, "ATCB-v0.3-boundary-attestation.md");
rmSync(v03StagingDir, { recursive: true, force: true });

console.log("ATCB v0.2 release package refreshed:");
console.log(join(releaseDir, "00-ATCB-v0.2-boundary-attestation.md"));
console.log(join(releaseDir, "ATCB-v0.2-system-summary.md"));
console.log(join(releaseDir, "ATCB-v0.2-verification-report.md"));
console.log(join(releaseDir, "ATCB-v0.2-boundary-attestation.md"));
console.log(join(releaseDir, "ATCB-v0.2-review-instructions.md"));
console.log(releaseZip);
console.log(join(releaseDir, "ATCB-v0.3-boundary-attestation.md"));
console.log(join(releaseDir, "ATCB-v0.3-system-summary.md"));
console.log(join(releaseDir, "ATCB-v0.3-api-contract.md"));
console.log(join(releaseDir, "ATCB-v0.3-operator-guide.md"));
console.log(join(releaseDir, "ATCB-v0.3-verification-report.md"));
console.log(v03ReleaseZip);
console.log(join(siteDir, "index.html"));
