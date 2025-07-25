#!/bin/bash

# Docker cleanup (won’t do much in container, but kept for symmetry)
docker system prune -af --volumes 2>/dev/null || true

# Clear log files inside the container
find /var/log -type f -exec truncate -s 0 {} \; 2>/dev/null || true

echo "✅ Cleanup completed at $(date)"
