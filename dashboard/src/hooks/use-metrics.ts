"use client";

import { useState, useEffect, useCallback } from "react";
import type { Metrics, TimeRange } from "@/types";

export function useMetrics(deviceId: string, range: TimeRange = "1h") {
  const [metrics, setMetrics] = useState<Metrics[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/devices/${deviceId}/metrics?range=${range}`,
      );
      if (res.ok) {
        const data: Metrics[] = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error("Failed to fetch metrics:", err);
    } finally {
      setLoading(false);
    }
  }, [deviceId, range]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return { metrics, loading, refetch: fetchMetrics };
}
