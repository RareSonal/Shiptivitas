#!/bin/bash
set -euxo pipefail

# Log output to file and console
exec > >(tee /var/log/setup-ec2.log | logger -t user-data -s 2>/dev/console) 2>&1

echo "===== Starting EC2 Setup ====="

# --- System update and dependencies ---
echo "Updating system and installing packages..."
yum update -y
yum install -y git postgresql jq awscli

# --- Install Docker if not present ---
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  amazon-linux-extras enable docker
  yum install -y docker
  systemctl enable docker
  systemctl start docker
  usermod -aG docker ec2-user
else
  echo "Docker already installed."
fi

# --- Ensure Docker is running ---
if ! systemctl is-active --quiet docker; then
  echo "Starting Docker service..."
  systemctl start docker
fi

echo "Waiting for network..."
sleep 10

# --- Fetch DB credentials from SSM ---
echo "Fetching DB credentials from SSM..."
db_user=$(aws ssm get-parameter --name "${db_username_ssm_path}" --with-decryption --query Parameter.Value --output text)
db_password=$(aws ssm get-parameter --name "${db_password_ssm_path}" --with-decryption --query Parameter.Value --output text)
db_host="${db_host}"

# --- Clone project ---
cd /home/ec2-user
if [ ! -d Shiptivitas ]; then
  echo "Cloning repo..."
  git clone https://github.com/RareSonal/Shiptivitas.git
fi
cd Shiptivitas

# --- Clean up ---
echo "Cleaning up unnecessary folders..."
find . -mindepth 1 -maxdepth 1 ! -name backend -exec rm -rf {} +

# --- Create .env for backend ---
echo "Creating .env file..."
cat <<EOF > backend/.env
DB_HOST=${db_host}
DB_PORT=5432
DB_USER=${db_user}
DB_PASSWORD=${db_password}
DB_NAME=shiptivitas_db
PORT=3001
EOF

# --- Function to check DB readiness ---
check_db_ready() {
  local retries=10
  local wait=10
  for i in $(seq 1 ${retries}); do
    echo "Checking DB readiness (attempt ${i}/${retries})..."
    if PGPASSWORD="${db_password}" psql -h "${db_host}" -U "${db_user}" -d postgres -c '\q' >/dev/null 2>&1; then
      echo "DB is ready."
      return 0
    fi
    echo "DB not ready, retrying in ${wait}s..."
    sleep ${wait}
  done
  echo "ERROR: Database not ready after $((retries * wait)) seconds."
  return 1
}

# --- Check DB readiness ---
check_db_ready

# --- Conditionally seed DB ---
if [ "${seed_db}" = "true" ]; then
  echo "Checking if database 'shiptivitas_db' exists..."
  DB_EXISTS=$(PGPASSWORD="${db_password}" psql -h "${db_host}" -U "${db_user}" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='shiptivitas_db'")
  if [ "${DB_EXISTS}" != "1" ]; then
    echo "Seeding database..."
    curl -O https://raw.githubusercontent.com/RareSonal/Shiptivitas/main/database/shiptivitas_postgres.sql
    PGPASSWORD="${db_password}" psql -h "${db_host}" -U "${db_user}" -d postgres -c "CREATE DATABASE shiptivitas_db;"
    PGPASSWORD="${db_password}" psql -h "${db_host}" -U "${db_user}" -d shiptivitas_db -f shiptivitas_postgres.sql
  else
    echo "Database already exists. Skipping seeding."
  fi
else
  echo "Database seeding disabled via SEED_DB flag. Skipping..."
fi

# --- Run backend inside Docker ---
echo "Running backend inside Docker..."
docker run -d \
  --name shiptivitas-backend \
  --restart unless-stopped \
  -p 3001:3001 \
  -v /home/ec2-user/Shiptivitas/backend:/usr/src/app \
  -w /usr/src/app \
  --env-file /home/ec2-user/Shiptivitas/backend/.env \
  node:18 \
  sh -c "npm install && npm install -g babel-watch && babel-watch server.js"

echo "===== EC2 setup complete. Backend is running. ====="
