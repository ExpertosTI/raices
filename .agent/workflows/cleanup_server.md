---
description: How to clean up the server to free up disk space
---

This workflow helps you clean up unused Docker resources, system cache, and logs to free up disk space on your production server.

# 1. Docker Cleanup (Most Effective)
Since you build images frequently, old images can take up a lot of space.

```bash
# Remove stopped containers, unused networks, and dangling images
docker system prune -f

# ⚠️ AGGRESSIVE: Remove ALL unused images (not just dangling ones).
# Only use this if you want to clear everything not currently running.
# This will force a re-download/re-build of layers next time, but frees maximum space.
docker system prune -a -f

# Remove unused volumes (Be critical: ensures no data is lost)
# docker volume prune -f
```

# 2. System Cleanup (Ubuntu/Debian)

```bash
# Clean apt cache and unused dependencies
apt-get clean
apt-get autoremove -y
```

# 3. Log Cleanup (Journald)

```bash
# Retain only the last 100MB of system logs
journalctl --vacuum-size=100M

# Or retain only the last 2 days
# journalctl --vacuum-time=2d
```

# 4. Check Disk Usage

```bash
# Check overall disk usage
df -h

# Check Docker usage specifically
docker system df
```
