# 项目现状总览

本文档用于沉淀当前仓库的整体理解，方便后续继续开发、排查和重构。

## 1. 项目定位

这是一个面向 `cycani.org` 的本地代理与播放项目，核心目标是：

- 抓取动画列表、详情和播放页
- 解析实际视频地址
- 提供本地可控的前端界面
- 保存观看历史和断点续播信息

当前仓库已经从旧的 `cycani-proxy/` 单目录结构，迁移到根目录统一管理的双应用结构：

- `backend/`: Express 抓取与 API 服务
- `frontend/`: Vue 3 + Vite 单页应用

## 2. 当前目录结构

### 根目录

- `package.json`: 统一调度前后端开发和构建脚本
- `.nvmrc`: 指定 Node 版本为 `24.14.0`
- `config/`: 本地持久化数据
- `dist/`: 前端构建产物，由后端在生产模式下直接托管
- `docs/`: 项目说明文档
- `scripts/`: 辅助脚本

### 后端

- `backend/src/server.js`: Express 主入口
- `backend/src/routes/anime.js`: 动画列表、详情、搜索、周表、索引状态
- `backend/src/routes/video.js`: 剧集播放地址解析、视频 URL 刷新、流代理
- `backend/src/routes/history.js`: 观看历史和断点 API
- `backend/src/routes/system.js`: 健康检查、图片代理、占位图
- `backend/src/WatchHistoryManager.js`: 历史记录 JSON 读写、备份和恢复
- `backend/src/animeIndexManager.js`: 本地动画索引构建与搜索
- `backend/src/httpClient.js`: 抓取请求封装，带限流、重试和 UA 伪装

### 前端

- `frontend/src/main.ts`: Vue 应用入口
- `frontend/src/router/index.ts`: 路由配置
- `frontend/src/views/HomeView.vue`: 首页，含继续观看、周表、筛选、列表
- `frontend/src/views/WatchView.vue`: 播放页，含 Plyr 播放器、断点续播、URL 自动刷新
- `frontend/src/views/HistoryView.vue`: 历史记录页
- `frontend/src/stores/`: Pinia 状态管理
- `frontend/src/services/`: 前后端 API 通信层

## 3. 运行方式

### 本地开发

要求：

- Node `24.14.0`
- 建议使用 `nvm use`

常用命令：

```bash
nvm use
npm run dev
```

默认端口：

- 前端开发服务: `http://localhost:3000`
- 后端服务: `http://localhost:3006`
- 根目录 `npm run dev` 现在支持 `--backend` / `--frontend` 参数，也支持通过根目录 `.env.local` 固定本机开发端口，无需改源码文件。
- 如果默认端口或你指定的起始端口已被占用，根脚本会自动递增到下一个可用端口，并把最终前后端端口打印出来。

前端通过 Vite 代理 `/api` 到后端。

## 4. 数据存储方式

项目当前不使用数据库，主要依赖本地 JSON 文件：

- `config/watch-history.json`: 观看历史与最后播放位置
- `config/anime-index.json`: 本地动画索引

后端对历史文件做了几层保护：

- 自动创建目录
- 写入前备份
- JSON 损坏时回退默认结构
- 尝试从旧位置迁移数据

## 5. 前后端主链路

### 首页链路

1. 前端进入首页
2. 调用 `/api/anime-list`
3. 后端抓取 `cycani.org` 列表页并解析
4. 返回动画卡片数据
5. 同时前端加载继续观看与每周时间表

### 播放页链路

1. 前端进入 `/watch/:animeId`
2. 调用 `/api/episode/:animeId/:season/:episode`
3. 后端抓取播放页并解析 `player_aaaa`
4. 解出播放器参数
5. 通过 Puppeteer 或备用 HTTP 方式尝试拿到真实视频地址
6. 前端用 Plyr 播放，并定时或事件驱动保存进度

### 历史记录链路

1. 前端播放时调用 `/api/watch-history`
2. 后端更新 `watch-history.json`
3. 前端历史页从后端读取，同时合并 localStorage 中尚未同步的数据

## 6. 当前迁移状态判断

仓库目前处于“重构进行中，但尚未收尾”的状态。

已经完成的部分：

- 主目录拆分为 `backend/` 和 `frontend/`
- 根目录具备统一启动脚本
- 前端已经完全切换到 Vue 3 SPA
- 后端已经按路由拆分
- 本地持久化从旧数据位置逐步迁到 `config/`

仍然存在的迁移遗留：

- 一些文档仍在引用旧的 `cycani-proxy/` 路径
- 部分逻辑仍保留 `public/` fallback 思路，但当前新结构里相关资源并不完整
- 一些前端组件仍引用旧 placeholder 静态资源路径
- Puppeteer 相关代码存在重复实现和导出不一致的情况

## 7. 当前已知风险点

### 1. 文档和代码不完全一致

README、CLAUDE 以及部分前端历史文档仍有旧结构描述，不能完全作为真实结构依据。

### 2. 旧静态资源 fallback 可能失效

后端仍尝试托管 `public/`，但当前 `backend/public` 不存在，相关占位资源路径需要后续统一。

### 3. Puppeteer 代码尚未彻底收敛

`server.js` 和 `puppeteerPool.js` 都有浏览器池逻辑，`video.js` 的导入也存在不一致，后续适合做一次整合。

### 4. 本地环境必须使用新 Node 版本

当前前端构建链路已经基于新版本 Vite，Node 16 会直接失败。仓库应统一使用 `24.14.0`。

## 8. 后续建议

建议按下面顺序继续收尾：

1. 先统一旧路径与文档引用
2. 再清理 `public/` fallback 和 placeholder 资源问题
3. 收敛 Puppeteer 与视频解析模块
4. 最后在 Node `24.14.0` 环境下跑完整联调

## 9. 相关文档

- [docs/project-overview.md](/Users/wuzhao/Program/Github/Anime/docs/project-overview.md): 当前项目现状
- [docs/video-parsing-flow.md](/Users/wuzhao/Program/Github/Anime/docs/video-parsing-flow.md): 视频解析链路说明
