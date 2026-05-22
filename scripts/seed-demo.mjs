import { spawnSync } from "node:child_process";

const result = spawnSync("node", ["--no-warnings", "--import", "tsx", "src/scripts/seed-demo.ts"], {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: process.platform === "win32"
});

process.exit(result.status ?? 1);
