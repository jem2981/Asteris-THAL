import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type SqliteDatabase = DatabaseSync;

export function resolveDbPath(path = process.env.ATCB_DB_PATH ?? "./data/atcb.sqlite"): string {
  return resolve(process.cwd(), path);
}

export function openDatabase(path = process.env.ATCB_DB_PATH ?? "./data/atcb.sqlite"): SqliteDatabase {
  const resolved = resolveDbPath(path);
  mkdirSync(dirname(resolved), { recursive: true });
  const db = new DatabaseSync(resolved);
  db.exec("PRAGMA foreign_keys = ON;");
  return db;
}
