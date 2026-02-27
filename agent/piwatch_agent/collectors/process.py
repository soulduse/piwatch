from __future__ import annotations

from typing import Any, Dict, List

import psutil


def collect(limit: int = 15) -> List[Dict[str, Any]]:
    """Collect top processes by CPU usage."""
    procs: List[Dict[str, Any]] = []

    for proc in psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent", "status", "username"]):
        try:
            info = proc.info
            procs.append({
                "pid": info["pid"],
                "name": info["name"],
                "cpu_percent": round(info["cpu_percent"] or 0.0, 1),
                "memory_percent": round(info["memory_percent"] or 0.0, 1),
                "status": info["status"],
                "username": info["username"],
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    procs.sort(key=lambda p: p["cpu_percent"], reverse=True)
    return procs[:limit]
