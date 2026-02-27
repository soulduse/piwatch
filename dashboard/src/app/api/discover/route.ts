import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { networkInterfaces } from "os";
import type { Device, DiscoveredAgent, AgentHealthResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  // Get server's local IPs to determine subnets to scan
  const nets = networkInterfaces();
  const subnets: string[] = [];

  for (const interfaces of Object.values(nets)) {
    if (!interfaces) continue;
    for (const iface of interfaces) {
      if (iface.family === "IPv4" && !iface.internal) {
        // Extract subnet (e.g., 192.168.1)
        const parts = iface.address.split(".");
        subnets.push(`${parts[0]}.${parts[1]}.${parts[2]}`);
      }
    }
  }

  if (subnets.length === 0) {
    return NextResponse.json(
      { error: "No network interfaces found" },
      { status: 500 },
    );
  }

  const db = getDb();
  const registeredDevices = db
    .prepare("SELECT host, port FROM devices")
    .all() as Pick<Device, "host" | "port">[];
  const registeredHosts = new Set(
    registeredDevices.map((d) => `${d.host}:${d.port}`),
  );

  const discovered: DiscoveredAgent[] = [];
  const port = 9100;

  // Scan each subnet
  for (const subnet of subnets) {
    const promises: Promise<DiscoveredAgent | null>[] = [];

    for (let i = 1; i <= 254; i++) {
      const host = `${subnet}.${i}`;
      promises.push(probeHost(host, port, registeredHosts));
    }

    const results = await Promise.all(promises);
    for (const result of results) {
      if (result) discovered.push(result);
    }
  }

  return NextResponse.json(discovered);
}

async function probeHost(
  host: string,
  port: number,
  registeredHosts: Set<string>,
): Promise<DiscoveredAgent | null> {
  try {
    const res = await fetch(`http://${host}:${port}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;

    const health: AgentHealthResponse = await res.json();
    return {
      host,
      port,
      hostname: health.hostname,
      model: health.model,
      agent_version: health.agent_version,
      already_registered: registeredHosts.has(`${host}:${port}`),
    };
  } catch {
    return null;
  }
}
