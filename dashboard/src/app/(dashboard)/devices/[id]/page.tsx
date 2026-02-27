"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { SystemInfo } from "@/components/device-detail/system-info";
import { MetricsCharts } from "@/components/device-detail/metrics-charts";
import { CronJobTable } from "@/components/device-detail/cron-job-table";
import { ProcessTable } from "@/components/device-detail/process-table";
import { DockerTable } from "@/components/device-detail/docker-table";
import { WifiCard } from "@/components/device-detail/wifi-card";
import type { DeviceWithStatus } from "@/types";

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deviceId = params.id as string;

  const [device, setDevice] = useState<DeviceWithStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRebootConfirm, setShowRebootConfirm] = useState(false);
  const [rebooting, setRebooting] = useState(false);

  useEffect(() => {
    async function fetchDevice() {
      try {
        const res = await fetch(`/api/devices/${deviceId}`);
        if (res.ok) {
          setDevice(await res.json());
        } else if (res.status === 404) {
          router.push("/dashboard");
        }
      } catch {
        toast.error("Failed to load device");
      } finally {
        setLoading(false);
      }
    }
    fetchDevice();

    const interval = setInterval(fetchDevice, 15000);
    return () => clearInterval(interval);
  }, [deviceId, router]);

  async function handleReboot() {
    setRebooting(true);
    try {
      const res = await fetch(`/api/devices/${deviceId}/reboot`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Reboot initiated");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to reboot");
      }
    } catch {
      toast.error("Failed to connect to device");
    } finally {
      setRebooting(false);
      setShowRebootConfirm(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading device...</p>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Device not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{device.name}</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRebootConfirm(true)}
          disabled={device.status?.status !== "online"}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reboot
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cron">Cron Jobs</TabsTrigger>
          <TabsTrigger value="processes">Processes</TabsTrigger>
          <TabsTrigger value="docker">Docker</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SystemInfo device={device} />
            </div>
            <WifiCard deviceId={deviceId} />
          </div>
          <MetricsCharts deviceId={deviceId} />
        </TabsContent>

        <TabsContent value="cron" className="mt-4">
          <CronJobTable device={device} />
        </TabsContent>

        <TabsContent value="processes" className="mt-4">
          <ProcessTable device={device} />
        </TabsContent>

        <TabsContent value="docker" className="mt-4">
          <DockerTable device={device} />
        </TabsContent>
      </Tabs>

      <Dialog open={showRebootConfirm} onOpenChange={setShowRebootConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Reboot</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to reboot <strong>{device.name}</strong>? The
            device will be temporarily unavailable.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRebootConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReboot}
              disabled={rebooting}
            >
              {rebooting ? "Rebooting..." : "Reboot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
