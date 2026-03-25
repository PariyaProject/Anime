# Docker Deployment Guide

This guide explains how to deploy the app-service project using Docker containers on a local Mac Mini.

The deployment uses a single application container. Updates are pulled manually when you choose to upgrade.

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
mkdir -p ~/anime-project/config
cd ~/anime-project
```

### Step 2: Create docker-compose.yml

Create `docker-compose.yml` in your project directory:

```yaml
services:
  app-service:
    image: ghcr.io/pariyaproject/anime:latest
    container_name: app-main
    restart: unless-stopped
    ports:
      - "3006:3006"
    volumes:
      - ./config:/app/config
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

```

**Important:** Replace `pariyaproject/anime` with your actual GitHub repository path.

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

## Manual Updates

To manually update the service:

```bash
cd ~/anime-project
docker-compose pull
docker-compose up -d
docker image prune -f
```

## Data Management

### Directory Structure

```
~/anime-project/
├── config/                    # Mounted to /app/config
│   ├── watch-history.json     # Watch history data
│   ├── anime-index.json       # Anime search index
│   └── *.backup.*             # Automatic backups
└── docker-compose.yml
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
# View Docker logs (application uses console.log)
docker-compose logs -f app-service
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

### Image Pull Errors

```bash
# Login to GitHub Container Registry (if using private images)
echo $GITHUB_TOKEN | docker login ghcr.io -u pariyaproject --password-stdin

# Pull image manually
docker pull ghcr.io/pariyaproject/anime:latest
```

### Full Reset

If you need to completely reset:

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: This deletes all data)
docker-compose down -v

# Remove image
docker rmi ghcr.io/pariyaproject/anime:latest

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
