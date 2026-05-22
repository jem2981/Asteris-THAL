import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase } from "./sqlite.js";

export function migrate(dbPath = process.env.ATCB_DB_PATH): void {
  const db = openDatabase(dbPath);
  const here = dirname(fileURLToPath(import.meta.url));
  const schemaPath = join(here, "schema.sql");
  const schema = readFileSync(schemaPath, "utf8");
  db.exec(schema);
  db.close();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  migrate();
  console.log("ATCB v0.3 SQLite migration complete.");
}
