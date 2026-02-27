import Database from "better-sqlite3";
import path from "path";
import { initializeSchema } from "./schema";

const DB_PATH = path.join(process.cwd(), "data", "piwatch.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initializeSchema(_db);
  }
  return _db;
}

export function cleanupOldMetrics() {
  const db = getDb();
  const settings = getAllSettings(db);
  const rawDays = parseInt(settings.retention_raw_days || "7");

  db.prepare(
    `DELETE FROM metrics WHERE timestamp < datetime('now', ?)`,
  ).run(`-${rawDays} days`);
}

function getAllSettings(db: Database.Database): Record<string, string> {
  const rows = db.prepare("SELECT key, value FROM settings").all() as {
    key: string;
    value: string;
  }[];
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}
