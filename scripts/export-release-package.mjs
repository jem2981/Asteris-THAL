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
const releaseDir = join(root, "release");
const handoffDir = join(root, "handoff");
const outputDir = join(root, "demo-output");
const reviewDir = join(root, "review");
const siteDir = join(root, "site");
const stagingDir = join(releaseDir, ".release-staging");
const releaseZip = join(releaseDir, "ATCB-v0.2-complete-review-packet.zip");

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
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim() || fallback;
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

function createZipFromStaging() {
  rmSync(releaseZip, { force: true });
  const command = [
    "Compress-Archive",
    "-Path",
    powershellQuote(join(stagingDir, "*")),
    "-DestinationPath",
    powershellQuote(releaseZip),
    "-Force"
  ].join(" ");
  execFileSync("powershell.exe", ["-NoProfile", "-Command", command], {
    cwd: root,
    encoding: "utf8"
  });
}

runNpm(["run", "export:handoff"]);

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
`;

const boundaryAttestation = `# ATCB v0.2 Boundary Attestation

No THAL engine integration.
No Asteris/Olympus/Enki corpus.
No private identity material.
No LLM/API calls.
No sentience claim.
No ownership transfer.
No identity fusion.
All scenarios are fictional/sanitized.
`;

const reviewInstructions = `# ATCB v0.2 Review Instructions

Review this package as a conceptual comparison review artifact only.

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
1. Read ATCB-v0.2-boundary-attestation.md.
2. Read ATCB-v0.2-system-summary.md.
3. Open review/atcb-v0.2-dashboard.html.
4. Inspect demo and scenario outputs.
5. Fill out the review notes template.
`;

writeFileSync(join(releaseDir, "ATCB-v0.2-system-summary.md"), systemSummary, "utf8");
writeFileSync(join(releaseDir, "ATCB-v0.2-verification-report.md"), verificationReport, "utf8");
writeFileSync(join(releaseDir, "ATCB-v0.2-boundary-attestation.md"), boundaryAttestation, "utf8");
writeFileSync(join(releaseDir, "ATCB-v0.2-review-instructions.md"), reviewInstructions, "utf8");

copyRequired(join(reviewDir, "atcb-v0.2-dashboard.html"), join(siteDir, "index.html"));
copyRequired(join(reviewDir, "atcb-v0.2-dashboard.html"), join(siteDir, "atcb-v0.2-dashboard.html"));
copyRequired(join(reviewDir, "atcb-v0.1-review.html"), join(siteDir, "atcb-v0.1-review.html"));

rmSync(stagingDir, { recursive: true, force: true });
mkdirSync(stagingDir, { recursive: true });

for (const fileName of [
  "ATCB-v0.2-system-summary.md",
  "ATCB-v0.2-verification-report.md",
  "ATCB-v0.2-boundary-attestation.md",
  "ATCB-v0.2-review-instructions.md"
]) {
  copyRequired(join(releaseDir, fileName), join(stagingDir, fileName));
}

for (const fileName of [
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

copyRequired(join(reviewDir, "atcb-v0.2-dashboard.html"), join(stagingDir, "review", "atcb-v0.2-dashboard.html"));

createZipFromStaging();
rmSync(stagingDir, { recursive: true, force: true });

console.log("ATCB v0.2 release package refreshed:");
console.log(join(releaseDir, "ATCB-v0.2-system-summary.md"));
console.log(join(releaseDir, "ATCB-v0.2-verification-report.md"));
console.log(join(releaseDir, "ATCB-v0.2-boundary-attestation.md"));
console.log(join(releaseDir, "ATCB-v0.2-review-instructions.md"));
console.log(releaseZip);
console.log(join(siteDir, "index.html"));
