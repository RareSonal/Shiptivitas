#!/bin/bash
set -euxo pipefail

# Redirect output to log file and console
exec > >(tee /var/log/setup-ec2.log | logger -t user-data -s 2>/dev/console) 2>&1

echo "$(date): ===== Starting EC2 Setup ====="

# --- Update system and install dependencies ---
echo "$(date): Updating system and installing packages..."
yum update -y
yum install -y git postgresql jq awscli curl

# --- Install Docker with retry logic ---
echo "$(date): Checking and installing Docker..."
retry=0
until command -v docker &>/dev/null || [ $retry -ge 5 ]; do
  echo "$(date): Attempt $((retry+1)) to install Docker..."
  amazon-linux-extras enable docker || true
  yum clean metadata || true
  yum install -y docker || true
  ((retry++))
  sleep 10
done

if ! command -v docker &>/dev/null; then
  echo "$(date): ERROR: Docker installation failed after retries."
  exit 1
fi

systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

# --- Wait for network to stabilize ---
echo "$(date): Waiting for network connectivity..."
sleep 10

# --- Fetch DB credentials securely from SSM Parameter Store ---
echo "$(date): Fetching DB credentials from AWS SSM Parameter Store..."
db_user=$(aws ssm get-parameter --name "${db_username_ssm_path}" --with-decryption --query Parameter.Value --output text)
db_password=$(aws ssm get-parameter --name "${db_password_ssm_path}" --with-decryption --query Parameter.Value --output text)
db_host="${db_host}"

# --- Test connectivity to RDS PostgreSQL endpoint ---
echo "$(date): Testing connectivity to RDS endpoint (${db_host}:5432)..."
if nc -zvw3 "${db_host}" 5432; then
  echo "$(date): Successfully connected to RDS endpoint."
else
  echo "$(date): WARNING: Unable to connect to RDS endpoint on port 5432."
fi

# --- Clone or update project repo ---
cd /home/ec2-user
if [ ! -d Shiptivitas ]; then
  echo "$(date): Cloning Shiptivitas repository from GitHub..."
  git clone https://github.com/RareSonal/Shiptivitas.git
else
  echo "$(date): Updating existing Shiptivitas repository..."
  cd Shiptivitas
  git pull
  cd ..
fi
cd Shiptivitas

# --- Cleanup: keep only backend folder ---
echo "$(date): Removing all folders except 'backend'..."
find . -mindepth 1 -maxdepth 1 ! -name backend -exec rm -rf {} +

# --- Create .env file for backend with DB credentials ---
echo "$(date): Creating backend/.env with database credentials..."
cat > backend/.env <<EOF
DB_HOST=${db_host}
DB_PORT=5432
DB_USER=${db_user}
DB_PASSWORD=${db_password}
DB_NAME=shiptivitas_db
PORT=3001
EOF

# --- Wait and check DB readiness ---
echo "$(date): Checking if database is ready to accept connections..."
check_db_ready() {
  local retries=10
  local wait=10
  for i in $(seq 1 $retries); do
    echo "$(date): DB connection attempt $i/$retries..."
    if PGPASSWORD="${db_password}" psql -h "${db_host}" -U "${db_user}" -d postgres -c '\q' &>/dev/null; then
      echo "$(date): Database is reachable."
      return 0
    fi
    echo "$(date): Database not ready yet, retrying in ${wait}s..."
    sleep $wait
  done
  echo "$(date): ERROR: Database unreachable after ${retries} attempts."
  return 1
}
check_db_ready

# --- Conditionally seed DB if flag is true ---
if [ "${seed_db}" = "true" ]; then
  echo "$(date): Checking if database 'shiptivitas_db' exists..."
  DB_EXISTS=$(PGPASSWORD="${db_password}" psql -h "${db_host}" -U "${db_user}" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='shiptivitas_db'")
  if [ "${DB_EXISTS}" != "1" ]; then
    echo "$(date): Creating and seeding database 'shiptivitas_db'..."
    curl -O https://raw.githubusercontent.com/RareSonal/Shiptivitas/main/database/shiptivitas_postgres.sql
    PGPASSWORD="${db_password}" psql -h "${db_host}" -U "${db_user}" -d postgres -c "CREATE DATABASE shiptivitas_db;"
    PGPASSWORD="${db_password}" psql -h "${db_host}" -U "${db_user}" -d shiptivitas_db -f shiptivitas_postgres.sql
  else
    echo "$(date): Database 'shiptivitas_db' already exists. Skipping seeding."
  fi
else
  echo "$(date): Database seeding skipped as per configuration."
fi

# --- Start backend Node.js app inside Docker container ---
echo "$(date): Starting backend service in Docker container..."
docker run -d \
  --name shiptivitas-backend \
  --restart unless-stopped \
  -p 3001:3001 \
  -v /home/ec2-user/Shiptivitas/backend:/usr/src/app \
  -w /usr/src/app \
  --env-file /home/ec2-user/Shiptivitas/backend/.env \
  node:18 \
  sh -c "npm install && npm install -g babel-watch && babel-watch server.js"

echo "$(date): ===== EC2 setup complete. Backend running on port 3001 ====="
