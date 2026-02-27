import type Database from "better-sqlite3";

export function initializeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 9100,
      token TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      cpu_usage REAL,
      cpu_temp REAL,
      memory_usage REAL,
      memory_total INTEGER,
      disk_usage REAL,
      disk_total INTEGER,
      network_rx INTEGER,
      network_tx INTEGER,
      load_avg_1 REAL,
      load_avg_5 REAL,
      load_avg_15 REAL,
      raw_data TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_metrics_device_time
      ON metrics(device_id, timestamp);

    CREATE TABLE IF NOT EXISTS device_status (
      device_id TEXT PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'unknown',
      last_seen TEXT,
      hostname TEXT,
      model TEXT,
      os_info TEXT,
      uptime_seconds INTEGER,
      agent_version TEXT,
      ip_address TEXT
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      value REAL,
      threshold REAL,
      created_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_alerts_device
      ON alerts(device_id, created_at);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Insert default settings if not exists
  const defaults: Record<string, string> = {
    poll_interval: "15",
    temp_threshold: "70",
    cpu_threshold: "90",
    memory_threshold: "90",
    disk_threshold: "90",
    retention_raw_days: "7",
    retention_hourly_days: "30",
    retention_daily_days: "365",
  };

  const insert = db.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
  );
  for (const [key, value] of Object.entries(defaults)) {
    insert.run(key, value);
  }
}
