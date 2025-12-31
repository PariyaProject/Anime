# Proposal: add-docker-deployment

## Summary

为 cycani-proxy 项目添加完整的 Docker 容器化部署方案,支持 Mac 本地局域网部署和基于**轮询机制**的自动更新流程。

## Why

当前项目存在以下问题,需要标准化的部署方案来解决:

1. **部署流程繁琐**: 每次部署都需要手动安装 Node.js、依赖包、配置环境变量
2. **环境不一致**: 开发环境和生产环境可能存在差异,导致"在我机器上能跑"的问题
3. **更新困难**: 代码更新后需要手动 SSH 到服务器、拉取代码、重启服务
4. **数据管理混乱**: 缺乏统一的数据持久化和备份策略
5. **Mac Mini 部署挑战**: 局域网环境 IP 可能变化,传统 webhook 方案不可行

通过 Docker 容器化可以实现一键部署、自动更新、数据持久化,解决上述所有问题。

## Motivation

目前项目缺少标准化的部署方案,每次部署都需要手动配置环境、安装依赖、启动服务。通过 Docker 容器化可以实现:

1. **环境一致性**: 开发、测试、生产环境完全一致
2. **快速部署**: 一条命令即可启动完整服务
3. **易于维护**: 统一的生命周期管理
4. **版本控制**: 每个容器镜像都是可回滚的版本
5. **自动化更新**: 通过轮询机制实现自动检测和部署更新

## Goals

### 主要目标

1. 创建完整的 Docker 镜像构建配置
2. 支持通过 Docker Compose 一键启动服务
3. 实现基于轮询的自动更新机制(无需固定IP)
4. 支持局域网访问配置
5. 包含数据持久化方案(本地目录绑定)
6. 代码混淆保护(JavaScript 混淆)

### 非目标

- 不支持外网访问(仅局域网)
- 不配置 HTTPS/TLS
- 不实现自动回滚功能
- 不支持多环境配置(仅生产环境)
- 镜像推送到公开 GHCR(不包含敏感数据)

## Proposed Solution

### 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    GitHub Repository                    │
│                    (Private)                            │
│                                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │  GitHub Actions (构建触发器)                   │    │
│  │  - 构建 Docker Image                           │    │
│  │  - JavaScript 代码混淆                         │    │
│  │  - 推送到公开 GHCR                             │    │
│  │  - 更新 latest tag                             │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                         │
                         │ 镜像推送到公开 GHCR
                         ▼
┌─────────────────────────────────────────────────────────┐
│                Mac Mini (Local Network)                 │
│                                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │  Update Agent (每5分钟轮询)                     │    │
│  │  - 检查 GHCR 镜像版本                           │    │
│  │  - 对比本地镜像 digest                          │    │
│  │  - 有更新则触发部署脚本                         │    │
│  └────────────────────────────────────────────────┘    │
│                         │                               │
│                         ▼                               │
│  ┌────────────────────────────────────────────────┐    │
│  │  Docker Container: cycani-proxy                │    │
│  │  - Node.js 22.x Runtime                        │    │
│  │  - Puppeteer (for web scraping)                │    │
│  │  - Built Vue Frontend                          │    │
│  │  - Obfuscated JavaScript                       │    │
│  │  - Express Server (port 3006)                  │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │  Local Bind Mounts (数据持久化)                │    │
│  │  - ./config:/app/config  (配置数据)            │    │
│  │  - ./logs:/app/logs      (日志文件)            │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  Access URL: http://mac-mini.local:3006                 │
└─────────────────────────────────────────────────────────┘
```

### 核心组件

#### 1. Dockerfile (多阶段构建)

```dockerfile
# Stage 1: Frontend Build
FROM node:24-alpine AS frontend-builder
WORKDIR /app/frontend
COPY cycani-proxy/frontend/package*.json ./
RUN npm ci
COPY cycani-proxy/frontend/ ./
RUN npm run build

# Stage 2: Backend with Obfuscation
FROM node:24-alpine AS backend-builder
WORKDIR /app
COPY cycani-proxy/package*.json ./
RUN npm ci --production
COPY cycani-proxy/src/ ./src/

# Install javascript-obfuscator
RUN npm install -g javascript-obfuscator

# Obfuscate JavaScript files
RUN find ./src -name "*.js" -type f -exec sh -c \
    'javascript-obfuscator "$1" --output "$1.obf" && mv "$1.obf" "$1"' _ {} \;

# Stage 3: Runtime Image
FROM node:24-alpine

# Install Puppeteer dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copy obfuscated source and dependencies
COPY --from=backend-builder /app/src ./src
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/package*.json ./

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./dist/

# Create data directories
RUN mkdir -p /app/config /app/logs

VOLUME ["/app/config", "/app/logs"]

EXPOSE 3006

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3006/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "src/server.js"]
```

#### 2. Docker Compose 配置

```yaml
version: '3.8'

services:
  cycani-proxy:
    image: ghcr.io/your-username/anime:latest
    container_name: cycani-proxy
    restart: unless-stopped
    ports:
      - "3006:3006"
    volumes:
      # 本地目录绑定,数据直接存储在项目目录下
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
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  update-agent:
    image: ghcr.io/your-username/anime:update-agent
    container_name: cycani-update-agent
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./scripts:/scripts
    environment:
      - CHECK_INTERVAL=300  # 5 minutes
      - IMAGE_NAME=ghcr.io/your-username/anime:latest
      - COMPOSE_FILE=docker-compose.yml
    depends_on:
      - cycani-proxy
```

**本地目录结构**:
```
~/anime-project/
├── config/
│   ├── watch-history.json
│   ├── anime-index.json
│   └── watch-history.json.backup.*
├── logs/
│   └── app-*.log
├── docker-compose.yml
└── scripts/
    └── update-agent.sh
```

#### 3. Update Agent (更新检测器)

**scripts/update-agent.sh**:
```bash
#!/bin/bash
set -e

INTERVAL=${CHECK_INTERVAL:-300}
IMAGE_NAME=${IMAGE_NAME:-ghcr.io/your-username/anime:latest}
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.yml}

echo "🔄 Update Agent Started"
echo "   Check Interval: ${INTERVAL}s"
echo "   Image: ${IMAGE_NAME}"
echo ""

while true; do
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Checking for updates..."

    # 获取远程镜像 digest
    REMOTE_DIGEST=$(docker manifest inspect ${IMAGE_NAME} 2>/dev/null | \
        jq -r '.manifests[0].digest // empty')

    if [ -z "$REMOTE_DIGEST" ]; then
        echo "   ⚠️  Unable to fetch remote manifest, forcing pull..."
        docker pull ${IMAGE_NAME} >/dev/null 2>&1 || {
            echo "   ❌ Failed to pull image. Retrying next cycle."
            sleep $INTERVAL
            continue
        }
    fi

    # 获取本地镜像 digest
    LOCAL_DIGEST=$(docker image inspect ${IMAGE_NAME} 2>/dev/null | \
        jq -r '.[0].RepoDigests[0] // empty' | grep -o 'sha256:[a-f0-9]*' || echo "")

    if [ -z "$LOCAL_DIGEST" ]; then
        echo "   📦 No local image found, pulling..."
        docker pull ${IMAGE_NAME}
    fi

    # 再次对比 digest
    LOCAL_DIGEST=$(docker image inspect ${IMAGE_NAME} 2>/dev/null | \
        jq -r '.[0].RepoDigests[0] // empty' | grep -o 'sha256:[a-f0-9]*' || echo "")

    REMOTE_DIGEST=$(docker manifest inspect ${IMAGE_NAME} 2>/dev/null | \
        jq -r '.manifests[0].digest // empty')

    if [ "$REMOTE_DIGEST" != "$LOCAL_DIGEST" ]; then
        echo "   🆕 New version detected!"
        echo "      Remote: ${REMOTE_DIGEST}"
        echo "      Local:  ${LOCAL_DIGEST}"

        # 拉取新镜像
        echo "   📥 Pulling new image..."
        docker pull ${IMAGE_NAME}

        # 重启服务
        echo "   🔄 Restarting services..."
        docker-compose -f ${COMPOSE_FILE} up -d

        # 清理旧镜像
        echo "   🧹 Cleaning up old images..."
        docker image prune -f

        echo "   ✅ Update complete!"
    else
        echo "   ✅ Already up to date"
    fi

    echo ""
    sleep $INTERVAL
done
```

#### 4. GitHub Actions 工作流

**.github/workflows/build-and-push.yml**:
```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [master]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=raw,value=latest
            type=sha,prefix={{branch}}-

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64,linux/arm64

      - name: Build update agent
        uses: docker/build-push-action@v5
        with:
          context: .
          file: Dockerfile.update-agent
          push: true
          tags: ghcr.io/${{ github.repository }}:update-agent
```

**Dockerfile.update-agent**:
```dockerfile
FROM alpine:latest
RUN apk add --no-cache docker-cli jq bash curl
COPY scripts/update-agent.sh /usr/local/bin/update-agent.sh
RUN chmod +x /usr/local/bin/update-agent.sh
CMD ["/usr/local/bin/update-agent.sh"]
```

#### 5. .dockerignore

```
# Dependencies
node_modules/
npm-debug.log*

# Data
config/
logs/
data/

# Git
.git/
.gitignore

# Documentation
*.md
!README.md

# IDE
.vscode/
.idea/

# OpenSpec
openspec/

# Scripts
scripts/

# CI/CD
.github/

# Test
coverage/
*.test.js

# Docker files (except what we need)
Dockerfile.update-agent
docker-compose.yml

# Misc
.DS_Store
*.log
```

#### 6. .gitignore 更新

```
# 添加到现有 .gitignore

# Docker volumes (bind mounts)
config/
logs/

# Docker build artifacts
*.tar
*.tar.gz
```

### 部署流程

#### 初始化部署(一次性)

1. **安装 Docker Desktop**
   ```bash
   # 从 https://www.docker.com/products/docker-desktop 下载安装
   docker --version  # 验证安装
   docker-compose --version
   ```

2. **创建项目目录**
   ```bash
   mkdir -p ~/anime-project/config ~/anime-project/logs ~/anime-project/scripts
   cd ~/anime-project
   ```

3. **创建必要文件**

   **docker-compose.yml**:
   ```yaml
   version: '3.8'

   services:
     cycani-proxy:
       image: ghcr.io/YOUR_USERNAME/YOUR_REPO:latest
       container_name: cycani-proxy
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

     update-agent:
       image: ghcr.io/YOUR_USERNAME/YOUR_REPO:update-agent
       container_name: cycani-update-agent
       restart: unless-stopped
       volumes:
         - /var/run/docker.sock:/var/run/docker.sock
       environment:
         - CHECK_INTERVAL=300
         - IMAGE_NAME=ghcr.io/YOUR_USERNAME/YOUR_REPO:latest
         - COMPOSE_FILE=docker-compose.yml

   scripts/update-agent.sh**:
   ```bash
   # (使用上面提供的完整脚本)
   ```

4. **首次启动**
   ```bash
   # 拉取镜像并启动
   docker-compose up -d

   # 查看日志
   docker-compose logs -f cycani-proxy

   # 检查服务状态
   docker-compose ps
   ```

5. **访问服务**
   - 本机访问: `http://localhost:3006`
   - 局域网其他设备: `http://<mac-ip>:3006`

6. **(可选) 设置开机自启**
   - Docker Desktop 设置: Start Docker Desktop when you log in
   - 或使用 launchd 创建系统服务

#### 日常更新(全自动)

**无需任何手动操作!**

1. 开发者 push 代码到 master 分支
2. GitHub Actions 自动构建并推送新镜像到 GHCR (约3-5分钟)
3. Mac Mini 上的 update-agent 最多5分钟后检测到新镜像
4. 自动拉取新镜像并重启容器
5. 数据自动保留(./config 和 ./logs 绑定到本地)

**手动触发更新(可选)**:
```bash
cd ~/anime-project
docker-compose pull
docker-compose up -d
docker image prune -f
```

### 数据管理

**备份数据**:
```bash
# 备份 config 目录
cp -r ~/anime-project/config ~/anime-project/config.backup.$(date +%Y%m%d)

# 或使用 git 追踪配置(注意不要提交敏感数据)
cd ~/anime-project
git init
git add config/
git commit -m "Backup config"
```

**恢复数据**:
```bash
# 停止容器
docker-compose down

# 恢复配置
rm -rf config
cp -r config.backup.20251231 config

# 重启容器
docker-compose up -d
```

**查看日志**:
```bash
# 实时查看应用日志
docker-compose logs -f cycani-proxy

# 查看本地日志文件
tail -f ~/anime-project/logs/app-*.log
```

### 代码混淆配置

**JavaScript 混淆选项** (在 Dockerfile 中):
```dockerfile
# 当前使用默认混淆
RUN javascript-obfuscator "$1" --output "$1.obf"

# 可选: 更强混淆(会增加镜像大小和启动时间)
RUN javascript-obfuscator "$1" \
    --compact true \
    --control-flow-flattening true \
    --dead-code-injection true \
    --debug-protection true \
    --disable-console-output true \
    --output "$1.obf"
```

### 轮询机制详解

**Update Agent 工作原理**:

1. **定时检查**: 每5分钟(可配置)检查一次
2. **版本对比**: 通过镜像 digest 判断是否有更新
3. **自动部署**: 检测到新版本后自动:
   - 拉取新镜像
   - 执行 `docker-compose up -d`
   - 清理旧镜像
4. **健康检查**: 确保服务启动成功

**配置说明**:
```yaml
environment:
  - CHECK_INTERVAL=300        # 检查间隔(秒),默认300(5分钟)
  - IMAGE_NAME=ghcr.io/...   # 镜像名称
  - COMPOSE_FILE=docker-compose.yml  # Compose 文件路径
```

**调试 Update Agent**:
```bash
# 查看更新日志
docker-compose logs -f update-agent

# 手动触发检查
docker exec cycani-update-agent /usr/local/bin/update-agent.sh
```

## Alternatives Considered

### 方案对比表

| 方案 | 即时性 | 可靠性 | 复杂度 | 隐私性 |
|------|--------|--------|--------|--------|
| **GHCR公开 + 轮询 (选定)** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ 简单 | ⭐⭐⭐⭐ 混淆保护 |
| GHCR私有 + 轮询 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ 中等 | ⭐⭐⭐⭐⭐ 完全私有 |
| 本地构建 | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ 中等 | ⭐⭐⭐⭐⭐ 完全私有 |
| Webhook + 内网穿透 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ 复杂 | ⭐⭐⭐⭐ |

### 代码混淆 vs 私有镜像

| 特性 | 代码混淆 | 私有镜像 |
|------|----------|----------|
| 源代码保护 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 配置复杂度 | ⭐⭐⭐⭐⭐ 简单 | ⭐⭐⭐ 需要token |
| 构建速度 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 拉取速度 | ⭐⭐⭐⭐⭐ 无需认证 | ⭐⭐⭐⭐ 需要认证 |

**结论**: 对于此项目,代码混淆已提供足够的保护,且配置更简单。

## Impact

### 新增文件

```
.
├── Dockerfile                      # 主镜像构建配置(含混淆)
├── Dockerfile.update-agent         # Update Agent 镜像
├── docker-compose.yml              # 服务编排配置
├── .dockerignore                   # Docker 构建排除规则
├── scripts/
│   └── update-agent.sh             # 更新检测脚本
├── .github/workflows/
│   └── build-and-push.yml          # GitHub Actions 工作流
└── DEPLOYMENT.md                   # 部署文档
```

### 修改文件

- `.gitignore` - 添加 `config/`, `logs/` 忽略规则

### 无需修改

- 现有业务代码完全无需改动
- 数据存储逻辑保持不变
- 开发流程不受影响

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Puppeteer Chromium 下载失败 | 高 | 使用 Alpine apk 安装的 Chromium |
| 镜像构建失败 | 中 | GitHub Actions 提供详细日志 |
| 混淆后代码运行异常 | 中 | 可在构建时测试,或禁用混淆 |
| Update Agent 失败 | 低 | 容器自动重启,可手动执行更新 |
| Mac Mini Docker 版本过低 | 低 | 文档说明最低版本要求 |
| 镜像拉取速率限制 | 低 | 公开镜像限额较高(200次/6小时) |
| 本地目录权限问题 | 低 | Docker 自动处理,文档说明 |

## Success Criteria

- [ ] `docker-compose up -d` 能成功启动服务
- [ ] 服务健康检查通过 (`/api/health` 返回 200)
- [ ] 数据在容器重启后保留(观看历史不丢失)
- [ ] GitHub Actions 工作流成功构建镜像
- [ ] JavaScript 代码被混淆(验证镜像内容)
- [ ] Update Agent 能检测到镜像更新
- [ ] Update Agent 自动部署新版本
- [ ] 部署文档清晰,可独立操作
- [ ] 支持 Intel 和 Apple Silicon Mac
- [ ] 配置数据存储在本地目录(非命名卷)

## Timeline

- **Phase 1**: Docker 配置 (Dockerfile, docker-compose.yml) - 1天
- **Phase 2**: Update Agent 开发 - 0.5天
- **Phase 3**: GitHub Actions 集成 - 0.5天
- **Phase 4**: 文档编写 - 0.5天
- **Phase 5**: 测试验证 - 0.5天

**总计**: 约3天完成
