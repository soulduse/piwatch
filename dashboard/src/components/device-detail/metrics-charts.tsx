"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMetrics } from "@/hooks/use-metrics";
import { formatBytes } from "@/lib/utils";
import type { TimeRange } from "@/types";

interface MetricsChartsProps {
  deviceId: string;
}

const timeRanges: { label: string; value: TimeRange }[] = [
  { label: "1H", value: "1h" },
  { label: "6H", value: "6h" },
  { label: "24H", value: "24h" },
  { label: "7D", value: "7d" },
];

function formatTime(timestamp: string) {
  const date = new Date(timestamp + "Z");
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MetricsCharts({ deviceId }: MetricsChartsProps) {
  const [range, setRange] = useState<TimeRange>("1h");
  const { metrics, loading } = useMetrics(deviceId, range);

  const chartData = metrics.map((m) => ({
    time: formatTime(m.timestamp),
    cpu: m.cpu_usage,
    temp: m.cpu_temp,
    memory: m.memory_usage,
    disk: m.disk_usage,
    network_rx: m.network_rx,
    network_tx: m.network_tx,
  }));

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {timeRanges.map((tr) => (
          <Button
            key={tr.value}
            variant={range === tr.value ? "default" : "outline"}
            size="sm"
            onClick={() => setRange(tr.value)}
          >
            {tr.label}
          </Button>
        ))}
      </div>

      {loading && metrics.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading metrics...</p>
      ) : metrics.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No metrics data yet. Waiting for first poll...
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="CPU Usage (%)" color="#3b82f6">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="time" className="text-xs" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="cpu"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Temperature (°C)" color="#ef4444">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="time" className="text-xs" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="temp"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Memory Usage (%)" color="#8b5cf6">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="time" className="text-xs" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="memory"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Disk Usage (%)" color="#f59e0b">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="time" className="text-xs" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="disk"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Network I/O" color="#10b981" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="time" className="text-xs" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => formatBytes(v)} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => formatBytes(v as number)} />
                <Line
                  type="monotone"
                  dataKey="network_rx"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="RX"
                />
                <Line
                  type="monotone"
                  dataKey="network_tx"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={false}
                  name="TX"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}

function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
