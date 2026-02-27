from __future__ import annotations

import json
import subprocess
from typing import Any, Dict, List, Optional


def collect() -> Optional[Dict[str, Any]]:
    """Collect Docker container information. Returns None if Docker is not available."""
    containers: List[Dict[str, Any]] = []
    try:
        result = subprocess.run(
            [
                "docker", "ps", "-a",
                "--format", '{"id":"{{.ID}}","name":"{{.Names}}","image":"{{.Image}}","status":"{{.Status}}","ports":"{{.Ports}}","state":"{{.State}}"}',
            ],
            capture_output=True,
            text=True,
            timeout=15,
        )
        if result.returncode != 0:
            return None
        for line in result.stdout.strip().splitlines():
            if line:
                containers.append(json.loads(line))
    except (FileNotFoundError, subprocess.TimeoutExpired, json.JSONDecodeError):
        return None

    return {
        "available": True,
        "containers": containers,
        "container_count": len(containers),
    }
