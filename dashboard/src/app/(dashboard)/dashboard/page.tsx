"use client";

import { FleetOverviewCards } from "@/components/dashboard/fleet-overview-cards";
import { DeviceCard } from "@/components/dashboard/device-card";
import { AlertsList } from "@/components/dashboard/alerts-list";
import { useDevices } from "@/hooks/use-devices";

export default function DashboardPage() {
  const { devices } = useDevices();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fleet Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor your Raspberry Pi fleet in real-time
        </p>
      </div>

      <FleetOverviewCards />

      {devices.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <svg
              className="h-6 w-6 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
              />
            </svg>
          </div>
          <p className="text-sm font-medium">No devices registered yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Go to{" "}
            <a href="/settings" className="text-primary underline underline-offset-4 hover:text-primary/80">
              Settings
            </a>{" "}
            to add your Raspberry Pi devices.
          </p>
        </div>
      ) : (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Devices</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {devices.map((device) => (
              <DeviceCard key={device.id} device={device} />
            ))}
          </div>
        </div>
      )}

      <AlertsList />
    </div>
  );
}
