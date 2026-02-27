# PiWatch

Modern monitoring dashboard for Raspberry Pi fleets. Track CPU, memory, temperature, disk usage, cron jobs, processes, and more — all from a single dashboard.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- **Fleet Overview** — online/offline status, average metrics, alerts at a glance
- **Real-time Monitoring** — CPU, RAM, temperature, disk, network via SSE
- **Cron Jobs** — view, toggle, and edit crontabs across all users
- **Process Monitor** — top processes by CPU/memory usage
- **Docker Containers** — container status (if Docker is installed)
- **WiFi Management** — view and change WiFi settings remotely
- **Remote Reboot** — safely reboot devices from the dashboard
- **Network Discovery** — auto-detect Pi agents on your network
- **Alerts** — configurable thresholds for temperature, CPU, memory, disk
- **Data Retention** — raw 7 days → hourly 30 days → daily 1 year
- **Dark Mode** — automatic theme support

## Architecture

```
Raspberry Pi (Agent)                 Mac/Server (Dashboard)
+---------------------+             +----------------------+
| Python HTTP Server  | <-- poll -- | Next.js + SQLite     |
| Port 9100           |   (15s)     | Background Poller    |
| /health /metrics    |             | SSE Stream           |
| /cron /wifi /reboot |             | REST API             |
+---------------------+             +---+------------------+
                                        |
                                   Browser (localhost:3100)
```

Pull-based model (Prometheus-style): the dashboard polls each Pi agent periodically.

## Quick Start

### 1. Install Agent on Raspberry Pi

SSH into your Pi and run:

```bash
curl -sSL https://raw.githubusercontent.com/soulduse/piwatch/main/agent/install.sh | sudo bash
```

This will:
- Install the agent and its dependency (psutil)
- Set up a systemd service
- Generate an auth token for secure operations
- Print connection info (IP, port, token)

Or install manually:

```bash
cd /opt/piwatch
pip3 install psutil
python3 -m piwatch_agent
```

### 2. Run Dashboard

**With Docker (recommended):**

```bash
cd dashboard
docker compose up -d
```

**Without Docker:**

```bash
cd dashboard
npm install
npm run build
npm start
```

Open http://localhost:3100

### 3. Add Your Devices

1. Go to **Settings** in the sidebar
2. Click **Scan Network** to auto-discover Pi agents, or click **Add Device** manually
3. Enter name, IP address, port (default 9100), and auth token
4. Devices appear on the **Dashboard** immediately

## Agent API

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Hostname, uptime, version, IP |
| `/metrics` | GET | No | CPU, RAM, disk, temp, network, processes, Docker |
| `/cron` | GET | No | Cron jobs from all users and system |
| `/cron` | POST | Yes | Update a user's crontab |
| `/wifi` | GET | No | Current WiFi info (SSID, signal) |
| `/wifi` | POST | Yes | Change WiFi settings (SSID, password) |
| `/reboot` | POST | Yes | Reboot the device |
| `/discover` | GET | No | Discovery info for network scanning |

Auth endpoints require `X-Auth-Token` header matching the `PIWATCH_TOKEN` environment variable.

## Configuration

### Agent (Environment Variables)

| Variable | Default | Description |
|----------|---------|-------------|
| `PIWATCH_PORT` | `9100` | HTTP server port |
| `PIWATCH_HOST` | `0.0.0.0` | Bind address |
| `PIWATCH_TOKEN` | (generated) | Auth token for reboot/wifi |

### Dashboard Settings (via UI)

| Setting | Default | Description |
|---------|---------|-------------|
| Poll Interval | 15s | How often to fetch metrics |
| Temp Threshold | 70°C | Alert when CPU temp exceeds |
| CPU Threshold | 90% | Alert when CPU usage exceeds |
| Memory Threshold | 90% | Alert when RAM usage exceeds |
| Disk Threshold | 90% | Alert when disk usage exceeds |

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Agent | Python 3.7+ / psutil |
| Dashboard | Next.js 16 / TypeScript |
| UI | Tailwind CSS / shadcn/ui / Lucide |
| Charts | Recharts |
| State | Zustand |
| Database | SQLite (better-sqlite3) |
| Real-time | SSE (Server-Sent Events) |

## Development

```bash
# Agent
cd agent
pip3 install psutil
python3 -m piwatch_agent

# Dashboard (dev server on port 3100)
cd dashboard
npm install
npm run dev
```

## Run as macOS Service (launchd)

To keep the dashboard running persistently across reboots:

```bash
# Build production bundle
cd dashboard
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

# Copy the plist (edit paths if needed)
cp docs/com.piwatch.dashboard.plist ~/Library/LaunchAgents/

# Start the service
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.piwatch.dashboard.plist

# Useful commands
launchctl kickstart -k gui/$(id -u)/com.piwatch.dashboard  # restart
launchctl bootout gui/$(id -u)/com.piwatch.dashboard       # stop
tail -f dashboard/logs/stdout.log                           # view logs
```

## License

MIT
