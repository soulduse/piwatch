"use client";

import {
  Wifi,
  Cpu,
  Thermometer,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useDeviceStore } from "@/stores/device-store";

export function FleetOverviewCards() {
  const { devices, alerts } = useDeviceStore();

  const onlineCount = devices.filter(
    (d) => d.status?.status === "online",
  ).length;
  const totalCount = devices.length;

  const onlineDevices = devices.filter((d) => d.status?.status === "online");

  const avgCpu =
    onlineDevices.length > 0
      ? onlineDevices.reduce((sum, d) => {
          const m = useDeviceStore.getState().latestMetrics[d.id];
          return sum + (m?.cpu_usage ?? 0);
        }, 0) / onlineDevices.length
      : 0;

  const avgTemp =
    onlineDevices.length > 0
      ? onlineDevices.reduce((sum, d) => {
          const m = useDeviceStore.getState().latestMetrics[d.id];
          return sum + (m?.cpu_temp ?? 0);
        }, 0) / onlineDevices.length
      : 0;

  const activeAlerts = alerts.filter((a) => !a.resolved_at).length;

  const cards = [
    {
      title: "Online Devices",
      value: `${onlineCount} / ${totalCount}`,
      description: totalCount > 0 ? `of ${totalCount} device${totalCount !== 1 ? "s" : ""}` : "no devices",
      icon: Wifi,
      iconColor: onlineCount > 0 ? "text-emerald-500" : "text-muted-foreground",
      borderColor: "border-l-emerald-500",
      bgGradient: "bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20",
    },
    {
      title: "Avg CPU",
      value: avgCpu > 0 ? `${avgCpu.toFixed(1)}%` : "N/A",
      description: onlineDevices.length > 0 ? `across ${onlineDevices.length} device${onlineDevices.length !== 1 ? "s" : ""}` : "no data",
      icon: Cpu,
      iconColor:
        avgCpu > 80
          ? "text-red-500"
          : avgCpu > 60
            ? "text-amber-500"
            : "text-blue-500",
      borderColor:
        avgCpu > 80
          ? "border-l-red-500"
          : avgCpu > 60
            ? "border-l-amber-500"
            : "border-l-blue-500",
      bgGradient:
        avgCpu > 80
          ? "bg-gradient-to-br from-red-50/50 to-transparent dark:from-red-950/20"
          : avgCpu > 60
            ? "bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20"
            : "bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20",
    },
    {
      title: "Avg Temp",
      value: avgTemp > 0 ? `${avgTemp.toFixed(1)}°C` : "N/A",
      description: avgTemp > 70 ? "running hot" : avgTemp > 0 ? "normal range" : "no data",
      icon: Thermometer,
      iconColor:
        avgTemp > 70
          ? "text-red-500"
          : avgTemp > 60
            ? "text-amber-500"
            : "text-orange-500",
      borderColor:
        avgTemp > 70
          ? "border-l-red-500"
          : avgTemp > 60
            ? "border-l-amber-500"
            : "border-l-orange-500",
      bgGradient:
        avgTemp > 70
          ? "bg-gradient-to-br from-red-50/50 to-transparent dark:from-red-950/20"
          : avgTemp > 60
            ? "bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20"
            : "bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-950/20",
    },
    {
      title: "Active Alerts",
      value: String(activeAlerts),
      description: activeAlerts > 0 ? "need attention" : "all clear",
      icon: AlertTriangle,
      iconColor: activeAlerts > 0 ? "text-red-500" : "text-emerald-500",
      borderColor: activeAlerts > 0 ? "border-l-red-500" : "border-l-emerald-500",
      bgGradient: activeAlerts > 0
        ? "bg-gradient-to-br from-red-50/50 to-transparent dark:from-red-950/20"
        : "bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.title}
            className={`border-l-4 ${card.borderColor} ${card.bgGradient} shadow-sm ring-1 ring-border/50 transition-all hover:shadow-md`}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {card.title}
                </p>
                <div className={`rounded-full bg-background p-1.5 shadow-sm ring-1 ring-border/50`}>
                  <Icon className={`h-3.5 w-3.5 ${card.iconColor}`} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{card.description}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
