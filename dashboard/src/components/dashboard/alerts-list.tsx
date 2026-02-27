"use client";

import {
  AlertTriangle,
  Cpu,
  Thermometer,
  MemoryStick,
  HardDrive,
  ShieldCheck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useDeviceStore } from "@/stores/device-store";
import { formatDate } from "@/lib/utils";

const alertTypeConfig: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badgeClass: string;
}> = {
  high_cpu: {
    icon: Cpu,
    color: "text-orange-500",
    badgeClass: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
  },
  high_temp: {
    icon: Thermometer,
    color: "text-red-500",
    badgeClass: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
  },
  high_memory: {
    icon: MemoryStick,
    color: "text-amber-500",
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  },
  low_disk: {
    icon: HardDrive,
    color: "text-purple-500",
    badgeClass: "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400",
  },
};

export function AlertsList() {
  const { alerts, devices } = useDeviceStore();
  const recentAlerts = alerts.slice(0, 20);

  const deviceNameMap = new Map(devices.map((d) => [d.id, d.name]));

  if (recentAlerts.length === 0) {
    return (
      <Card className="shadow-sm ring-1 ring-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Recent Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="mb-3 rounded-full bg-emerald-500/10 p-3">
              <ShieldCheck className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="text-sm font-medium">All clear</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No alerts have been triggered
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm ring-1 ring-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Recent Alerts
          <Badge variant="secondary" className="ml-auto text-xs">
            {recentAlerts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Type</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentAlerts.map((alert) => {
              const config = alertTypeConfig[alert.type];
              const Icon = config?.icon ?? AlertTriangle;
              const iconColor = config?.color ?? "text-muted-foreground";
              const badgeClass = config?.badgeClass ?? "";
              return (
                <TableRow key={alert.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${badgeClass}`}
                      >
                        {alert.type.replace("_", " ")}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {deviceNameMap.get(alert.device_id) ?? alert.device_id}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {alert.message}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatDate(alert.created_at)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
