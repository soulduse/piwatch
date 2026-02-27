import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Device } from "@/types";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = getDb();

  const device = db
    .prepare("SELECT * FROM devices WHERE id = ?")
    .get(id) as Device | undefined;
  if (!device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  const baseUrl = `http://${device.host}:${device.port}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (device.token) {
    headers["X-Auth-Token"] = device.token;
  }

  try {
    const res = await fetch(`${baseUrl}/reboot`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Agent returned ${res.status}: ${text}` },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, message: "Reboot initiated" });
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to agent" },
      { status: 502 },
    );
  }
}
