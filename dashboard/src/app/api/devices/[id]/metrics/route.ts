import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { timeRangeToMinutes } from "@/lib/utils";
import type { Metrics } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const range = searchParams.get("range") || "1h";

  const db = getDb();

  const device = db.prepare("SELECT id FROM devices WHERE id = ?").get(id);
  if (!device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  const minutes = timeRangeToMinutes(range);

  const metrics = db
    .prepare(
      `SELECT * FROM metrics
       WHERE device_id = ? AND timestamp > datetime('now', ?)
       ORDER BY timestamp ASC`,
    )
    .all(id, `-${minutes} minutes`) as Metrics[];

  return NextResponse.json(metrics);
}
