from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

import psutil


def collect() -> Dict[str, Any]:
    """Collect CPU usage, frequency, and load average."""
    per_core = psutil.cpu_percent(interval=1, percpu=True)
    total = psutil.cpu_percent(interval=0)

    freq: Optional[Dict[str, float]] = None
    cpu_freq = psutil.cpu_freq()
    if cpu_freq is not None:
        freq = {
            "current_mhz": round(cpu_freq.current, 1),
            "min_mhz": round(cpu_freq.min, 1),
            "max_mhz": round(cpu_freq.max, 1),
        }

    load1, load5, load15 = os.getloadavg()

    return {
        "usage_percent": round(total, 1),
        "per_core_percent": [round(c, 1) for c in per_core],
        "core_count": psutil.cpu_count(logical=True),
        "frequency": freq,
        "load_avg": {
            "1min": round(load1, 2),
            "5min": round(load5, 2),
            "15min": round(load15, 2),
        },
    }
