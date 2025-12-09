#!/bin/bash
# SQL Proxy startup script for Cloud SQL connections

set -euo pipefail

# Update system packages
apt-get update
apt-get install -y wget curl

# Download and install Cloud SQL Proxy
PROXY_VERSION="2.8.0"
wget "https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v$PROXY_VERSION/cloud-sql-proxy.linux.amd64" -O cloud-sql-proxy
chmod +x cloud-sql-proxy
mv cloud-sql-proxy /usr/local/bin/

# Create sql-proxy user
useradd -r -s /bin/false sql-proxy

# Create directory for proxy socket
mkdir -p /var/run/sql-proxy
chown sql-proxy:sql-proxy /var/run/sql-proxy

# Create systemd service file
cat > /etc/systemd/system/sql-proxy.service << EOF
[Unit]
Description=Google Cloud SQL Proxy
After=network.target

[Service]
Type=simple
User=sql-proxy
Group=sql-proxy
ExecStart=/usr/local/bin/cloud-sql-proxy \\
    --address 0.0.0.0 \\
    --port 5432 \\
    --private-ip \\
    ${connection_name}
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
systemctl daemon-reload
systemctl enable sql-proxy
systemctl start sql-proxy

# Configure firewall to allow internal access
ufw allow from 10.0.0.0/16 to any port 5432

# Install monitoring agent
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
bash add-google-cloud-ops-agent-repo.sh --also-install

# Configure logging for SQL Proxy
cat > /etc/google-cloud-ops-agent/config.yaml << EOF
logging:
  receivers:
    sql_proxy_logs:
      type: systemd_journald
      include_units:
        - sql-proxy.service
  processors:
    sql_proxy_processor:
      type: parse_json
  service:
    pipelines:
      default_pipeline:
        receivers: [sql_proxy_logs]
        processors: [sql_proxy_processor]
EOF

systemctl restart google-cloud-ops-agent

echo "SQL Proxy installation and configuration complete"