from __future__ import annotations

import subprocess
from typing import Any, Dict, Optional

import psutil


def _read_vcgencmd() -> Optional[float]:
    """Try to read GPU temperature via vcgencmd."""
    try:
        result = subprocess.run(
            ["vcgencmd", "measure_temp"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            # Output: temp=42.0'C
            text = result.stdout.strip()
            return float(text.split("=")[1].split("'")[0])
    except (FileNotFoundError, IndexError, ValueError, subprocess.TimeoutExpired):
        pass
    return None


def _read_thermal_zone() -> Optional[float]:
    """Try to read CPU temperature from thermal zone."""
    try:
        with open("/sys/class/thermal/thermal_zone0/temp", "r") as f:
            return round(int(f.read().strip()) / 1000.0, 1)
    except (FileNotFoundError, ValueError, PermissionError):
        pass
    return None


def _read_psutil() -> Optional[float]:
    """Try to read CPU temperature from psutil sensors."""
    try:
        temps = psutil.sensors_temperatures()
        if not temps:
            return None
        for name in ("cpu_thermal", "cpu-thermal", "coretemp", "soc_thermal"):
            if name in temps and temps[name]:
                return round(temps[name][0].current, 1)
        # Fallback: first available sensor
        first_key = next(iter(temps))
        if temps[first_key]:
            return round(temps[first_key][0].current, 1)
    except (AttributeError, StopIteration):
        pass
    return None


def collect() -> Dict[str, Any]:
    """Collect CPU and GPU temperatures."""
    cpu_temp = _read_thermal_zone() or _read_psutil()
    gpu_temp = _read_vcgencmd()

    return {
        "cpu_celsius": cpu_temp,
        "gpu_celsius": gpu_temp,
    }
