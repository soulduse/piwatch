"use client";

import { useEffect, useState } from "react";
import { Wifi } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { WifiInfo } from "@/types";

interface WifiCardProps {
  deviceId: string;
}

export function WifiCard({ deviceId }: WifiCardProps) {
  const [wifiInfo, setWifiInfo] = useState<WifiInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function fetchWifi() {
      try {
        const res = await fetch(`/api/devices/${deviceId}/wifi`);
        if (res.ok) {
          const data = await res.json();
          setWifiInfo(data);
          setSsid(data.ssid ?? "");
        }
      } catch {
        // WiFi info may not be available
      } finally {
        setLoading(false);
      }
    }
    fetchWifi();
  }, [deviceId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ssid || !password) return;

    setUpdating(true);
    try {
      const res = await fetch(`/api/devices/${deviceId}/wifi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ssid, password }),
      });

      if (res.ok) {
        toast.success("WiFi configuration updated");
        setPassword("");
        // Refresh wifi info
        const refreshRes = await fetch(`/api/devices/${deviceId}/wifi`);
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setWifiInfo(refreshData);
          setSsid(refreshData.ssid ?? "");
        }
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update WiFi");
      }
    } catch {
      toast.error("Failed to connect to device");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wifi className="h-4 w-4" />
          WiFi Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading WiFi info...</p>
        ) : wifiInfo ? (
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">SSID</span>
              <span className="font-medium">{wifiInfo.ssid}</span>
            </div>
            {wifiInfo.signal_dbm != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Signal</span>
                <span className="font-medium">{wifiInfo.signal_dbm} dBm</span>
              </div>
            )}
            {wifiInfo.frequency && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frequency</span>
                <span className="font-medium">{wifiInfo.frequency} GHz</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            WiFi info not available.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium">Change WiFi Network</p>
          <div className="space-y-2">
            <Label htmlFor="ssid">SSID</Label>
            <Input
              id="ssid"
              value={ssid}
              onChange={(e) => setSsid(e.target.value)}
              placeholder="Network name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Network password"
            />
          </div>
          <Button type="submit" size="sm" disabled={updating || !ssid || !password}>
            {updating ? "Updating..." : "Update WiFi"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
