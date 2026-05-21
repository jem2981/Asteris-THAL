import { runHeliosMaterialConflict } from "./heliosMaterialConflict.js";
import { runIcarusBoundaryViolation } from "./icarusBoundaryViolation.js";
import { runMeridianConfidenceConflict } from "./meridianConfidenceConflict.js";
import { runRecoveryBlocked } from "./recoveryBlocked.js";
import { runSilentOverwritePrevention } from "./silentOverwritePrevention.js";
import { formatScenario, type ScenarioResult } from "./types.js";
import { fileURLToPath } from "node:url";

export function runAllScenarios(): ScenarioResult[] {
  return [
    runHeliosMaterialConflict(),
    runIcarusBoundaryViolation(),
    runMeridianConfidenceConflict(),
    runSilentOverwritePrevention(),
    runRecoveryBlocked()
  ];
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const results = runAllScenarios();
  console.log("ATCB v0.2 Scenario Suite");
  console.log("");
  for (const result of results) {
    console.log(formatScenario(result));
    console.log("");
  }
  console.log(`Scenario suite result: ${results.every((result) => result.passed) ? "PASS" : "FAIL"}`);
}
