import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { migrate } from "../../src/db/migrate.js";
import { openDatabase } from "../../src/db/sqlite.js";

describe("ATCB v0.3 SQLite migration", () => {
  it("creates the continuity-governance tables", () => {
    const dir = mkdtempSync(join(tmpdir(), "atcb-migration-"));
    const dbPath = join(dir, "test.sqlite");
    try {
      migrate(dbPath);
      const db = openDatabase(dbPath);
      const rows = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
        .all() as Array<{ name: string }>;
      db.close();
      expect(rows.map((row) => row.name)).toEqual(
        expect.arrayContaining([
          "agents",
          "threads",
          "memories",
          "claims",
          "contradictions",
          "clarifications",
          "reviews",
          "boundary_rules",
          "audit_events",
          "state_snapshots"
        ])
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
