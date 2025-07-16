#!/bin/bash
set -euxo pipefail

# Redirect all output to both console and log file
exec > >(tee /var/log/setup-ec2.log | logger -t user-data -s 2>/dev/console) 2>&1

echo "$$(date): ===== EC2 Setup Script Starting ====="

# --- System Update and Package Installation ---
echo "$$(date): Updating system packages and installing prerequisites..."
yum update -y
yum install -y git postgresql jq awscli curl nc

# --- Docker Installation with Retry ---
echo "$$(date): Installing Docker with retry mechanism..."
docker_retries=5
docker_wait=10
attempt=1

until command -v docker &>/dev/null || [ "$attempt" -gt "$docker_retries" ]; do
  echo "$$(date): Docker install attempt $attempt of $docker_retries..."
  amazon-linux-extras enable docker || true
  yum clean metadata || true
  yum install -y docker || true
  ((attempt++))
  sleep "$docker_wait"
done

if ! command -v docker &>/dev/null; then
  echo "$$(date): ERROR: Docker installation failed after $docker_retries attempts."
  exit 1
fi

systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

# --- Wait for Networking ---
echo "$$(date): Waiting for networking to stabilize..."
sleep 10

# --- Fetch DB Credentials from SSM ---
echo "$$(date): Retrieving DB credentials from AWS SSM..."
db_user=$(aws ssm get-parameter --name "${db_username_ssm_path}" --with-decryption --query Parameter.Value --output text)
db_password=$(aws ssm get-parameter --name "${db_password_ssm_path}" --with-decryption --query Parameter.Value --output text)
db_host="${db_host}"

# --- Check PostgreSQL Connectivity ---
echo "$$(date): Checking connectivity to RDS at ${db_host}:5432..."
if nc -zvw3 "${db_host}" 5432; then
  echo "$$(date): Successfully connected to RDS."
else
  echo "$$(date): WARNING: Cannot connect to RDS at ${db_host}:5432"
fi

# --- Clone or Update Project Repository ---
cd /home/ec2-user
if [ ! -d "Shiptivitas" ]; then
  echo "$$(date): Cloning Shiptivitas repository..."
  git clone https://github.com/RareSonal/Shiptivitas.git
else
  echo "$$(date): Updating Shiptivitas repository..."
  cd Shiptivitas
  git pull
  cd ..
fi
cd Shiptivitas

# --- Cleanup Unnecessary Folders ---
echo "$$(date): Removing all folders except 'backend'..."
find . -mindepth 1 -maxdepth 1 ! -name backend -exec rm -rf {} +

# --- Create .env Configuration for Backend ---
echo "$$(date): Creating backend/.env file with database configuration..."
cat > backend/.env <<EOF
DB_HOST=${db_host}
DB_PORT=5432
DB_USER=${db_user}
DB_PASSWORD=${db_password}
DB_NAME=shiptivitas_db
PORT=3001
EOF

# --- Wait for Database Readiness ---
echo "$$(date): Waiting for PostgreSQL to become available..."
check_db_ready() {
  local retries=10
  local interval=10
  for i in $(seq 1 "$retries"); do
    echo "$$(date): Attempt $i to connect to DB..."
    if PGPASSWORD="${db_password}" psql -h "${db_host}" -U "${db_user}" -d postgres -c '\q' &>/dev/null; then
      echo "$$(date): PostgreSQL is accepting connections."
      return 0
    fi
    echo "$$(date): Database not ready yet. Retrying in $interval seconds..."
    sleep "$interval"
  done
  echo "$$(date): ERROR: PostgreSQL not reachable after $retries attempts."
  return 1
}
check_db_ready

# --- Seed Database If Required ---
if [ "${seed_db}" = "true" ]; then
  echo "$$(date): Seeding the database if it does not exist..."
  DB_EXISTS=$$(PGPASSWORD="${db_password}" psql -h "${db_host}" -U "${db_user}" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='shiptivitas_db'")
  if [ "$${DB_EXISTS}" != "1" ]; then
    echo "$$(date): Creating and seeding database 'shiptivitas_db'..."
    curl -O https://raw.githubusercontent.com/RareSonal/Shiptivitas/main/database/shiptivitas_postgres.sql
    PGPASSWORD="${db_password}" psql -h "${db_host}" -U "${db_user}" -d postgres -c "CREATE DATABASE shiptivitas_db;"
    PGPASSWORD="${db_password}" psql -h "${db_host}" -U "${db_user}" -d shiptivitas_db -f shiptivitas_postgres.sql
  else
    echo "$$(date): Database 'shiptivitas_db' already exists. Skipping creation."
  fi
else
  echo "$$(date): Skipping database seeding per configuration."
fi

# --- Start Backend in Docker ---
echo "$$(date): Starting backend service inside Docker container..."
docker run -d \
  --name shiptivitas-backend \
  --restart unless-stopped \
  -p 3001:3001 \
  -v /home/ec2-user/Shiptivitas/backend:/usr/src/app \
  -w /usr/src/app \
  --env-file /home/ec2-user/Shiptivitas/backend/.env \
  node:18 \
  sh -c "npm install && npm install -g babel-watch && babel-watch server.js"

echo "$$(date): ===== EC2 Setup Completed Successfully. Backend running on port 3001 ====="
