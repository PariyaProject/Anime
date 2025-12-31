# Docker Deployment Guide

This guide explains how to deploy the app-service project using Docker containers on a local Mac Mini.

## Prerequisites

### Software Requirements

- **Docker Desktop** for Mac (version 4.0 or later)
  - Download from: https://www.docker.com/products/docker-desktop
- **macOS** 11 (Big Sur) or later
- **Intel Mac** or **Apple Silicon Mac** (M1/M2/M3)

### Verify Installation

```bash
# Check Docker version
docker --version

# Check Docker Compose version
docker-compose --version

# Verify Docker is running
docker ps
```

## Initial Deployment

### Step 1: Create Project Directory

```bash
# Create project directory
mkdir -p ~/anime-project/config ~/anime-project/logs ~/anime-project/scripts
cd ~/anime-project
```

### Step 2: Create docker-compose.yml

Create `docker-compose.yml` in your project directory:

```yaml
version: '3.8'

services:
  app-service:
    image: ghcr.io/PariyaProject/Anime:latest
    container_name: app-main
    restart: unless-stopped
    ports:
      - "3006:3006"
    volumes:
      - ./config:/app/config
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
      - PORT=3006
      - RATE_LIMIT_DELAY=1000
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3006/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  app-watchdog:
    image: ghcr.io/PariyaProject/Anime:watchdog
    container_name: app-monitor
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - CHECK_INTERVAL=86400
      - IMAGE_NAME=ghcr.io/PariyaProject/Anime:latest
      - COMPOSE_FILE=docker-compose.yml
```

**Important:** Replace `PariyaProject/Anime` with your actual GitHub repository path.

### Step 3: Start Services

```bash
# Pull latest images and start services
docker-compose up -d

# View logs
docker-compose logs -f app-service

# Check service status
docker-compose ps
```

### Step 4: Access the Application

- **Local access**: http://localhost:3006
- **Network access**: http://YOUR_MAC_IP:3006

To find your Mac's IP address:
```bash
# For Mac
ipconfig getifaddr en0  # Wi-Fi
ipconfig getifaddr en1  # Ethernet
```

## Watchdog Service

The app-watchdog container automatically checks for new images daily (86400 seconds).

### How It Works

1. **Polling**: Daily, the agent checks the GitHub Container Registry for a new image digest
2. **Comparison**: It compares the remote digest with the local image digest
3. **Update**: If they differ, it automatically:
   - Pulls the new image
   - Restarts containers with `docker-compose up -d`
   - Cleans up old images with `docker image prune -f`

### Manual Update

To manually trigger an update:

```bash
cd ~/anime-project
docker-compose pull
docker-compose up -d
docker image prune -f
```

### Check Update Agent Logs

```bash
docker-compose logs -f app-watchdog
```

## Data Management

### Directory Structure

```
~/anime-project/
├── config/                    # Mounted to /app/config
│   ├── watch-history.json     # Watch history data
│   ├── anime-index.json       # Anime search index
│   └── *.backup.*             # Automatic backups
├── logs/                      # Mounted to /app/logs
│   └── app-*.log              # Application logs
├── docker-compose.yml
└── scripts/
    └── app-watchdog.sh
```

### Backup Data

```bash
# Backup config directory
cp -r ~/anime-project/config ~/anime-project/config.backup.$(date +%Y%m%d)

# Or create a tar archive
tar -czf anime-config-backup-$(date +%Y%m%d).tar.gz ~/anime-project/config
```

### Restore Data

```bash
# Stop containers
docker-compose down

# Restore config
rm -rf config
cp -r config.backup.20251231 config

# Restart containers
docker-compose up -d
```

### View Logs

```bash
# View Docker logs
docker-compose logs -f app-service

# View local log files
tail -f ~/anime-project/logs/app-*.log

# View update agent logs
docker-compose logs -f app-watchdog
```

## Troubleshooting

### Container Won't Start

```bash
# Check container status
docker-compose ps

# View detailed logs
docker-compose logs app-service

# Check if port 3006 is already in use
lsof -i :3006
```

### Health Check Failing

```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' app-service

# Test health endpoint manually
curl http://localhost:3006/api/health
```

### Permission Issues

```bash
# Fix directory permissions
sudo chown -R $USER:$USER ~/anime-project/config
sudo chown -R $USER:$USER ~/anime-project/logs

# Ensure directories exist
mkdir -p ~/anime-project/config ~/anime-project/logs
```

### Update Agent Not Working

```bash
# Check update agent is running
docker-compose ps app-watchdog

# View update agent logs
docker-compose logs app-watchdog

# Manually trigger update check
docker exec app-monitor /usr/local/bin/update-agent.sh
```

### Image Pull Errors

```bash
# Login to GitHub Container Registry (if using private images)
echo $GITHUB_TOKEN | docker login ghcr.io -u PariyaProject --password-stdin

# Pull images manually
docker pull ghcr.io/PariyaProject/Anime:latest
docker pull ghcr.io/PariyaProject/Anime:watchdog
```

### Full Reset

If you need to completely reset:

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: This deletes all data)
docker-compose down -v

# Remove images
docker rmi ghcr.io/PariyaProject/Anime:latest
docker rmi ghcr.io/PariyaProject/Anime:watchdog

# Start fresh
docker-compose up -d
```

## Environment Variables

### app-service Service

| Variable | Default | Description |
|----------|---------|-------------|
| NODE_ENV | production | Node.js environment |
| PORT | 3006 | Server port |
| RATE_LIMIT_DELAY | 1000 | Request rate limit (ms) |

### app-watchdog Service

| Variable | Default | Description |
|----------|---------|-------------|
| CHECK_INTERVAL | 86400 | Update check interval (seconds, default: daily) |
| IMAGE_NAME | - | Full image name with registry |
| COMPOSE_FILE | docker-compose.yml | Compose file path |

## Performance Tips

### Reduce Memory Usage

If Docker is using too much memory:

1. Open Docker Desktop
2. Go to Settings > Resources
3. Reduce memory allocation (minimum 2GB recommended)

### Enable Auto-Start

To start containers automatically on system boot:

1. Open Docker Desktop
2. Go to Settings > General
3. Enable "Start Docker Desktop when you log in"

### Monitor Resource Usage

```bash
# View container resource usage
docker stats

# View disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

## Security Notes

### Network Exposure

By default, the service is accessible on your local network. If you want to restrict access:

1. Use a firewall to block external access to port 3006
2. Or change the port mapping to `127.0.0.1:3006:3006` (local only)

### Code Protection

- JavaScript code is obfuscated in the Docker image
- No sensitive data is included in the image
- All user data stays in local bind mounts

### Update Recommendations

- Always test updates in a non-production environment first
- Keep backups before updating
- Monitor logs after updates

## Advanced Configuration

### Custom Ports

To use a different port:

```yaml
services:
  app-service:
    ports:
      - "8080:3006"  # Map host port 8080 to container port 3006
```

### Multiple Instances

To run multiple instances:

```yaml
services:
  app-service-1:
    container_name: app-service-1
    ports:
      - "3006:3006"
    volumes:
      - ./config1:/app/config

  app-service-2:
    container_name: app-service-2
    ports:
      - "3007:3006"
    volumes:
      - ./config2:/app/config
```

### Resource Limits

To limit container resources:

```yaml
services:
  app-service:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Support

For issues and questions:

1. Check the logs: `docker-compose logs -f`
2. Review this troubleshooting guide
3. Open an issue on GitHub
