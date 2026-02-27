from __future__ import annotations

import socket
from typing import Any, Dict

import psutil


def _get_default_ip() -> str:
    """Get the default outgoing IP address."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"


def collect() -> Dict[str, Any]:
    """Collect network interface I/O statistics."""
    counters = psutil.net_io_counters(pernic=True)
    addrs = psutil.net_if_addrs()

    interfaces = {}
    for iface, stats in counters.items():
        ip = None
        if iface in addrs:
            for addr in addrs[iface]:
                if addr.family == socket.AF_INET:
                    ip = addr.address
                    break

        interfaces[iface] = {
            "bytes_sent": stats.bytes_sent,
            "bytes_recv": stats.bytes_recv,
            "packets_sent": stats.packets_sent,
            "packets_recv": stats.packets_recv,
            "ip_address": ip,
        }

    return {
        "default_ip": _get_default_ip(),
        "interfaces": interfaces,
    }
