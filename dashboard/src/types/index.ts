export interface Device {
  id: string;
  name: string;
  host: string;
  port: number;
  token: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeviceStatus {
  device_id: string;
  status: "online" | "offline" | "unknown";
  last_seen: string | null;
  hostname: string | null;
  model: string | null;
  os_info: string | null;
  uptime_seconds: number | null;
  agent_version: string | null;
  ip_address: string | null;
}

export interface Metrics {
  id: number;
  device_id: string;
  timestamp: string;
  cpu_usage: number | null;
  cpu_temp: number | null;
  memory_usage: number | null;
  memory_total: number | null;
  disk_usage: number | null;
  disk_total: number | null;
  network_rx: number | null;
  network_tx: number | null;
  load_avg_1: number | null;
  load_avg_5: number | null;
  load_avg_15: number | null;
  raw_data: string | null;
}

export interface Alert {
  id: number;
  device_id: string;
  type: "high_temp" | "high_cpu" | "high_memory" | "low_disk";
  message: string;
  value: number | null;
  threshold: number | null;
  created_at: string;
  resolved_at: string | null;
}

export interface Settings {
  poll_interval: number;
  temp_threshold: number;
  cpu_threshold: number;
  memory_threshold: number;
  disk_threshold: number;
  retention_raw_days: number;
  retention_hourly_days: number;
  retention_daily_days: number;
}

export interface DeviceWithStatus extends Device {
  status: DeviceStatus | null;
  latest_metrics?: Partial<Metrics> | null;
}

export interface CronJob {
  user: string;
  schedule: string;
  command: string;
  enabled: boolean;
}

export interface CronUser {
  raw: string;
  jobs: CronJob[];
}

export interface CronResponse {
  users: Record<string, CronUser>;
  system: {
    jobs: CronJob[];
  };
}

export interface Process {
  pid: number;
  name: string;
  cpu_percent: number;
  memory_percent: number;
  status: string;
  username: string;
}

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: string;
  created: string;
}

export interface WifiInfo {
  ssid: string;
  signal_dbm: number | null;
  frequency: string | null;
}

export interface AgentHealthResponse {
  hostname: string;
  uptime_seconds: number;
  agent_version: string;
  ip_address: string;
  model: string | null;
  os_name: string | null;
  os_version: string | null;
  kernel: string | null;
  architecture: string | null;
  timestamp: string;
}

export interface AgentCpuMetrics {
  usage_percent: number;
  per_core_percent: number[];
  core_count: number;
  frequency: {
    current_mhz: number;
    min_mhz: number;
    max_mhz: number;
  } | null;
  load_avg: {
    "1min": number;
    "5min": number;
    "15min": number;
  };
}

export interface AgentMemoryMetrics {
  ram: {
    total_bytes: number;
    used_bytes: number;
    available_bytes: number;
    percent: number;
  };
  swap: {
    total_bytes: number;
    used_bytes: number;
    free_bytes: number;
    percent: number;
  };
}

export interface AgentDiskPartition {
  device: string;
  mountpoint: string;
  fstype: string;
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  percent: number;
}

export interface AgentNetworkMetrics {
  default_ip: string;
  interfaces: Record<string, {
    bytes_sent: number;
    bytes_recv: number;
    packets_sent: number;
    packets_recv: number;
    ip_address: string | null;
  }>;
}

export interface AgentTemperatureMetrics {
  cpu_celsius: number | null;
  gpu_celsius: number | null;
}

export interface AgentMetricsResponse {
  timestamp: string;
  cpu: AgentCpuMetrics | null;
  memory: AgentMemoryMetrics | null;
  disk: AgentDiskPartition[] | null;
  temperature: AgentTemperatureMetrics | null;
  network: AgentNetworkMetrics | null;
  processes: Process[] | null;
  docker: AgentDockerMetrics | null;
}

export interface AgentDockerMetrics {
  installed: boolean;
  containers: DockerContainer[];
}

export interface AgentSystemInfo {
  hostname: string;
  model: string;
  os_name: string;
  os_version: string;
  kernel: string;
  architecture: string;
  uptime_seconds: number;
  python_version: string;
  agent_version: string;
}

export interface DiscoveredAgent {
  host: string;
  port: number;
  hostname: string;
  model: string | null;
  agent_version: string;
  already_registered: boolean;
}

export type SSEEvent =
  | { type: "device_update"; data: DeviceWithStatus }
  | { type: "metrics_update"; data: { device_id: string; metrics: Metrics } }
  | { type: "alert"; data: Alert }
  | { type: "device_offline"; data: { device_id: string } };

export type TimeRange = "1h" | "6h" | "24h" | "7d";
