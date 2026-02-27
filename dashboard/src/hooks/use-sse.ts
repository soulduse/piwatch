"use client";

import { useEffect, useRef } from "react";
import { useDeviceStore } from "@/stores/device-store";

export function useSSE() {
  const { updateDevice, addAlert, updateMetrics, markOffline } =
    useDeviceStore();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/stream");
    eventSourceRef.current = es;

    es.addEventListener("device_update", (e) => {
      try {
        const data = JSON.parse(e.data);
        updateDevice(data);
      } catch { /* ignore parse errors */ }
    });

    es.addEventListener("metrics_update", (e) => {
      try {
        const data = JSON.parse(e.data);
        updateMetrics(data.device_id, data.metrics);
      } catch { /* ignore parse errors */ }
    });

    es.addEventListener("alert", (e) => {
      try {
        const data = JSON.parse(e.data);
        addAlert(data);
      } catch { /* ignore parse errors */ }
    });

    es.addEventListener("device_offline", (e) => {
      try {
        const data = JSON.parse(e.data);
        markOffline(data.device_id);
      } catch { /* ignore parse errors */ }
    });

    es.onerror = () => {
      // Auto-reconnect is built into EventSource
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [updateDevice, addAlert, updateMetrics, markOffline]);
}
