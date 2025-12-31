# Design: add-docker-deployment

## Overview

本文档记录 cycani-proxy 项目 Docker 容器化部署方案的设计决策和架构考量。

## Architecture Decisions

### ADR-001: 使用轮询模式而非 Webhook

**Context**: Mac Mini 在局域网中,IP地址可能变化,GitHub Actions 无法直接访问。

**Decision**: 使用 Update Agent 定时轮询 GHCR 镜像版本。

**Rationale**:
| 因素 | 轮询模式 | Webhook + 内网穿透 |
|------|----------|-------------------|
| 可靠性 | ⭐⭐⭐⭐⭐ 不依赖外部服务 | ⭐⭐⭐ 依赖穿透服务稳定性 |
| 复杂度 | ⭐ 简单,无额外依赖 | ⭐⭐⭐ 需要配置穿透服务 |
| 延迟 | ⭐⭐⭐⭐ 最多5分钟 | ⭐⭐⭐⭐⭐ 实时 |
| 安全性 | ⭐⭐⭐⭐⭐ 无需开放端口 | ⭐⭐⭐ 需要开放端口或VPN |

**Consequences**:
- ✅ 零依赖,不依赖任何第三方服务
- ✅ 配置简单,故障点少
- ⚠️ 最多5分钟延迟(对个人项目可接受)
- ⚠️ 需要额外的 Update Agent 容器

### ADR-002: 公开 GHCR 镜像 + 代码混淆

**Context**: 用户希望保护源代码,但不希望配置复杂的认证。

**Decision**: 使用公开 GHCR 存储镜像,构建时进行 JavaScript 代码混淆。

**Rationale**:
| 因素 | 私有镜像 + Token | 公开镜像 + 混淆 |
|------|-----------------|----------------|
| 配置复杂度 | ⭐⭐ 需要配置 token | ⭐⭐⭐⭐⭐ 无需配置 |
| 源代码保护 | ⭐⭐⭐⭐⭐ 完全不可见 | ⭐⭐⭐⭐ 混淆后难逆向 |
| 拉取速度 | ⭐⭐⭐ 需要认证 | ⭐⭐⭐⭐⭐ 直接拉取 |
| 构建复杂度 | ⭐⭐⭐⭐ 标准流程 | ⭐⭐⭐ 需要混淆步骤 |

**Consequences**:
- ✅ 部署配置极简,无需 token
- ✅ 镜像拉取速度更快
- ⚠️ 需要增加混淆构建步骤
- ⚠️ 混淆可能略微增加镜像大小

### ADR-003: 本地目录绑定而非命名卷

**Context**: 用户希望数据直接存储在项目目录下,便于管理和备份。

**Decision**: 使用 Docker bind mount 绑定本地目录 `./config` 和 `./logs`。

**Rationale**:
| 因素 | 命名卷 | 本地绑定 |
|------|--------|----------|
| 数据可见性 | ⭐⭐ 需要特定路径查看 | ⭐⭐⭐⭐⭐ 项目目录直接可见 |
| 备份便利性 | ⭐⭐ 需要导出卷 | ⭐⭐⭐⭐⭐ 直接复制目录 |
| Git 集成 | ⭐⭐ 难以追踪 | ⭐⭐⭐⭐ 可选择性追踪 |
| Windows 兼容 | ⭐⭐⭐⭐⭐ 完全兼容 | ⭐⭐⭐⭐ 路径分隔符问题 |

**Consequences**:
- ✅ 数据直观可见,易于管理
- ✅ 可以用 git 追踪配置(可选)
- ✅ 备份恢复简单
- ⚠️ 需要确保目录权限正确
- ⚠️ 需要配置 .gitignore 防止提交敏感数据

### ADR-004: 多阶段构建 + 混淆

**Context**: 需要构建 Vue 前端,同时保护后端 JavaScript 源代码。

**Decision**: 使用多阶段构建,Stage 1 构建前端,Stage 2 混淆后端,Stage 3 运行时镜像。

**Rationale**:
- 前端构建需要 Node.js 和大量依赖
- 后端混淆需要额外工具,但不应该包含在运行时镜像中
- 最终镜像应该只包含运行时必需的文件

**架构图**:
```
┌──────────────────────────┐
│  Stage 1: Frontend Build │
│  - node:24-alpine        │
│  - npm ci                │
│  - npm run build         │
│  Output: /dist/          │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Stage 2: Backend Build  │
│  - node:24-alpine        │
│  - npm ci --production   │
│  - javascript-obfuscator │
│  - Obfuscate src/*.js    │
│  Output: obfuscated code │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Stage 3: Runtime Image  │
│  - node:24-alpine        │
│  - chromium + deps       │
│  - Copy obfuscated src   │
│  - Copy /dist            │
│  - Copy node_modules     │
│  Final size: ~300MB      │
└──────────────────────────┘
```

### ADR-005: Update Agent 独立容器

**Context**: 需要一个自动更新机制,但不希望在主应用容器中运行额外的进程。

**Decision**: 将 Update Agent 作为独立的容器运行,通过 Docker.sock 控制主容器。

**Rationale**:
| 方案 | 独立容器 | 同容器多进程 | Cron 宿主机 |
|------|----------|-------------|------------|
| 隔离性 | ⭐⭐⭐⭐⭐ 完全隔离 | ⭐⭐⭐ 共享命名空间 | ⭐⭐⭐⭐ 进程隔离 |
| 可靠性 | ⭐⭐⭐⭐⭐ 独立重启 | ⭐⭐⭐ 进程崩溃影响主应用 | ⭐⭐⭐⭐ 宿主机重启失效 |
| 可维护性 | ⭐⭐⭐⭐⭐ 日志独立 | ⭐⭐⭐ 日志混合 | ⭐⭐⭐⭐ 配置分散 |
| 权限 | ⭐⭐⭐ 需要 Docker.sock | ⭐⭐⭐⭐⭐ 无需额外权限 | ⭐⭐⭐⭐ 需要 root cron |

**Consequences**:
- ✅ 职责分离,update-agent 失败不影响主应用
- ✅ 可以独立查看日志和调试
- ✅ 可以独立更新 update-agent
- ⚠️ 需要挂载 /var/run/docker.sock
- ⚠️ 多一个容器需要管理

## Component Design

### 1. Dockerfile

**设计目标**:
- 最小化镜像大小
- 最大化缓存效率
- 安全性(代码混淆)
- 多架构支持

**关键技术点**:
```dockerfile
# 1. 多阶段构建减少最终镜像大小
FROM node:24-alpine AS frontend-builder
FROM node:24-alpine AS backend-builder
FROM node:24-alpine AS runtime

# 2. Alpine 基础镜像 (~5MB vs Debian ~200MB)
FROM node:24-alpine

# 3. 安装系统依赖最小化
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont

# 4. 利用 Docker 构建缓存
COPY package*.json ./  # 先复制依赖描述文件
RUN npm ci --production  # 安装依赖(这一层会被缓存)
COPY src/ ./src/  # 最后复制源代码

# 5. 代码混淆
RUN javascript-obfuscator src/*.js --output src/

# 6. 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3006/api/health'...)"
```

**镜像大小优化**:
- 使用 Alpine 基础镜像
- 多阶段构建只保留必需文件
- npm ci --production 不安装开发依赖
- 清理 npm 缓存

**预期镜像大小**:
- Frontend builder stage: ~500MB (不包含在最终镜像)
- Backend builder stage: ~400MB (不包含在最终镜像)
- Runtime image: ~300MB

### 2. Docker Compose

**设计目标**:
- 一键启动
- 数据持久化
- 自动重启
- 服务编排

**关键配置**:
```yaml
services:
  cycani-proxy:
    restart: unless-stopped  # 自动重启策略
    ports:
      - "3006:3006"
    volumes:
      - ./config:/app/config  # 本地绑定
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3006/api/health"]
      interval: 30s
      start_period: 40s  # 给 Puppeteer 足够启动时间

  update-agent:
    depends_on:
      - cycani-proxy
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock  # Docker 控制
```

### 3. Update Agent

**设计目标**:
- 可靠性检测更新
- 最小化资源占用
- 详细的日志记录
- 优雅的错误处理

**工作流程**:
```
┌─────────────────┐
│  Start/Loop     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Fetch Remote   │�───────────┐
│  Image Digest   │           │
└────────┬────────┘           │
         │                    │
         ▼                    │
┌─────────────────┐           │
│  Get Local      │           │
│  Image Digest   │           │
└────────┬────────┘           │
         │                    │
         ▼                    │
      ┌────┴────┐             │
      │ Compare │             │
      └────┬────┘             │
           │                 │
     ┌─────┴─────┐           │
     │ Different?│           │
     └─────┬─────┘           │
      ┌────┴────┐            │
     Yes       No            │
      │         │            │
      ▼         ▼            │
   Pull    Sleep (5min) ◄────┘
      │
      ▼
   Restart
      │
      ▼
   Prune
      │
      ▼
   Log
```

**关键代码逻辑**:
```bash
# 获取远程 digest (使用 manifest inspect)
REMOTE_DIGEST=$(docker manifest inspect ${IMAGE_NAME} | jq -r '.manifests[0].digest')

# 获取本地 digest
LOCAL_DIGEST=$(docker image inspect ${IMAGE_NAME} | jq -r '.[0].RepoDigests[0]')

# 对比并更新
if [ "$REMOTE_DIGEST" != "$LOCAL_DIGEST" ]; then
    docker pull ${IMAGE_NAME}
    docker-compose up -d
    docker image prune -f
fi
```

**资源占用**:
- CPU: 空闲时 0%, 检查时短暂峰值
- 内存: ~10MB (Alpine + jq + docker-cli)
- 网络: 每次 ~1KB (manifest 请求)

### 4. GitHub Actions Workflow

**设计目标**:
- 自动化构建和推送
- 多架构支持
- 构建缓存优化
- 安全的权限管理

**工作流程**:
```
┌─────────────────┐
│  Push to Master │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Trigger Workflow       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Checkout Code          │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Setup Docker Buildx    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Login to GHCR          │
│  (GITHUB_TOKEN)         │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Build & Push           │
│  - amd64                │
│  - arm64                │
│  - Cache from GHA       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Create Multi-Arch      │
│  Manifest & Push        │
└─────────────────────────┘
```

**性能优化**:
- 使用 GitHub Actions Cache 缓存 Docker 层
- 并行构建多架构镜像
- 使用 buildkit 加速构建

**预期构建时间**:
- 首次构建: ~15-20 分钟
- 缓存命中: ~5-8 分钟

### 5. 数据持久化

**目录结构**:
```
~/anime-project/
├── config/                    # 绑定到 /app/config
│   ├── watch-history.json     # 用户观看历史
│   ├── anime-index.json       # 动漫索引
│   └── *.backup.*             # 自动备份文件
├── logs/                      # 绑定到 /app/logs
│   └── app-*.log              # 应用日志
├── docker-compose.yml
└── scripts/
    └── update-agent.sh
```

**备份策略**:
1. **应用级备份**: 服务器自动创建 .backup 文件
2. **用户级备份**: 手动复制 config 目录
3. **可选 Git 追踪**: 使用 git 追踪配置变化

**权限管理**:
```bash
# 确保 config 目录权限正确
mkdir -p config logs
chmod 755 config logs

# Docker 会以容器内用户(nobody)写入
# 需要确保宿主机目录允许写入
```

## Security Considerations

### 1. 代码混淆

**工具**: javascript-obfuscator

**混淆级别**: 中等(平衡保护性和性能)

**配置**:
```javascript
{
  compact: true,
  controlFlowFlattening: false,  // 不启用(影响性能)
  deadCodeInjection: false,      // 不启用(增加代码量)
  debugProtection: false,        // 不启用(可能影响调试)
  disableConsoleOutput: false,   // 保留 console.log
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  rotateStringArray: true,
  selfDefending: false,          // 不启用(可能影响性能)
  shuffleStringArray: true,
  splitStrings: false,
  stringArray: true,
  stringArrayEncoding: ['base64']
}
```

**效果评估**:
- 变量名: `animeId` → `_0x5a3b`
- 字符串: `"GET"` → `'\x47\x45\x54'`
- 控制流: 保持可读性(为了性能)
- **逆向难度**: 中等(需要专业工具和时间)

### 2. 敏感数据处理

**不包含在镜像中**:
- `.env` 文件 (通过 .dockerignore 排除)
- `config/` 目录 (运行时挂载)
- `logs/` 目录 (运行时挂载)
- SSH 密钥、证书等

**环境变量**:
- `NODE_ENV=production`
- `PORT=3006`
- `RATE_LIMIT_DELAY=1000`
- **无敏感信息**

### 3. 容器安全

**最小权限原则**:
- 容器以 node 用户运行(非 root)
- 只开放必要端口 3006
- 不使用 --privileged

**网络安全**:
- 仅监听 0.0.0.0:3006 (局域网)
- 不配置外网访问
- 无需 HTTPS (仅局域网)

## Performance Considerations

### 1. 镜像构建性能

**缓存策略**:
```dockerfile
# 1. 优先复制依赖描述文件(很少变化)
COPY package*.json ./
RUN npm ci --production  # 这层会被缓存

# 2. 最后复制源代码(经常变化)
COPY src/ ./src/
```

**GitHub Actions 缓存**:
```yaml
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

**预期构建时间**:
| 场景 | 时间 |
|------|------|
| 首次构建 | 15-20 min |
| 修改 src/ 文件 | 5-8 min |
| 修改 package.json | 8-12 min |
| 仅修改文档 | 2-3 min |

### 2. 容器启动性能

**启动时间分解**:
1. Docker 启动容器: ~1s
2. Node.js 加载: ~2s
3. Express 初始化: ~1s
4. Puppeteer 初始化: ~5s
5. 健康检查通过: ~10s

**总启动时间**: ~15-20s

**优化**:
- 使用 Alpine Linux (快速启动)
- npm ci --production (减少依赖)
- 延迟加载 Puppeteer (按需启动)

### 3. 运行时性能

**资源占用**:
- CPU: 空闲 <5%, 请求时 10-30%
- 内存: ~100-200MB (Node + Chromium)
- 磁盘: ~100MB (镜像) + 数据文件

**并发处理**:
- Express 可处理数百并发请求
- Puppeteer 受限于 Chromium 实例
- 使用浏览器池管理连接

## Monitoring and Observability

### 1. 日志策略

**日志位置**:
- 容器内: `/app/logs/app-*.log`
- 宿主机: `./logs/app-*.log`
- Docker logs: `docker-compose logs -f`

**日志级别**:
- `INFO`: 正常操作信息
- `WARN`: 警告信息
- `ERROR`: 错误信息

**日志轮转**:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"   # 单个日志文件最大 10MB
    max-file: "3"     # 保留最近 3 个文件
```

### 2. 健康检查

**检查端点**: `/api/health`

**检查逻辑**:
```javascript
app.get('/api/health', (req, res) => {
  // 检查数据库连接
  // 检查 Puppeteer 状态
  // 检查内存使用
  res.status(200).json({ status: 'ok' });
});
```

**Docker Healthcheck**:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3006/api/health'...)"
```

### 3. 监控指标

**应用指标**:
- 请求响应时间
- 错误率
- Puppeteer 启动时间
- 内存使用

**容器指标**:
- CPU 使用率
- 内存使用
- 磁盘 I/O
- 网络流量

## Rollback Strategy

### 场景 1: 自动回滚

**触发条件**:
- 健康检查连续失败 3 次
- 容器启动失败

**回滚步骤**:
```bash
# 1. 停止当前容器
docker-compose down

# 2. 拉取上一个版本的镜像
docker pull ghcr.io/owner/repo:<previous-tag>

# 3. 修改 docker-compose.yml 使用旧镜像
# image: ghcr.io/owner/repo:<previous-tag>

# 4. 重启服务
docker-compose up -d
```

### 场景 2: 手动回滚

**步骤**:
1. 在 GHCR 找到之前的镜像标签
2. 执行上述回滚步骤
3. 验证服务正常

### 场景 3: 数据回滚

**恢复备份**:
```bash
# 1. 停止容器
docker-compose down

# 2. 恢复配置备份
rm -rf config
cp -r config.backup.20251231 config

# 3. 重启容器
docker-compose up -d
```

## Future Considerations

### 短期改进

1. **镜像扫描**: 集成 Trivy 扫描漏洞
2. **日志聚合**: 使用 ELK 或 Loki 收集日志
3. **指标收集**: 使用 Prometheus 收集指标

### 长期规划

1. **服务网格**: 如果增加更多服务,考虑使用 Docker Swarm 或 Kubernetes
2. **自动扩缩容**: 根据负载自动调整容器数量
3. **蓝绿部署**: 实现零停机更新
4. **多环境支持**: 开发、测试、生产环境配置分离

### 替代方案评估

| 方案 | 当前评估 | 未来考虑 |
|------|----------|----------|
| Docker Compose | ✅ 适合单机 | 保持在用 |
| Docker Swarm | ❌ 过度复杂 | 如需多机可考虑 |
| Kubernetes | ❌ 严重过度 | 企业级可考虑 |
| Nomad | ❌ 学习成本高 | 无计划 |

## References

- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [GitHub Actions Docker Build](https://docs.github.com/en/actions/guides/building-and-testing-nodejs)
- [JavaScript Obfuscator Documentation](https://github.com/javascript-obfuscator/javascript-obfuscator)
- [Puppeteer Docker Configuration](https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-in-docker)
