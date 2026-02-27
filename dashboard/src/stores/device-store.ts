import { create } from "zustand";
import type { DeviceWithStatus, Alert, Metrics } from "@/types";

interface DeviceStore {
  devices: DeviceWithStatus[];
  alerts: Alert[];
  latestMetrics: Record<string, Partial<Metrics>>;
  setDevices: (devices: DeviceWithStatus[]) => void;
  updateDevice: (device: DeviceWithStatus) => void;
  removeDevice: (id: string) => void;
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  updateMetrics: (deviceId: string, metrics: Partial<Metrics>) => void;
  markOffline: (deviceId: string) => void;
}

export const useDeviceStore = create<DeviceStore>((set) => ({
  devices: [],
  alerts: [],
  latestMetrics: {},

  setDevices: (devices) => set({ devices }),

  updateDevice: (device) =>
    set((state) => {
      const idx = state.devices.findIndex((d) => d.id === device.id);
      if (idx >= 0) {
        const next = [...state.devices];
        next[idx] = device;
        return { devices: next };
      }
      return { devices: [...state.devices, device] };
    }),

  removeDevice: (id) =>
    set((state) => ({
      devices: state.devices.filter((d) => d.id !== id),
    })),

  setAlerts: (alerts) => set({ alerts }),

  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts].slice(0, 100),
    })),

  updateMetrics: (deviceId, metrics) =>
    set((state) => ({
      latestMetrics: {
        ...state.latestMetrics,
        [deviceId]: metrics,
      },
    })),

  markOffline: (deviceId) =>
    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === deviceId
          ? { ...d, status: d.status ? { ...d.status, status: "offline" as const } : null }
          : d,
      ),
    })),
}));
