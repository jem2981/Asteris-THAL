import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateDashboard } from "../../src/dashboard/generateDashboard.js";

describe("ATCB v0.3 dashboard", () => {
  it("generates required operator boundary wording", () => {
    const path = join(tmpdir(), `atcb-v03-dashboard-${Date.now()}.html`);
    try {
      generateDashboard(path);
      const html = readFileSync(path, "utf8");
      expect(html).toContain("ATCB is a continuity-governance layer, not a mind.");
      expect(html).toContain("No sentience claim.");
      expect(html).toContain("No identity fusion.");
      expect(html).toContain("No private corpus import.");
    } finally {
      rmSync(path, { force: true });
    }
  });
});
