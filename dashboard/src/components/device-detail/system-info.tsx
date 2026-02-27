"use client";

import {
  Server,
  Globe,
  Clock,
  Cpu,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUptime } from "@/lib/utils";
import type { DeviceWithStatus } from "@/types";

interface SystemInfoProps {
  device: DeviceWithStatus;
}

export function SystemInfo({ device }: SystemInfoProps) {
  const status = device.status;
  const isOnline = status?.status === "online";
  const isOffline = status?.status === "offline";

  const dotColor = isOnline
    ? "bg-emerald-500"
    : isOffline
      ? "bg-red-500"
      : "bg-zinc-400";

  const statusLabel = status?.status ?? "unknown";

  const items = [
    {
      icon: Server,
      label: "Hostname",
      value: status?.hostname ?? "N/A",
    },
    {
      icon: Cpu,
      label: "Model",
      value: status?.model ?? "N/A",
    },
    {
      icon: Info,
      label: "OS",
      value: status?.os_info ?? "N/A",
    },
    {
      icon: Globe,
      label: "IP Address",
      value: status?.ip_address ?? device.host,
    },
    {
      icon: Clock,
      label: "Uptime",
      value: formatUptime(status?.uptime_seconds),
    },
    {
      icon: Info,
      label: "Agent Version",
      value: status?.agent_version ?? "N/A",
    },
  ];

  return (
    <Card className="shadow-sm ring-1 ring-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">System Info</CardTitle>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dotColor} ${isOnline ? "animate-pulse" : ""}`} />
          <span className="text-xs font-medium capitalize text-muted-foreground">
            {statusLabel}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-start gap-3 rounded-lg bg-muted/30 p-3 ring-1 ring-border/30"
              >
                <div className="rounded-md bg-background p-1.5 shadow-sm ring-1 ring-border/50">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd className="mt-0.5 truncate text-sm font-medium">
                    {item.value}
                  </dd>
                </div>
              </div>
            );
          })}
        </dl>
      </CardContent>
    </Card>
  );
}
