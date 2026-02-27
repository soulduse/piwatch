#!/usr/bin/env bash
set -euo pipefail

# PiWatch Agent Installer
# Usage: curl -sSL https://raw.githubusercontent.com/<repo>/install.sh | bash

INSTALL_DIR="/opt/piwatch-agent"
CONFIG_DIR="/etc/piwatch"
SERVICE_NAME="piwatch-agent"

echo "========================================="
echo "  PiWatch Agent Installer"
echo "========================================="
echo ""

# Check root
if [ "$(id -u)" -ne 0 ]; then
    echo "Error: This script must be run as root (use sudo)"
    exit 1
fi

# Check Python 3
if ! command -v python3 &>/dev/null; then
    echo "Error: Python 3 is required but not installed"
    exit 1
fi

PYTHON_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "[1/5] Python $PYTHON_VERSION detected"

# Install psutil
echo "[2/5] Installing dependencies..."
python3 -m pip install --quiet --break-system-packages psutil 2>/dev/null \
    || python3 -m pip install --quiet psutil

# Copy agent files
echo "[3/5] Installing agent to $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"
if [ -d "piwatch_agent" ]; then
    cp -r piwatch_agent "$INSTALL_DIR/"
else
    # When running via curl pipe, download from repo
    echo "Error: piwatch_agent directory not found."
    echo "Please run this script from the agent directory."
    exit 1
fi

# Generate config
echo "[4/5] Configuring..."
mkdir -p "$CONFIG_DIR"

if [ -f "$CONFIG_DIR/agent.env" ]; then
    echo "  Existing config found, preserving..."
    # Source existing to show token later
    source "$CONFIG_DIR/agent.env"
else
    TOKEN=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    PORT="${PIWATCH_PORT:-9100}"
    cat > "$CONFIG_DIR/agent.env" <<EOF
PIWATCH_PORT=$PORT
PIWATCH_TOKEN=$TOKEN
PYTHONPATH=$INSTALL_DIR
EOF
    PIWATCH_TOKEN="$TOKEN"
    PIWATCH_PORT="$PORT"
fi

# Setup systemd service
echo "[5/5] Setting up systemd service..."
cp piwatch-agent.service /etc/systemd/system/ 2>/dev/null || {
    # Fallback: generate the service file inline
    cat > /etc/systemd/system/piwatch-agent.service <<EOF
[Unit]
Description=PiWatch Monitoring Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
EnvironmentFile=/etc/piwatch/agent.env
ExecStart=/usr/bin/python3 -m piwatch_agent
WorkingDirectory=$INSTALL_DIR
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
MemoryMax=50M

[Install]
WantedBy=multi-user.target
EOF
}

# Ensure WorkingDirectory is set
sed -i "s|ExecStart=.*|ExecStart=/usr/bin/python3 -m piwatch_agent\nWorkingDirectory=$INSTALL_DIR|" \
    /etc/systemd/system/piwatch-agent.service 2>/dev/null || true

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

# Wait for service to start
sleep 2

# Get IP
IP=$(python3 -c "
import socket
try:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect(('8.8.8.8', 80))
    print(s.getsockname()[0])
    s.close()
except:
    print('127.0.0.1')
")

echo ""
echo "========================================="
echo "  PiWatch Agent installed successfully!"
echo "========================================="
echo ""
echo "  Address:  http://$IP:${PIWATCH_PORT:-9100}"
echo "  Token:    ${PIWATCH_TOKEN}"
echo ""
echo "  Test:     curl http://$IP:${PIWATCH_PORT:-9100}/health"
echo ""
echo "  Service:  systemctl status $SERVICE_NAME"
echo "  Logs:     journalctl -u $SERVICE_NAME -f"
echo ""
echo "========================================="
