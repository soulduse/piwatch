from __future__ import annotations

import subprocess
from typing import Any, Dict, Optional


def _run_cmd(cmd: list[str], timeout: int = 5) -> Optional[str]:
    """Run a command and return stdout or None on failure."""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        if result.returncode == 0:
            return result.stdout.strip()
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    return None


def _get_ssid() -> Optional[str]:
    """Get current WiFi SSID."""
    output = _run_cmd(["iwgetid", "-r"])
    if output:
        return output
    # Fallback: try nmcli
    output = _run_cmd(["nmcli", "-t", "-f", "active,ssid", "dev", "wifi"])
    if output:
        for line in output.splitlines():
            if line.startswith("yes:"):
                return line.split(":", 1)[1]
    return None


def _get_signal_strength() -> Optional[int]:
    """Get WiFi signal strength in dBm."""
    output = _run_cmd(["iwconfig", "wlan0"])
    if output:
        for line in output.splitlines():
            if "Signal level" in line:
                for part in line.split():
                    if part.startswith("level="):
                        try:
                            return int(part.split("=")[1])
                        except ValueError:
                            pass
    # Fallback: try /proc/net/wireless
    try:
        with open("/proc/net/wireless", "r") as f:
            lines = f.readlines()
            if len(lines) >= 3:
                fields = lines[2].split()
                if len(fields) >= 4:
                    return int(float(fields[3]))
    except (FileNotFoundError, ValueError, IndexError):
        pass
    return None


def _get_frequency() -> Optional[str]:
    """Get WiFi frequency."""
    output = _run_cmd(["iwconfig", "wlan0"])
    if output:
        for line in output.splitlines():
            if "Frequency" in line:
                for part in line.split():
                    if part.startswith("Frequency:"):
                        return part.split(":")[1]
    return None


def collect() -> Dict[str, Any]:
    """Collect current WiFi information."""
    return {
        "ssid": _get_ssid(),
        "signal_dbm": _get_signal_strength(),
        "frequency": _get_frequency(),
    }


def change_wifi(ssid: str, password: str) -> Dict[str, Any]:
    """Change WiFi network via wpa_supplicant."""
    wpa_conf = '/etc/wpa_supplicant/wpa_supplicant.conf'

    # Generate wpa_passphrase entry
    result_passphrase = _run_cmd(["wpa_passphrase", ssid, password], timeout=10)
    if not result_passphrase:
        return {"success": False, "error": "Failed to generate wpa_passphrase"}

    try:
        # Read existing config header
        header_lines = []
        try:
            with open(wpa_conf, "r") as f:
                for line in f:
                    if line.strip().startswith("network="):
                        break
                    header_lines.append(line)
        except FileNotFoundError:
            header_lines = [
                "ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev\n",
                "update_config=1\n",
                "country=US\n",
                "\n",
            ]

        # Write new config
        with open(wpa_conf, "w") as f:
            f.writelines(header_lines)
            f.write(result_passphrase)
            f.write("\n")

        # Reconfigure wpa_supplicant
        _run_cmd(["wpa_cli", "-i", "wlan0", "reconfigure"], timeout=10)

        return {"success": True, "ssid": ssid}
    except PermissionError:
        return {"success": False, "error": "Permission denied writing wpa_supplicant.conf"}
    except OSError as e:
        return {"success": False, "error": str(e)}
