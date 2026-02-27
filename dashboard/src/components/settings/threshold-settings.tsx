"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { Settings } from "@/types";

export function ThresholdSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          setSettings(await res.json());
        }
      } catch {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSettings(await res.json());
        toast.success("Settings saved");
      } else {
        toast.error("Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </CardContent>
      </Card>
    );
  }

  function updateField(key: keyof Settings, value: string) {
    setSettings((prev) =>
      prev ? { ...prev, [key]: parseFloat(value) || 0 } : prev,
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Polling & Alert Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Polling</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="poll_interval">Poll Interval (seconds)</Label>
              <Input
                id="poll_interval"
                type="number"
                min={5}
                max={300}
                value={settings.poll_interval}
                onChange={(e) => updateField("poll_interval", e.target.value)}
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="text-sm font-medium">Alert Thresholds</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cpu_threshold">CPU Threshold (%)</Label>
              <Input
                id="cpu_threshold"
                type="number"
                min={0}
                max={100}
                value={settings.cpu_threshold}
                onChange={(e) => updateField("cpu_threshold", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="temp_threshold">Temperature Threshold (°C)</Label>
              <Input
                id="temp_threshold"
                type="number"
                min={0}
                max={120}
                value={settings.temp_threshold}
                onChange={(e) => updateField("temp_threshold", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memory_threshold">Memory Threshold (%)</Label>
              <Input
                id="memory_threshold"
                type="number"
                min={0}
                max={100}
                value={settings.memory_threshold}
                onChange={(e) => updateField("memory_threshold", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="disk_threshold">Disk Threshold (%)</Label>
              <Input
                id="disk_threshold"
                type="number"
                min={0}
                max={100}
                value={settings.disk_threshold}
                onChange={(e) => updateField("disk_threshold", e.target.value)}
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="text-sm font-medium">Data Retention</h4>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="retention_raw_days">Raw Data (days)</Label>
              <Input
                id="retention_raw_days"
                type="number"
                min={1}
                max={365}
                value={settings.retention_raw_days}
                onChange={(e) =>
                  updateField("retention_raw_days", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retention_hourly_days">Hourly Data (days)</Label>
              <Input
                id="retention_hourly_days"
                type="number"
                min={1}
                max={365}
                value={settings.retention_hourly_days}
                onChange={(e) =>
                  updateField("retention_hourly_days", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retention_daily_days">Daily Data (days)</Label>
              <Input
                id="retention_daily_days"
                type="number"
                min={1}
                max={3650}
                value={settings.retention_daily_days}
                onChange={(e) =>
                  updateField("retention_daily_days", e.target.value)
                }
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
