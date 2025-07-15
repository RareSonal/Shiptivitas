#!/bin/bash
set -euxo pipefail

# Redirect output to log file and console
exec > >(tee /var/log/setup-ec2.log | logger -t user-data -s 2>/dev/console) 2>&1

echo "$$(date): ===== Starting EC2 Setup ====="

# --- Update system and install dependencies ---
echo "$$(date): Updating system and installing packages..."
yum update -y
yum install -y git postgresql jq awscli curl

# --- Install Docker with retry logic ---
echo "$$(date): Checking and installing Docker..."
retry=0
until command -v docker &>/dev/null || [ $$retry -ge 5 ]; do
  echo "$$(date): Attempt $$((retry+1)) to install Docker..."
  amazon-linux-extras enable docker || true
  yum clean metadata || true
  yum install -y docker || true
  ((retry++))
  sleep 10
done

if ! command -v docker &>/dev/null; then
  echo "$$(date): ERROR: Docker installation failed after retries."
  exit 1
fi

systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

# --- Wait for network (optional) ---
echo "$$(date): Waiting for network..."
sleep 10

# --- Fetch DB credentials from SSM ---
echo "$$(date): Fetching DB credentials from AWS SSM..."
db_user=$$(aws ssm get-parameter --name "${db_username_ssm_path}" --with-decryption --query Parameter.Value --output text)
db_password=$$(aws ssm get-parameter --name "${db_password_ssm_path}" --with-decryption --query Parameter.Value --output text)
db_host="${db_host}"

# --- Debug: Check if EC2 can reach RDS ---
echo "Checking RDS host reachability..."
ping -c 3 "$${db_host}" || echo "Warning: Cannot ping RDS host"

# --- Clone project repo ---
cd /home/ec2-user
if [ ! -d Shiptivitas ]; then
  echo "$$(date): Cloning GitHub repository..."
  git clone https://github.com/RareSonal/Shiptivitas.git
fi
cd Shiptivitas

# --- Remove non-backend folders ---
echo "$$(date): Cleaning up folders..."
find . -mindepth 1 -maxdepth 1 ! -name backend -exec rm -rf {} +

# --- Create .env for backend ---
echo "$$(date): Creating backend/.env file..."
cat <<EOF > backend/.env
DB_HOST=$${db_host}
DB_PORT=5432
DB_USER=$${db_user}
DB_PASSWORD=$${db_password}
DB_NAME=shiptivitas_db
PORT=3001
EOF

# --- Wait for DB to be ready ---
echo "$$(date): Checking DB readiness..."
check_db_ready() {
  local retries=10
  local wait=10
  for i in $$(seq 1 $${retries}); do
    echo "$$(date): Attempt $${i}/$${retries} to connect to DB..."
    if PGPASSWORD="$${db_password}" psql -h "$${db_host}" -U "$${db_user}" -d postgres -c '\q' &>/dev/null; then
      echo "$$(date): Database is reachable."
      return 0
    fi
    echo "$$(date): DB not ready, retrying in $${wait}s..."
    sleep $${wait}
  done
  echo "$$(date): ERROR: Database not reachable after retries."
  return 1
}
check_db_ready

# --- Conditionally seed DB ---
if [ "$${seed_db}" = "true" ]; then
  echo "$$(date): Seeding the database if needed..."
  DB_EXISTS=$$(PGPASSWORD="$${db_password}" psql -h "$${db_host}" -U "$${db_user}" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='shiptivitas_db'")
  if [ "$${DB_EXISTS}" != "1" ]; then
    echo "$$(date): Creating and seeding shiptivitas_db..."
    curl -O https://raw.githubusercontent.com/RareSonal/Shiptivitas/main/database/shiptivitas_postgres.sql
    PGPASSWORD="$${db_password}" psql -h "$${db_host}" -U "$${db_user}" -d postgres -c "CREATE DATABASE shiptivitas_db;"
    PGPASSWORD="$${db_password}" psql -h "$${db_host}" -U "$${db_user}" -d shiptivitas_db -f shiptivitas_postgres.sql
  else
    echo "$$(date): Database already exists, skipping seeding."
  fi
else
  echo "$$(date): Database seeding skipped via flag."
fi

# --- Start backend inside Docker ---
echo "$$(date): Starting Node.js backend in Docker..."
docker run -d \
  --name shiptivitas-backend \
  --restart unless-stopped \
  -p 3001:3001 \
  -v /home/ec2-user/Shiptivitas/backend:/usr/src/app \
  -w /usr/src/app \
  --env-file /home/ec2-user/Shiptivitas/backend/.env \
  node:18 \
  sh -c "npm install && npm install -g babel-watch && babel-watch server.js"

echo "$$(date): ===== EC2 setup complete. Backend running on port 3001 ====="
