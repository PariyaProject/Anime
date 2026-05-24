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
- `backend/src/plugins/`: 存放各种视频源爬虫插件 (如 cycani)
- `backend/scripts/scraping-tests/`: 专门存放用于独立调试爬虫逻辑、解析规则的线下/线上测试脚本
- `backend/src/routes/anime.js`: 动画列表、详情、搜索、周表、索引状态
- `backend/src/routes/video.js`: 剧集播放地址解析、视频 URL 刷新、流代理
- `backend/src/routes/history.js`: 观看历史和断点 API
- `backend/src/routes/system.js`: 健康检查、图片代理、占位图
- `backend/src/AppDatabase.js`: 历史记录、进度、插件隔离等数据的 SQLite 数据库核心
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

项目已经从纯本地 JSON 文件成功迁移至 **SQLite 数据库 (`backend/data/app.db`)**。

- **`watch_progress` (观看历史与进度)**: 核心表。新增了 `source_id` 字段，实现了不同视频源插件的历史记录彻底隔离，防止视频 ID 冲突。
- **`users` / `sessions` / `invite_codes`**: 用户鉴权与管理相关表。
- **本地 JSON 遗留**: 
  - `config/anime-index.json`: 仍然用于本地动漫索引的搜索缓存。
  - `config/watch-history.json`: 作为向前兼容和备份机制，仍然保留了 JSON 的读写双活设计，但主数据流已转向 SQLite。

后端对历史文件做了几层保护：

- 自动创建目录
- 写入前备份
- JSON 损坏时回退默认结构
- 尝试从旧位置迁移数据

## 5. 多源插件化架构 (Plugin Architecture)

项目已全面升级为多源插件化系统。原先硬编码在主程序的 `cycani.org` 爬虫逻辑已被彻底抽离为独立的插件。

### 核心机制

1. **PluginManager**: 位于 `backend/src/plugins/PluginManager.js`，负责扫描、加载和生命周期管理。所有插件必须继承自 `BasePlugin`。
2. **前端低代码动态渲染**: 前端首页 (`HomeView.vue`) 不再写死组件，而是根据当前激活插件暴露的 `manifest` (例如 `uiLayout.home`) 动态按需组装组件（如 `HeroBanner`, `WeeklyScheduleWidget`, `FilterableGrid` 等）。
3. **全局自动路由**: 前端通过顶部的 `SourceSelector` 切换视频源，状态持久化在 `plugin.store.ts`。所有发送往后端的 API 请求会自动携带 `?source=xxx`（GET）或 `sourceId: xxx`（POST/PUT），由后端自动分发给对应的插件实例处理。
4. **跨站无缝追番**: 在全局“继续观看”历史中，系统会自动读取历史记录归属的 `source_id`，点击播放时能够自动完成视频源回切，实现跨站无缝续播。

## 6. 前后端主链路

### 首页链路

1. 前端进入首页，`plugin.store` 初始化当前激活的插件 (默认 `cycani`)。
2. 获取该插件的 `manifest.uiLayout`，得知需要渲染哪些模块。
3. 组件各自发送请求 (如 `/api/anime-list?source=cycani` 或 `/api/weekly-schedule?source=cycani`)。
4. 后端 `PluginManager` 将请求分发给对应的插件，插件执行抓取和解析。
5. 返回标准化数据给前端完成动态渲染。

### 播放页链路

1. 前端进入 `/watch/:animeId`
2. 调用 `/api/episode/:animeId/:season/:episode`
3. 后端优先检查该集是否已有未临近过期的真实视频链接缓存
4. 未命中时抓取播放页并解析 `player_aaaa`
5. 解出加密视频 ID，并通过 Puppeteer 或备用 HTTP 方式尝试拿到真实视频地址
6. 后端返回精简后的播放字段，以及链接缓存命中状态和过期时间元数据
7. 前端用 Plyr 播放，并定时或事件驱动保存进度

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
## 9. 测试与调试规范 (Testing & Debugging)

由于项目中包含了多种爬虫（插件），如果直接在完整的环境中调试爬取和解析逻辑会比较耗时。
为了保持主目录和核心代码的整洁：

1. **测试脚本统一存放**：任何用于临时测试页面 DOM 解析（如 Cheerio 选择器测试）、API 连通性测试的 Node 脚本，**必须**放入 `backend/scripts/scraping-tests/` 目录中。
2. **离线 Mock 测试**：如果需要反复调试某个视频源的 HTML 解析规则，请将目标网页的 HTML 源码下载并存放到 `backend/scripts/scraping-tests/`，编写离线脚本（如 `test_fallback.js`）进行极速调试。
3. **保持主目录干净**：不允许在 `backend/` 或项目根目录长期遗留 `test.js`、`patch.js` 等临时文件。
