from __future__ import annotations

from typing import Any, Dict

import psutil


def collect() -> Dict[str, Any]:
    """Collect RAM and swap usage."""
    vm = psutil.virtual_memory()
    sw = psutil.swap_memory()

    return {
        "ram": {
            "total_bytes": vm.total,
            "used_bytes": vm.used,
            "available_bytes": vm.available,
            "percent": vm.percent,
        },
        "swap": {
            "total_bytes": sw.total,
            "used_bytes": sw.used,
            "free_bytes": sw.free,
            "percent": sw.percent,
        },
    }
