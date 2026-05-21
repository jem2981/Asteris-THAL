import { copyFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const siteDir = join(root, "site");

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

runNpm(["run", "export:review"]);
mkdirSync(siteDir, { recursive: true });
copyFileSync(join(root, "review", "atcb-v0.2-dashboard.html"), join(siteDir, "index.html"));
copyFileSync(join(root, "review", "atcb-v0.2-dashboard.html"), join(siteDir, "atcb-v0.2-dashboard.html"));
copyFileSync(join(root, "review", "atcb-v0.1-review.html"), join(siteDir, "atcb-v0.1-review.html"));

console.log(`Static site refreshed at ${siteDir}`);
