import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import type { Device, DeviceStatus, Metrics } from "@/types";

const createDeviceSchema = z.object({
  name: z.string().min(1).max(100),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(9100),
  token: z.string().nullable().optional(),
});

export async function GET() {
  const db = getDb();
  const devices = db
    .prepare(
      `SELECT d.*, ds.status, ds.last_seen, ds.hostname, ds.model, ds.os_info,
              ds.uptime_seconds, ds.agent_version, ds.ip_address
       FROM devices d
       LEFT JOIN device_status ds ON d.id = ds.device_id
       ORDER BY d.name`,
    )
    .all() as (Device & Partial<DeviceStatus>)[];

  // Fetch latest metrics for each device
  const latestMetricsStmt = db.prepare(
    `SELECT * FROM metrics WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1`,
  );

  const result = devices.map((d) => {
    const latestRow = latestMetricsStmt.get(d.id) as Metrics | undefined;
    return {
      id: d.id,
      name: d.name,
      host: d.host,
      port: d.port,
      token: d.token,
      created_at: d.created_at,
      updated_at: d.updated_at,
      status: d.status
        ? {
            device_id: d.id,
            status: d.status,
            last_seen: d.last_seen ?? null,
            hostname: d.hostname ?? null,
            model: d.model ?? null,
            os_info: d.os_info ?? null,
            uptime_seconds: d.uptime_seconds ?? null,
            agent_version: d.agent_version ?? null,
            ip_address: d.ip_address ?? null,
          }
        : null,
      latest_metrics: latestRow
        ? {
            cpu_usage: latestRow.cpu_usage,
            cpu_temp: latestRow.cpu_temp,
            memory_usage: latestRow.memory_usage,
            memory_total: latestRow.memory_total,
            disk_usage: latestRow.disk_usage,
            disk_total: latestRow.disk_total,
            network_rx: latestRow.network_rx,
            network_tx: latestRow.network_tx,
          }
        : null,
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createDeviceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, host, port, token } = parsed.data;
  const db = getDb();

  const result = db
    .prepare(
      "INSERT INTO devices (name, host, port, token) VALUES (?, ?, ?, ?) RETURNING *",
    )
    .get(name, host, port, token ?? null) as Device;

  // Create initial device_status
  db.prepare(
    "INSERT INTO device_status (device_id, status) VALUES (?, 'unknown')",
  ).run(result.id);

  return NextResponse.json(result, { status: 201 });
}
