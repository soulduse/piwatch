from __future__ import annotations

import os


PORT = int(os.environ.get("PIWATCH_PORT", "9100"))
HOST = os.environ.get("PIWATCH_HOST", "0.0.0.0")
TOKEN = os.environ.get("PIWATCH_TOKEN", "")
