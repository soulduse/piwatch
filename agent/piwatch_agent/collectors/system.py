from __future__ import annotations

import platform
import socket
import sys
import time
from typing import Any, Dict, Optional

import psutil

from piwatch_agent import __version__


def _read_pi_model() -> Optional[str]:
    """Read Raspberry Pi model from device tree."""
    try:
        with open("/proc/device-tree/model", "r") as f:
            return f.read().strip().rstrip("\x00")
    except (FileNotFoundError, PermissionError):
        return None


def collect() -> Dict[str, Any]:
    """Collect system information."""
    boot_time = psutil.boot_time()
    uptime = time.time() - boot_time

    return {
        "hostname": socket.gethostname(),
        "model": _read_pi_model(),
        "os_name": platform.system(),
        "os_version": platform.version(),
        "os_release": platform.release(),
        "kernel": platform.release(),
        "architecture": platform.machine(),
        "uptime_seconds": int(uptime),
        "python_version": platform.python_version(),
        "agent_version": __version__,
    }
