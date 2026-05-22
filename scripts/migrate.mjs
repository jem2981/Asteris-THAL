import { spawnSync } from "node:child_process";

const result = spawnSync("node", ["--no-warnings", "--import", "tsx", "src/db/migrate.ts"], {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: process.platform === "win32"
});

process.exit(result.status ?? 1);
