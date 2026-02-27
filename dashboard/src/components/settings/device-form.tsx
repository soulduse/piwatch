"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Device } from "@/types";

interface DeviceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device?: Device | null;
  onSuccess: () => void;
}

export function DeviceForm({
  open,
  onOpenChange,
  device,
  onSuccess,
}: DeviceFormProps) {
  const isEdit = !!device;
  const [name, setName] = useState(device?.name ?? "");
  const [host, setHost] = useState(device?.host ?? "");
  const [port, setPort] = useState(String(device?.port ?? 9100));
  const [token, setToken] = useState(device?.token ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const body = {
        name,
        host,
        port: parseInt(port),
        token: token || null,
      };

      const url = isEdit ? `/api/devices/${device.id}` : "/api/devices";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(isEdit ? "Device updated" : "Device added");
        onOpenChange(false);
        onSuccess();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save device");
      }
    } catch {
      toast.error("Failed to save device");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Device" : "Add Device"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="device-name">Name</Label>
            <Input
              id="device-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Raspberry Pi"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="device-host">Host</Label>
            <Input
              id="device-host"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="192.168.1.100"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="device-port">Port</Label>
            <Input
              id="device-port"
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              min={1}
              max={65535}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="device-token">Auth Token (optional)</Label>
            <Input
              id="device-token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Bearer token for secure operations"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Update" : "Add Device"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
