#!/bin/bash
set -euo pipefail

echo "Updating system..."
yum update -y

echo "Installing dependencies: git, postgresql, jq, awscli..."
yum install -y git postgresql jq awscli

echo "Installing Docker..."
if yum install -y docker; then
  echo "Docker installed successfully."
else
  echo "ERROR: Docker installation failed!" >&2
  exit 1
fi

echo "Enabling and starting Docker service..."
if systemctl enable docker && systemctl start docker; then
  echo "Docker service started successfully."
else
  echo "ERROR: Failed to start Docker service!" >&2
  journalctl -u docker.service --no-pager | tail -40
  exit 1
fi

echo "Adding ec2-user to docker group..."
usermod -aG docker ec2-user || {
  echo "WARNING: Failed to add ec2-user to docker group" >&2
}

echo "Verifying Docker installation..."
if command -v docker >/dev/null 2>&1; then
  docker --version
else
  echo "ERROR: Docker command not found after installation!" >&2
  exit 1
fi

echo "Fetching DB credentials from SSM Parameter Store..."
db_user=$(aws ssm get-parameter --name "${db_username_ssm_path}" --with-decryption --query Parameter.Value --output text)
db_password=$(aws ssm get-parameter --name "${db_password_ssm_path}" --with-decryption --query Parameter.Value --output text)
db_host="${db_host}"

cd /home/ec2-user
if [ ! -d Shiptivitas ]; then
  echo "Cloning Shiptivitas repo..."
  git clone https://github.com/RareSonal/Shiptivitas.git
fi

cd Shiptivitas

echo "Cleaning unnecessary folders..."
find . -mindepth 1 -maxdepth 1 ! -name backend -exec rm -rf {} +

echo "Writing backend/.env file..."
cat <<EOF > backend/.env
DB_HOST=${db_host}
DB_PORT=5432
DB_USER=${db_user}
DB_PASSWORD=${db_password}
DB_NAME=shiptivitas_db
PORT=3001
EOF

check_db_ready() {
  local retries=10
  local wait=10
  for i in $(seq 1 $retries); do
    echo "Checking DB readiness (attempt $i/$retries)..."
    if PGPASSWORD="${db_password}" psql -h "${db_host}" -U "${db_user}" -d postgres -c '\q'; then
      return 0
    fi
    echo "DB not ready, waiting $wait seconds..."
    sleep $wait
  done
  echo "ERROR: DB not ready after $((retries * wait)) seconds."
  return 1
}

if ! check_db_ready; then
  echo "Exiting: DB not reachable."
  exit 1
fi

DB_EXISTS=$(PGPASSWORD=${db_password} psql -h ${db_host} -U ${db_user} -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='shiptivitas_db'")
if [ "$DB_EXISTS" != "1" ]; then
  echo "Seeding database..."
  curl -O https://raw.githubusercontent.com/RareSonal/Shiptivitas/main/database/shiptivitas_postgres.sql
  PGPASSWORD=${db_password} psql -h ${db_host} -U ${db_user} -d postgres -c "CREATE DATABASE shiptivitas_db;"
  PGPASSWORD=${db_password} psql -h ${db_host} -U ${db_user} -d shiptivitas_db -f shiptivitas_postgres.sql
else
  echo "Database already exists, skipping seeding."
fi

echo "Starting backend container..."
docker run -d \
  --name shiptivitas-backend \
  --restart always \
  -p 3001:3001 \
  -v /home/ec2-user/Shiptivitas/backend:/usr/src/app \
  -w /usr/src/app \
  --env-file /home/ec2-user/Shiptivitas/backend/.env \
  node:18 \
  sh -c "npm install && npm install -g babel-watch && babel-watch server.js"

echo "Setup complete."
