"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Thermometer,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatUptime, formatBytes } from "@/lib/utils";
import { useDeviceStore } from "@/stores/device-store";
import type { DeviceWithStatus } from "@/types";

interface DeviceCardProps {
  device: DeviceWithStatus;
}

function ProgressBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const color =
    value >= 80
      ? "bg-red-500"
      : value >= 60
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-muted ${className ?? ""}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function getValueColor(value: number | null | undefined): string {
  if (value == null) return "text-muted-foreground";
  if (value >= 80) return "text-red-500";
  if (value >= 60) return "text-amber-500";
  return "text-foreground";
}

function formatLastSeen(lastSeen: string | null | undefined): string {
  if (!lastSeen) return "never";
  const now = Date.now();
  const seen = new Date(lastSeen + "Z").getTime();
  const diffSec = Math.floor((now - seen) / 1000);
  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export function DeviceCard({ device }: DeviceCardProps) {
  const latestMetrics = useDeviceStore(
    (s) => s.latestMetrics[device.id],
  );
  const status = device.status?.status ?? "unknown";

  const isOnline = status === "online";
  const isOffline = status === "offline";

  const topBorderColor = isOnline
    ? "border-t-emerald-500"
    : isOffline
      ? "border-t-red-500"
      : "border-t-zinc-400";

  const statusBadgeClass = isOnline
    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
    : isOffline
      ? "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400"
      : "bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:text-zinc-400";

  const cpu = latestMetrics?.cpu_usage;
  const mem = latestMetrics?.memory_usage;
  const temp = latestMetrics?.cpu_temp;
  const disk = latestMetrics?.disk_usage;
  const memTotal = latestMetrics?.memory_total;
  const diskTotal = latestMetrics?.disk_total;
  const netRx = latestMetrics?.network_rx;
  const netTx = latestMetrics?.network_tx;

  return (
    <Link href={`/devices/${device.id}`}>
      <Card
        className={`border-t-2 ${topBorderColor} shadow-sm ring-1 ring-border/50 transition-all duration-200 hover:shadow-md hover:ring-border hover:-translate-y-0.5`}
      >
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold tracking-tight">
              {device.name}
            </h3>
            <Badge variant="outline" className={`text-[10px] font-medium uppercase ${statusBadgeClass}`}>
              {status}
            </Badge>
          </div>

          {/* Subtitle */}
          <p className="mt-1 text-xs text-muted-foreground">
            {device.status?.model ?? device.host}
            {device.status?.uptime_seconds != null && (
              <span className="ml-1.5 inline-flex items-center gap-0.5">
                <Clock className="inline h-3 w-3" />
                {formatUptime(device.status.uptime_seconds)}
              </span>
            )}
          </p>

          {/* Metrics */}
          {isOnline ? (
            <div className="mt-4 space-y-3">
              {/* CPU Row */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">CPU</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold tabular-nums ${getValueColor(cpu)}`}>
                      {cpu != null ? `${cpu.toFixed(1)}%` : "N/A"}
                    </span>
                    {temp != null && (
                      <span className={`inline-flex items-center gap-0.5 ${getValueColor(temp > 65 ? 80 : temp > 50 ? 60 : 0)}`}>
                        <Thermometer className="h-3 w-3" />
                        <span className="tabular-nums">{temp.toFixed(0)}°C</span>
                      </span>
                    )}
                  </div>
                </div>
                {cpu != null && <ProgressBar value={cpu} />}
              </div>

              {/* RAM Row */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">RAM</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold tabular-nums ${getValueColor(mem)}`}>
                      {mem != null ? `${mem.toFixed(1)}%` : "N/A"}
                    </span>
                    {memTotal != null && (
                      <span className="text-muted-foreground tabular-nums">
                        {formatBytes(memTotal)}
                      </span>
                    )}
                  </div>
                </div>
                {mem != null && <ProgressBar value={mem} />}
              </div>

              {/* Disk Row */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">Disk</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold tabular-nums ${getValueColor(disk)}`}>
                      {disk != null ? `${disk.toFixed(1)}%` : "N/A"}
                    </span>
                    {diskTotal != null && (
                      <span className="text-muted-foreground tabular-nums">
                        {formatBytes(diskTotal)}
                      </span>
                    )}
                  </div>
                </div>
                {disk != null && <ProgressBar value={disk} />}
              </div>

              {/* Footer: Network + Last Seen */}
              <div className="flex items-center justify-between border-t pt-2.5 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  {netRx != null && (
                    <span className="inline-flex items-center gap-0.5">
                      <ArrowDown className="h-3 w-3 text-blue-500" />
                      <span className="tabular-nums">{formatBytes(netRx)}</span>
                    </span>
                  )}
                  {netTx != null && (
                    <span className="inline-flex items-center gap-0.5">
                      <ArrowUp className="h-3 w-3 text-violet-500" />
                      <span className="tabular-nums">{formatBytes(netTx)}</span>
                    </span>
                  )}
                </div>
                <span>
                  Last: {formatLastSeen(device.status?.last_seen)}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-md bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">
                {isOffline
                  ? "Device is offline"
                  : "Waiting for first poll..."}
              </p>
              {device.status?.last_seen && (
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  Last seen: {formatLastSeen(device.status.last_seen)}
                </p>
              )}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
