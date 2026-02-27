from __future__ import annotations

import json
import logging
import os
import socket
import subprocess
import time
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Any, Dict, Optional

import psutil

from piwatch_agent import __version__
from piwatch_agent import config
from piwatch_agent.collectors import cpu, memory, disk, temperature, network, system, cron, process, docker, wifi

logger = logging.getLogger("piwatch")


def _json_response(data: Any) -> bytes:
    """Serialize data to JSON bytes."""
    return json.dumps(data, separators=(",", ":")).encode("utf-8")


def _now_iso() -> str:
    """Return current UTC timestamp in ISO 8601 format."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _get_default_ip() -> str:
    """Get the default outgoing IP address."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"


def _safe_collect(collector_fn: Any, *args: Any) -> Any:
    """Call a collector function, returning None on any exception."""
    try:
        return collector_fn(*args)
    except Exception as e:
        logger.warning("Collector %s failed: %s", collector_fn.__module__, e)
        return None


class PiWatchHandler(BaseHTTPRequestHandler):
    """HTTP request handler for PiWatch agent."""

    def log_message(self, format: str, *args: Any) -> None:
        logger.info(format, *args)

    def _send_json(self, data: Any, status: int = 200) -> None:
        body = _json_response(data)
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Auth-Token")
        self.end_headers()
        self.wfile.write(body)

    def _check_auth(self) -> bool:
        """Check X-Auth-Token header against configured token."""
        if not config.TOKEN:
            return True
        token = self.headers.get("X-Auth-Token", "")
        return token == config.TOKEN

    def _read_body(self) -> Optional[Dict[str, Any]]:
        """Read and parse JSON request body."""
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        try:
            raw = self.rfile.read(length)
            return json.loads(raw)
        except (json.JSONDecodeError, ValueError):
            return None

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Auth-Token")
        self.end_headers()

    def do_GET(self) -> None:
        path = self.path.split("?")[0].rstrip("/") or "/"

        if path == "/health":
            self._handle_health()
        elif path == "/metrics":
            self._handle_metrics()
        elif path == "/cron":
            self._handle_cron()
        elif path == "/wifi":
            self._handle_wifi_get()
        elif path == "/discover":
            self._handle_discover()
        else:
            self._send_json({"error": "Not Found"}, 404)

    def do_POST(self) -> None:
        path = self.path.split("?")[0].rstrip("/") or "/"

        if path == "/reboot":
            self._handle_reboot()
        elif path == "/cron":
            self._handle_cron_post()
        elif path == "/wifi":
            self._handle_wifi_post()
        else:
            self._send_json({"error": "Not Found"}, 404)

    def _handle_health(self) -> None:
        boot_time = psutil.boot_time()
        uptime = int(time.time() - boot_time)
        sys_info = _safe_collect(system.collect) or {}
        self._send_json({
            "hostname": socket.gethostname(),
            "uptime_seconds": uptime,
            "agent_version": __version__,
            "ip_address": _get_default_ip(),
            "model": sys_info.get("model"),
            "os_name": sys_info.get("os_name"),
            "os_version": sys_info.get("os_version"),
            "kernel": sys_info.get("kernel"),
            "architecture": sys_info.get("architecture"),
            "timestamp": _now_iso(),
        })

    def _handle_metrics(self) -> None:
        self._send_json({
            "timestamp": _now_iso(),
            "cpu": _safe_collect(cpu.collect),
            "memory": _safe_collect(memory.collect),
            "disk": _safe_collect(disk.collect),
            "temperature": _safe_collect(temperature.collect),
            "network": _safe_collect(network.collect),
            "processes": _safe_collect(process.collect),
            "docker": _safe_collect(docker.collect),
        })

    def _handle_cron(self) -> None:
        data = _safe_collect(cron.collect)
        self._send_json(data if data is not None else {"users": {}, "system": {"jobs": []}})

    def _handle_cron_post(self) -> None:
        if not self._check_auth():
            self._send_json({"error": "Unauthorized"}, 401)
            return

        body = self._read_body()
        if body is None:
            self._send_json({"error": "Invalid JSON body"}, 400)
            return

        user = body.get("user")
        content = body.get("content")
        if not user or content is None:
            self._send_json({"error": "user and content are required"}, 400)
            return

        result = cron.update_crontab(user, content)
        status = 200 if result.get("success") else 500
        self._send_json(result, status)

    def _handle_wifi_get(self) -> None:
        info = _safe_collect(wifi.collect)
        self._send_json(info if info is not None else {"error": "Failed to collect WiFi info"})

    def _handle_wifi_post(self) -> None:
        if not self._check_auth():
            self._send_json({"error": "Unauthorized"}, 401)
            return

        body = self._read_body()
        if body is None:
            self._send_json({"error": "Invalid JSON body"}, 400)
            return

        ssid = body.get("ssid")
        password = body.get("password")
        if not ssid or not password:
            self._send_json({"error": "ssid and password are required"}, 400)
            return

        result = wifi.change_wifi(ssid, password)
        status = 200 if result.get("success") else 500
        self._send_json(result, status)

    def _handle_reboot(self) -> None:
        if not self._check_auth():
            self._send_json({"error": "Unauthorized"}, 401)
            return

        self._send_json({"message": "Rebooting..."})
        try:
            subprocess.Popen(["sudo", "reboot"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except FileNotFoundError:
            pass

    def _handle_discover(self) -> None:
        sys_info = _safe_collect(system.collect) or {}
        self._send_json({
            "service": "piwatch-agent",
            "version": __version__,
            "hostname": socket.gethostname(),
            "ip_address": _get_default_ip(),
            "port": config.PORT,
            "model": sys_info.get("model"),
            "os": sys_info.get("os_name"),
            "architecture": sys_info.get("architecture"),
            "timestamp": _now_iso(),
        })


def run() -> None:
    """Start the PiWatch HTTP server."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    server = HTTPServer((config.HOST, config.PORT), PiWatchHandler)
    logger.info("PiWatch agent v%s starting on %s:%d", __version__, config.HOST, config.PORT)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        server.shutdown()
