import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import type { Device, DeviceStatus } from "@/types";

const updateDeviceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  host: z.string().min(1).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  token: z.string().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = getDb();

  const device = db
    .prepare(
      `SELECT d.*, ds.status, ds.last_seen, ds.hostname, ds.model, ds.os_info,
              ds.uptime_seconds, ds.agent_version, ds.ip_address
       FROM devices d
       LEFT JOIN device_status ds ON d.id = ds.device_id
       WHERE d.id = ?`,
    )
    .get(id) as (Device & Partial<DeviceStatus>) | undefined;

  if (!device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: device.id,
    name: device.name,
    host: device.host,
    port: device.port,
    token: device.token,
    created_at: device.created_at,
    updated_at: device.updated_at,
    status: device.status
      ? {
          device_id: device.id,
          status: device.status,
          last_seen: device.last_seen ?? null,
          hostname: device.hostname ?? null,
          model: device.model ?? null,
          os_info: device.os_info ?? null,
          uptime_seconds: device.uptime_seconds ?? null,
          agent_version: device.agent_version ?? null,
          ip_address: device.ip_address ?? null,
        }
      : null,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateDeviceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const db = getDb();
  const existing = db.prepare("SELECT * FROM devices WHERE id = ?").get(id);
  if (!existing) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE devices SET ${updates.join(", ")} WHERE id = ?`).run(
      ...values,
    );
  }

  const updated = db.prepare("SELECT * FROM devices WHERE id = ?").get(id);
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = getDb();

  const existing = db.prepare("SELECT * FROM devices WHERE id = ?").get(id);
  if (!existing) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  db.prepare("DELETE FROM devices WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
