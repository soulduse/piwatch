"use client";

import { useEffect, useCallback, useRef } from "react";
import { useDeviceStore } from "@/stores/device-store";
import type { DeviceWithStatus } from "@/types";

const REFETCH_INTERVAL = 15_000;

export function useDevices() {
  const { devices, setDevices, updateMetrics } = useDeviceStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/devices");
      if (res.ok) {
        const data: DeviceWithStatus[] = await res.json();
        setDevices(data);

        // Populate latestMetrics from the API response
        for (const device of data) {
          if (device.latest_metrics) {
            updateMetrics(device.id, device.latest_metrics);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch devices:", err);
    }
  }, [setDevices, updateMetrics]);

  useEffect(() => {
    fetchDevices();

    // Refetch every 15 seconds to keep status fresh
    intervalRef.current = setInterval(fetchDevices, REFETCH_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchDevices]);

  return { devices, refetch: fetchDevices };
}
