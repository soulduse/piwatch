from __future__ import annotations

import os
import re
import subprocess
from typing import Any, Dict, List, Optional

# Cron time field pattern: number, *, ranges, steps, lists
_TIME_FIELD = r"[\d*,/\-]+"
_CRON_SCHEDULE_RE = re.compile(
    r"^(" + _TIME_FIELD + r")\s+"
    r"(" + _TIME_FIELD + r")\s+"
    r"(" + _TIME_FIELD + r")\s+"
    r"(" + _TIME_FIELD + r")\s+"
    r"(" + _TIME_FIELD + r")\s+"
    r"(.+)$"
)
_CRON_SPECIAL_RE = re.compile(r"^@(reboot|hourly|daily|weekly|monthly|yearly|annually)\s+(.+)$")

# Shells that indicate a real user
_VALID_SHELLS = ("/bin/bash", "/bin/zsh", "/bin/sh", "/usr/bin/bash", "/usr/bin/zsh")


def _get_users_with_shells() -> List[str]:
    """Read /etc/passwd and return usernames with valid login shells."""
    users = []
    try:
        with open("/etc/passwd", "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                parts = line.split(":")
                if len(parts) >= 7:
                    username = parts[0]
                    shell = parts[6]
                    if shell in _VALID_SHELLS:
                        users.append(username)
    except (FileNotFoundError, PermissionError):
        # Fallback: try common users
        users = ["root", "pi"]
    return users


def _parse_crontab_line(line: str) -> Optional[Dict[str, Any]]:
    """Parse a single crontab line into a structured dict.

    Returns a job dict for active entries and commented-out cron entries
    (disabled jobs). Returns None for blank lines and pure comment lines
    (explanatory text that doesn't contain a cron schedule).
    """
    stripped = line.strip()
    if not stripped:
        return None

    # Check if line is a comment
    if stripped.startswith("#"):
        # Strip leading # and whitespace to see if it's a disabled cron entry
        inner = stripped.lstrip("#").strip()
        if not inner:
            return None
        return _try_parse_schedule(inner, enabled=False)

    return _try_parse_schedule(stripped, enabled=True)


def _try_parse_schedule(text: str, enabled: bool) -> Optional[Dict[str, Any]]:
    """Try to parse text as a cron schedule + command.

    Returns a job dict if the text matches a cron pattern, None otherwise.
    """
    # Handle @reboot, @hourly, etc.
    m = _CRON_SPECIAL_RE.match(text)
    if m:
        return {
            "schedule": "@" + m.group(1),
            "command": m.group(2),
            "enabled": enabled,
        }

    # Handle standard 5-field schedule
    m = _CRON_SCHEDULE_RE.match(text)
    if m:
        schedule = " ".join(m.group(1, 2, 3, 4, 5))
        command = m.group(6)
        return {
            "schedule": schedule,
            "command": command,
            "enabled": enabled,
        }

    return None


def _get_user_crontab(user: str) -> Dict[str, Any]:
    """Get crontab data for a specific user.

    Returns a dict with 'raw' (full crontab text) and 'jobs' (parsed entries).
    """
    jobs = []  # type: List[Dict[str, Any]]
    raw = ""
    try:
        result = subprocess.run(
            ["crontab", "-l", "-u", user],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            raw = result.stdout
            for line in raw.splitlines():
                entry = _parse_crontab_line(line)
                if entry is not None:
                    jobs.append(entry)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    return {"raw": raw, "jobs": jobs}


def _get_system_crontabs() -> List[Dict[str, Any]]:
    """Parse /etc/crontab and /etc/cron.d/* entries."""
    jobs = []  # type: List[Dict[str, Any]]
    files = ["/etc/crontab"]

    cron_d = "/etc/cron.d"
    if os.path.isdir(cron_d):
        for name in os.listdir(cron_d):
            filepath = os.path.join(cron_d, name)
            if os.path.isfile(filepath) and not name.startswith("."):
                files.append(filepath)

    for filepath in files:
        try:
            with open(filepath, "r") as f:
                for line in f:
                    stripped = line.strip()
                    if not stripped or stripped.startswith("#"):
                        continue
                    # System crontab has user as 6th field
                    parts = stripped.split(None, 6)
                    if len(parts) >= 7:
                        schedule = " ".join(parts[:5])
                        user = parts[5]
                        command = parts[6]
                        jobs.append({
                            "user": user,
                            "schedule": schedule,
                            "command": command,
                            "enabled": True,
                        })
        except (FileNotFoundError, PermissionError):
            continue

    return jobs


def collect() -> Dict[str, Any]:
    """Collect all cron jobs from the system.

    Returns a dict with 'users' (per-user crontabs) and 'system' (system-wide
    crontab entries from /etc/crontab and /etc/cron.d/).
    """
    users_data = {}  # type: Dict[str, Any]

    # Iterate all users with valid login shells
    for user in _get_users_with_shells():
        user_data = _get_user_crontab(user)
        # Only include users that have a crontab (non-empty raw or jobs)
        if user_data["raw"] or user_data["jobs"]:
            users_data[user] = user_data

    # System crontabs
    system_jobs = _get_system_crontabs()

    return {
        "users": users_data,
        "system": {
            "jobs": system_jobs,
        },
    }


def update_crontab(user: str, content: str) -> Dict[str, Any]:
    """Update a user's crontab with the given content.

    Pipes the content to ``crontab -u <user> -`` to replace the user's
    crontab entirely.

    Returns a dict with 'success' and optionally 'error'.
    """
    try:
        result = subprocess.run(
            ["crontab", "-u", user, "-"],
            input=content,
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            return {"success": True}
        error_msg = result.stderr.strip() if result.stderr else "crontab exited with code %d" % result.returncode
        return {"success": False, "error": error_msg}
    except FileNotFoundError:
        return {"success": False, "error": "crontab command not found"}
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "crontab command timed out"}
    except OSError as e:
        return {"success": False, "error": str(e)}
