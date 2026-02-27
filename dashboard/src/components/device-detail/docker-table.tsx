"use client";

import { useEffect, useState } from "react";
import { Container } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { DockerContainer, Device } from "@/types";

interface DockerTableProps {
  device: Device;
}

export function DockerTable({ device }: DockerTableProps) {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContainers() {
      try {
        setLoading(true);
        const res = await fetch(
          `http://${device.host}:${device.port}/metrics`,
          { signal: AbortSignal.timeout(5000) },
        );
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        if (!data.docker?.available) {
          setError("Docker not installed");
          return;
        }
        setContainers(data.docker.containers ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch");
      } finally {
        setLoading(false);
      }
    }
    fetchContainers();
  }, [device.host, device.port]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Container className="h-4 w-4" />
          Docker Containers
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">
            Loading containers...
          </p>
        ) : error ? (
          <p className="text-sm text-muted-foreground">
            Docker not available or error: {error}
          </p>
        ) : containers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No containers running.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ports</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {containers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">
                      {c.image}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          c.state === "running"
                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                            : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                        }
                      >
                        {c.state}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{c.status}</TableCell>
                    <TableCell className="text-xs">{c.ports || "-"}</TableCell>
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
