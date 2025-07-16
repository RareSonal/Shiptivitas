#!/bin/bash

set -e

# Check if Docker is already installed
if command -v docker &> /dev/null; then
    echo "Docker is already installed."
else
    echo "Docker is not installed. Installing Docker..."

    # Update the package index
    sudo yum update -y

    # Install Docker
    sudo amazon-linux-extras enable docker
    sudo yum install -y docker

    echo "Docker installed successfully."
fi

# Start and enable Docker service
echo "Starting and enabling Docker service..."
sudo systemctl start docker
sudo systemctl enable docker

# Add ec2-user to the docker group if not already added
if id -nG ec2-user | grep -qw docker; then
    echo "ec2-user is already in the docker group."
else
    echo "Adding ec2-user to the docker group..."
    sudo usermod -aG docker ec2-user

    echo "Applying new group membership using newgrp..."
    newgrp docker <<EONG
echo "Running Docker info to confirm access..."
docker info
EONG
fi

# Docker version check
docker --version

echo "Docker setup complete."
