import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import type { Settings } from "@/types";

const updateSettingsSchema = z.object({
  poll_interval: z.number().int().min(5).max(300).optional(),
  temp_threshold: z.number().min(0).max(120).optional(),
  cpu_threshold: z.number().min(0).max(100).optional(),
  memory_threshold: z.number().min(0).max(100).optional(),
  disk_threshold: z.number().min(0).max(100).optional(),
  retention_raw_days: z.number().int().min(1).max(365).optional(),
  retention_hourly_days: z.number().int().min(1).max(365).optional(),
  retention_daily_days: z.number().int().min(1).max(3650).optional(),
});

export async function GET() {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM settings").all() as {
    key: string;
    value: string;
  }[];

  const settings: Record<string, number> = {};
  for (const row of rows) {
    settings[row.key] = parseFloat(row.value);
  }

  return NextResponse.json(settings as unknown as Settings);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const parsed = updateSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const db = getDb();
  const update = db.prepare(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
  );

  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      update.run(key, String(value));
    }
  }

  // Return updated settings
  const rows = db.prepare("SELECT key, value FROM settings").all() as {
    key: string;
    value: string;
  }[];
  const settings: Record<string, number> = {};
  for (const row of rows) {
    settings[row.key] = parseFloat(row.value);
  }

  return NextResponse.json(settings as unknown as Settings);
}
