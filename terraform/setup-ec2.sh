#!/bin/bash
set -euo pipefail

# Install system dependencies
yum update -y
yum install -y git postgresql jq awscli docker

# Enable & start Docker
systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

# Fetch DB credentials from SSM Parameter Store securely
db_user=$(aws ssm get-parameter --name "${db_username_ssm_path}" --with-decryption --query Parameter.Value --output text)
db_password=$(aws ssm get-parameter --name "${db_password_ssm_path}" --with-decryption --query Parameter.Value --output text)
db_host="${db_host}"

# Clone the project if not already cloned
cd /home/ec2-user
if [ ! -d Shiptivitas ]; then
  git clone https://github.com/RareSonal/Shiptivitas.git
fi
cd Shiptivitas

# Clean unnecessary folders
find . -mindepth 1 -maxdepth 1 ! -name backend -exec rm -rf {} +

# Write .env file
cat <<EOF > backend/.env
DB_HOST=${db_host}
DB_PORT=5432
DB_USER=${db_user}
DB_PASSWORD=${db_password}
DB_NAME=shiptivitas_db
PORT=3001
EOF

# Wait until PostgreSQL is ready
check_db_ready() {
  local retries=10
  local wait=10
  for i in $(seq 1 $retries); do
    echo "Checking DB readiness (attempt $i/$retries)..."
    PGPASSWORD="${db_password}" psql -h "${db_host}" -U "${db_user}" -d postgres -c '\q' && return 0
    sleep $wait
  done
  echo "ERROR: DB not ready after $((retries * wait))s."
  return 1
}

if ! check_db_ready; then
  echo "Exiting: DB not reachable."
  exit 1
fi

# Seed the DB if it doesn't exist
DB_EXISTS=$(PGPASSWORD=${db_password} psql -h ${db_host} -U ${db_user} -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='shiptivitas_db'")
if [ "$DB_EXISTS" != "1" ]; then
  echo "Seeding database..."
  curl -O https://raw.githubusercontent.com/RareSonal/Shiptivitas/main/database/shiptivitas_postgres.sql
  PGPASSWORD=${db_password} psql -h ${db_host} -U ${db_user} -d postgres -c "CREATE DATABASE shiptivitas_db;"
  PGPASSWORD=${db_password} psql -h ${db_host} -U ${db_user} -d shiptivitas_db -f shiptivitas_postgres.sql
else
  echo "Database already exists."
fi

# Run backend using Node.js 18 inside Docker
docker run -d \
  --name shiptivitas-backend \
  --restart always \
  -p 3001:3001 \
  -v /home/ec2-user/Shiptivitas/backend:/usr/src/app \
  -w /usr/src/app \
  --env-file /home/ec2-user/Shiptivitas/backend/.env \
  node:18 \
  sh -c "npm install && npm install -g babel-watch && babel-watch server.js"
