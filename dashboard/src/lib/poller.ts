import { getDb, cleanupOldMetrics } from "./db";
import { broadcast } from "./sse";
import type {
  Device,
  AgentHealthResponse,
  AgentMetricsResponse,
} from "@/types";

let pollerTimer: ReturnType<typeof setInterval> | null = null;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export function startPoller() {
  if (pollerTimer) return;

  console.log("[Poller] Starting background poller");

  // Run immediately
  pollAllDevices();

  // Then schedule
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM settings WHERE key = 'poll_interval'")
    .get() as { value: string } | undefined;
  const intervalSec = parseInt(row?.value || "15");

  pollerTimer = setInterval(pollAllDevices, intervalSec * 1000);

  // Cleanup old metrics every hour
  cleanupTimer = setInterval(cleanupOldMetrics, 3600 * 1000);
}

export function stopPoller() {
  if (pollerTimer) {
    clearInterval(pollerTimer);
    pollerTimer = null;
  }
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

async function pollAllDevices() {
  const db = getDb();
  const devices = db.prepare("SELECT * FROM devices").all() as Device[];

  for (const device of devices) {
    try {
      await pollDevice(device);
    } catch (err) {
      console.error(`[Poller] Error polling ${device.name}:`, err);
      markOffline(device.id);
    }
  }
}

async function pollDevice(device: Device) {
  const db = getDb();
  const baseUrl = `http://${device.host}:${device.port}`;

  // Fetch health
  let health: AgentHealthResponse;
  try {
    const res = await fetch(`${baseUrl}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    health = await res.json();
  } catch {
    markOffline(device.id);
    return;
  }

  // Fetch metrics
  let metrics: AgentMetricsResponse;
  try {
    const res = await fetch(`${baseUrl}/metrics`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Metrics fetch failed: ${res.status}`);
    metrics = await res.json();
  } catch {
    markOffline(device.id);
    return;
  }

  // Build os_info string
  const osInfo = [health.os_name, health.os_version]
    .filter(Boolean)
    .join(" ") || null;

  // Update device_status
  db.prepare(
    `INSERT INTO device_status (device_id, status, last_seen, hostname, model, os_info, uptime_seconds, agent_version, ip_address)
     VALUES (?, 'online', datetime('now'), ?, ?, ?, ?, ?, ?)
     ON CONFLICT(device_id) DO UPDATE SET
       status='online', last_seen=datetime('now'),
       hostname=excluded.hostname, model=excluded.model, os_info=excluded.os_info,
       uptime_seconds=excluded.uptime_seconds, agent_version=excluded.agent_version,
       ip_address=excluded.ip_address`,
  ).run(
    device.id,
    health.hostname,
    health.model ?? null,
    osInfo,
    health.uptime_seconds,
    health.agent_version,
    health.ip_address,
  );

  // Extract aggregated values from agent response
  const cpuUsage = metrics.cpu?.usage_percent ?? null;
  const cpuTemp = metrics.temperature?.cpu_celsius ?? null;
  const memUsage = metrics.memory?.ram?.percent ?? null;
  const memTotal = metrics.memory?.ram?.total_bytes ?? null;

  // Disk: aggregate from root partition or largest partition
  let diskUsage: number | null = null;
  let diskTotal: number | null = null;
  if (metrics.disk && metrics.disk.length > 0) {
    const root = metrics.disk.find((d) => d.mountpoint === "/") ?? metrics.disk[0];
    diskUsage = root.percent;
    diskTotal = root.total_bytes;
  }

  // Network: sum all interfaces
  let netRx: number | null = null;
  let netTx: number | null = null;
  if (metrics.network?.interfaces) {
    netRx = 0;
    netTx = 0;
    for (const iface of Object.values(metrics.network.interfaces)) {
      netRx += iface.bytes_recv;
      netTx += iface.bytes_sent;
    }
  }

  const loadAvg1 = metrics.cpu?.load_avg?.["1min"] ?? null;
  const loadAvg5 = metrics.cpu?.load_avg?.["5min"] ?? null;
  const loadAvg15 = metrics.cpu?.load_avg?.["15min"] ?? null;

  // Insert metrics
  db.prepare(
    `INSERT INTO metrics (device_id, cpu_usage, cpu_temp, memory_usage, memory_total,
       disk_usage, disk_total, network_rx, network_tx, load_avg_1, load_avg_5, load_avg_15, raw_data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    device.id,
    cpuUsage,
    cpuTemp,
    memUsage,
    memTotal,
    diskUsage,
    diskTotal,
    netRx,
    netTx,
    loadAvg1,
    loadAvg5,
    loadAvg15,
    JSON.stringify(metrics),
  );

  // Check alert thresholds
  checkThresholds(device, cpuUsage, cpuTemp, memUsage, diskUsage);

  // Broadcast updates
  const status = db
    .prepare("SELECT * FROM device_status WHERE device_id = ?")
    .get(device.id);
  broadcast("device_update", { ...device, status });
  broadcast("metrics_update", {
    device_id: device.id,
    metrics: {
      cpu_usage: cpuUsage,
      cpu_temp: cpuTemp,
      memory_usage: memUsage,
      disk_usage: diskUsage,
      network_rx: netRx,
      network_tx: netTx,
    },
  });
}

function markOffline(deviceId: string) {
  const db = getDb();
  db.prepare(
    `INSERT INTO device_status (device_id, status)
     VALUES (?, 'offline')
     ON CONFLICT(device_id) DO UPDATE SET status='offline'`,
  ).run(deviceId);

  broadcast("device_offline", { device_id: deviceId });
}

function checkThresholds(
  device: Device,
  cpuUsage: number | null,
  cpuTemp: number | null,
  memUsage: number | null,
  diskUsage: number | null,
) {
  const db = getDb();
  const settings: Record<string, string> = {};
  const rows = db.prepare("SELECT key, value FROM settings").all() as {
    key: string;
    value: string;
  }[];
  for (const row of rows) {
    settings[row.key] = row.value;
  }

  const checks: {
    type: string;
    value: number | null;
    threshold: number;
    message: string;
  }[] = [
    {
      type: "high_cpu",
      value: cpuUsage,
      threshold: parseFloat(settings.cpu_threshold || "90"),
      message: `CPU usage at ${cpuUsage?.toFixed(1)}%`,
    },
    {
      type: "high_temp",
      value: cpuTemp,
      threshold: parseFloat(settings.temp_threshold || "70"),
      message: `Temperature at ${cpuTemp?.toFixed(1)}°C`,
    },
    {
      type: "high_memory",
      value: memUsage,
      threshold: parseFloat(settings.memory_threshold || "90"),
      message: `Memory usage at ${memUsage?.toFixed(1)}%`,
    },
    {
      type: "low_disk",
      value: diskUsage,
      threshold: parseFloat(settings.disk_threshold || "90"),
      message: `Disk usage at ${diskUsage?.toFixed(1)}%`,
    },
  ];

  for (const check of checks) {
    if (check.value != null && check.value > check.threshold) {
      const existing = db
        .prepare(
          `SELECT id FROM alerts
           WHERE device_id = ? AND type = ? AND resolved_at IS NULL
             AND created_at > datetime('now', '-5 minutes')`,
        )
        .get(device.id, check.type);

      if (!existing) {
        const result = db
          .prepare(
            `INSERT INTO alerts (device_id, type, message, value, threshold)
             VALUES (?, ?, ?, ?, ?)`,
          )
          .run(
            device.id,
            check.type,
            check.message,
            check.value,
            check.threshold,
          );

        const alert = db
          .prepare("SELECT * FROM alerts WHERE id = ?")
          .get(result.lastInsertRowid);
        broadcast("alert", alert);
      }
    }
  }
}
