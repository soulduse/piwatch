"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Process, Device } from "@/types";

interface ProcessTableProps {
  device: Device;
}

export function ProcessTable({ device }: ProcessTableProps) {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProcesses() {
      try {
        setLoading(true);
        const res = await fetch(
          `http://${device.host}:${device.port}/metrics`,
          { signal: AbortSignal.timeout(5000) },
        );
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        setProcesses(data.processes ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch");
      } finally {
        setLoading(false);
      }
    }
    fetchProcesses();
  }, [device.host, device.port]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Top Processes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading processes...</p>
        ) : error ? (
          <p className="text-sm text-red-500">Error: {error}</p>
        ) : processes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No processes found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>CPU %</TableHead>
                  <TableHead>Mem %</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processes.map((proc) => (
                  <TableRow key={proc.pid}>
                    <TableCell className="font-mono text-xs">
                      {proc.pid}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-medium">
                      {proc.name}
                    </TableCell>
                    <TableCell>{proc.cpu_percent.toFixed(1)}%</TableCell>
                    <TableCell>{proc.memory_percent.toFixed(1)}%</TableCell>
                    <TableCell>{proc.username}</TableCell>
                    <TableCell className="text-xs">{proc.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
