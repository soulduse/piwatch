"use client";

import { DeviceList } from "@/components/settings/device-list";
import { ThresholdSettings } from "@/components/settings/threshold-settings";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <DeviceList />
      <ThresholdSettings />
    </div>
  );
}
