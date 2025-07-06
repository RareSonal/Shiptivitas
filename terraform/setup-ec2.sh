#!/bin/bash
yum update -y
curl -sL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs git postgresql

# Clone the project
cd /home/ec2-user
git clone https://github.com/RareSonal/Shiptivitas.git
cd Shiptivitas/backend

# Create .env for Node.js backend
cat <<EOF > .env
DB_HOST=${db_host}
DB_PORT=5432
DB_USER=${db_user}
DB_PASSWORD=${db_password}
DB_NAME=shiptivitas_db
PORT=3001
EOF

# Install Node packages
npm install
npm install -g babel-watch

# Wait for DB to be ready
sleep 20

# Create and seed DB only if it doesn't exist
DB_EXISTS=$(PGPASSWORD=${db_password} psql -h ${db_host} -U ${db_user} -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='shiptivitas_db'")

if [ "$DB_EXISTS" != "1" ]; then
  echo "Creating and seeding database..."
  PGPASSWORD=${db_password} psql -h ${db_host} -U ${db_user} -d postgres -c "CREATE DATABASE shiptivitas_db;"
  curl -O https://raw.githubusercontent.com/RareSonal/Shiptivitas/main/database/shiptivitas_postgres.sql
  PGPASSWORD=${db_password} psql -h ${db_host} -U ${db_user} -d shiptivitas_db -f shiptivitas_postgres.sql
else
  echo "Database already exists, skipping seeding."
fi

# Start backend
babel-watch server.js
