import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import type { Device } from "@/types";

const cronUpdateSchema = z.object({
  user: z.string().min(1),
  content: z.string(),
});

function getDeviceOrError(id: string) {
  const db = getDb();
  const device = db
    .prepare("SELECT * FROM devices WHERE id = ?")
    .get(id) as Device | undefined;
  if (!device) {
    return { error: NextResponse.json({ error: "Device not found" }, { status: 404 }) };
  }
  return { device };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = getDeviceOrError(id);
  if ("error" in result) return result.error;
  const { device } = result;

  const baseUrl = `http://${device.host}:${device.port}`;
  try {
    const res = await fetch(`${baseUrl}/cron`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Agent returned ${res.status}` },
        { status: 502 },
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to agent" },
      { status: 502 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = getDeviceOrError(id);
  if ("error" in result) return result.error;
  const { device } = result;

  const body = await request.json();
  const parsed = cronUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const baseUrl = `http://${device.host}:${device.port}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (device.token) {
    headers["X-Auth-Token"] = device.token;
  }

  try {
    const res = await fetch(`${baseUrl}/cron`, {
      method: "POST",
      headers,
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Agent returned ${res.status}: ${text}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to agent" },
      { status: 502 },
    );
  }
}
