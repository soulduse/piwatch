"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DeviceForm } from "./device-form";
import { useDevices } from "@/hooks/use-devices";
import type { Device, DiscoveredAgent } from "@/types";

export function DeviceList() {
  const { devices, refetch } = useDevices();
  const [editDevice, setEditDevice] = useState<Device | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveredAgent[]>([]);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this device?")) return;

    try {
      const res = await fetch(`/api/devices/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Device deleted");
        refetch();
      } else {
        toast.error("Failed to delete device");
      }
    } catch {
      toast.error("Failed to delete device");
    }
  }

  async function handleScan() {
    setScanning(true);
    setDiscovered([]);
    try {
      const res = await fetch("/api/discover");
      if (res.ok) {
        const data: DiscoveredAgent[] = await res.json();
        setDiscovered(data);
        if (data.length === 0) {
          toast.info("No agents found on the network");
        } else {
          toast.success(`Found ${data.length} agent(s)`);
        }
      } else {
        toast.error("Network scan failed");
      }
    } catch {
      toast.error("Network scan failed");
    } finally {
      setScanning(false);
    }
  }

  async function handleAddDiscovered(agent: DiscoveredAgent) {
    try {
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agent.hostname,
          host: agent.host,
          port: agent.port,
        }),
      });
      if (res.ok) {
        toast.success(`Added ${agent.hostname}`);
        refetch();
        setDiscovered((prev) =>
          prev.map((d) =>
            d.host === agent.host
              ? { ...d, already_registered: true }
              : d,
          ),
        );
      }
    } catch {
      toast.error("Failed to add device");
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Registered Devices</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleScan}
              disabled={scanning}
            >
              {scanning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Scan Network
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Device
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No devices registered. Add a device or scan the network to discover
              agents.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell>{device.host}</TableCell>
                    <TableCell>{device.port}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          device.status?.status === "online"
                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                            : device.status?.status === "offline"
                              ? "bg-red-500/10 text-red-500 border-red-500/20"
                              : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                        }
                      >
                        {device.status?.status ?? "unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditDevice(device)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(device.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {discovered.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-medium">Discovered Agents</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hostname</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead className="w-[100px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discovered.map((agent) => (
                    <TableRow key={agent.host}>
                      <TableCell className="font-medium">
                        {agent.hostname}
                      </TableCell>
                      <TableCell>{agent.host}</TableCell>
                      <TableCell>{agent.model}</TableCell>
                      <TableCell>{agent.agent_version}</TableCell>
                      <TableCell>
                        {agent.already_registered ? (
                          <Badge variant="outline">Registered</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddDiscovered(agent)}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Add
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <DeviceForm
        open={showAdd}
        onOpenChange={setShowAdd}
        onSuccess={refetch}
      />

      {editDevice && (
        <DeviceForm
          open={!!editDevice}
          onOpenChange={(open) => {
            if (!open) setEditDevice(null);
          }}
          device={editDevice}
          onSuccess={refetch}
        />
      )}
    </>
  );
}
