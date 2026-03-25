const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const axios = require('axios');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

// Import URL constructor utilities
const { AnimeListUrlConstructor, ApiParameterValidator } = require('./urlConstructor');
// Import enhanced HTTP client with rate limiting and retry logic
const { httpClient, getEnhancedHeaders } = require('./httpClient');
// Import anime index manager for local search
const { getAnimeIndexManager } = require('./animeIndexManager');
const { attachAuthUser, AuthManager } = require('./AuthManager');
const { AdminManager } = require('./AdminManager');

// 尝试引入Puppeteer
let puppeteer;
try {
    puppeteer = require('puppeteer');
    console.log('✅ Puppeteer已加载');
} catch (e) {
    console.log('⚠️ Puppeteer未安装，使用备用方案');
    console.log('安装方法: npm install puppeteer');
}

// 浏览器实例池管理
class BrowserPool {
    constructor() {
        this.browser = null;
        this.isLaunching = false;
        this.launchPromise = null;
    }

    async getBrowser() {
        // 如果浏览器已经存在，直接返回
        if (this.browser) {
            return this.browser;
        }

        // 如果正在启动，等待启动完成
        if (this.isLaunching) {
            return this.launchPromise;
        }

        // 启动新浏览器
        this.isLaunching = true;
        this.launchPromise = this._launchBrowser();

        try {
            this.browser = await this.launchPromise;
            return this.browser;
        } finally {
            this.isLaunching = false;
            this.launchPromise = null;
        }
    }

    async _launchBrowser() {
        try {
            console.log('🚀 启动浏览器实例...');
            const browser = await puppeteer.launch({
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });

            // 监听浏览器关闭事件
            browser.on('disconnected', () => {
                console.log('🔌 浏览器已断开连接');
                this.browser = null;
            });

            console.log('✅ 浏览器实例已启动');
            return browser;
        } catch (error) {
            console.error('❌ 启动浏览器失败:', error.message);
            this.isLaunching = false;
            throw error;
        }
    }

    async close() {
        if (this.browser) {
            try {
                await this.browser.close();
                console.log('✅ 浏览器实例已关闭');
            } catch (error) {
                console.error('❌ 关闭浏览器失败:', error.message);
            }
            this.browser = null;
        }
    }
}

// 创建全局浏览器池
const browserPool = puppeteer ? new BrowserPool() : null;

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.BACKEND_PORT || process.env.PORT || 3006;
const FRONTEND_PORT = process.env.FRONTEND_PORT || 3000;
const allowedOrigins = [
    `http://localhost:${FRONTEND_PORT}`,
    `http://127.0.0.1:${FRONTEND_PORT}`,
    'http://localhost:5173',
    'http://127.0.0.1:5173'
];

const { WatchHistoryManager, migrateOldDataFile, ensureConfigDirectory } = require('./WatchHistoryManager');

// 安全中间件
app.use(helmet({
    contentSecurityPolicy: false // 允许加载外部视频资源
}));

// CORS配置
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// 解析JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(attachAuthUser);

// 静态文件服务
// 优先使用新的Vue前端 (dist/)，如果不存在则使用旧的Bootstrap前端 (public/)
const distPath = path.join(__dirname, '..', 'dist');
const publicPath = path.join(__dirname, '..', 'public');

// 检查dist目录是否存在
const useVueFrontend = fsSync.existsSync(distPath);

if (useVueFrontend) {
    console.log('✅ 使用Vue前端 (dist/)');
    // 服务Vue前端静态文件
    app.use(express.static(distPath));
    // 同时也服务public目录的静态文件（用于占位符SVG等）
    app.use('/placeholder', express.static(publicPath));
} else {
    console.log('⚠️ dist/目录不存在，使用旧版Bootstrap前端 (public/)');
    // 服务旧版前端静态文件
    app.use(express.static(publicPath));
}

// 日志中间件
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// 主页路由
app.get('/', (req, res) => {
    const indexPath = useVueFrontend
        ? path.join(distPath, 'index.html')
        : path.join(publicPath, 'index.html');
    res.sendFile(indexPath);
});

const systemRoutes = require('./routes/system');
const animeRoutes = require('./routes/anime');
const videoRoutes = require('./routes/video');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
app.use('/', systemRoutes);
app.use('/', animeRoutes);
app.use('/', videoRoutes);
app.use('/', authRoutes);
app.use('/', adminRoutes);
const historyRoutes = require('./routes/history');
app.use('/', historyRoutes);

// SPA fallback for Vue Router history mode
// 处理所有非API路由，返回index.html以支持前端路由
// 必须放在所有API路由之后，错误处理之前
app.use((req, res, next) => {
    // 如果请求的是API路由或静态文件（有扩展名），则跳过
    if (req.path.startsWith('/api/') || req.path.includes('.')) {
        return next();
    }

    const indexPath = useVueFrontend
        ? path.join(distPath, 'index.html')
        : path.join(publicPath, 'index.html');
    res.sendFile(indexPath);
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('服务器错误:', error);
    res.status(500).json({
        success: false,
        error: '内部服务器错误'
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: '接口不存在'
    });
});

// 启动服务器
const server = app.listen(PORT, async () => {
    // ============================================================
    // Data Storage Initialization
    // ============================================================

    // Migrate data from legacy location if needed
    console.log(`📦 Checking for legacy data migration...`);
    await migrateOldDataFile();

    // Ensure config directory exists
    await ensureConfigDirectory();

    // Validate and initialize data files
    console.log(`🔍 Validating watch history data file...`);
    await WatchHistoryManager.loadHistory();
    AdminManager.ensureDefaultSettings();
    await AuthManager.ensureSuperAdminFromEnv();
    AuthManager.clearExpiredSessions();
    console.log(`✅ Data storage initialization complete`);

    // ============================================================
    // Anime Index Initialization
    // ============================================================

    console.log(`📊 Initializing anime index...`);
    const indexManager = getAnimeIndexManager();
    await indexManager.initialize();

    const indexStats = indexManager.getIndexStats();
    // Only build if index is empty AND not already building
    if (indexStats.totalAnime === 0 && !indexStats.isBuilding) {
        console.log(`📋 Index is empty, starting initial build...`);
        console.log(`⏳ This will take a few minutes, please wait...`);
        // Build in background to not block server startup
        indexManager.buildInitialIndex().catch(error => {
            console.error(`❌ Initial index build failed: ${error.message}`);
        });
    } else if (indexStats.isBuilding) {
        console.log(`⏳ Index build already in progress from previous run...`);
    } else {
        console.log(`✅ Anime index ready: ${indexStats.totalAnime} entries`);
        console.log(`   Last updated: ${indexStats.lastUpdated || 'never'}`);
    }

    // 验证必要的导入
    const requiredModules = {
        express: typeof express !== 'undefined',
        axios: typeof axios !== 'undefined',
        getEnhancedHeaders: typeof getEnhancedHeaders === 'function'
    };

    const missingModules = Object.entries(requiredModules)
        .filter(([_, isAvailable]) => !isAvailable)
        .map(([name]) => name);

    if (missingModules.length > 0) {
        console.error('❌ 缺少必要的模块或函数:', missingModules.join(', '));
        console.error('请检查server.js中的import语句。');
        process.exit(1);
    }

    console.log(`✅ 所有必要的模块已加载`);
    console.log(`🚀 Cycani代理服务器启动成功!`);
    console.log(`📱 服务地址: http://localhost:${PORT}`);
    console.log(`🔧 开发模式: ${process.env.NODE_ENV || 'production'}`);
    console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
});

// 优雅关闭处理
process.on('SIGINT', async () => {
    console.log('\n🛑 收到 SIGINT 信号，正在关闭服务器...');
    await shutdown();
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 收到 SIGTERM 信号，正在关闭服务器...');
    await shutdown();
});

async function shutdown() {
    try {
        // 关闭浏览器池
        if (browserPool) {
            await browserPool.close();
        }

        // 关闭服务器
        server.close(() => {
            console.log('✅ 服务器已关闭');
            process.exit(0);
        });

        // 强制退出（如果 10 秒内没有关闭）
        setTimeout(() => {
            console.log('⚠️ 强制退出');
            process.exit(1);
        }, 10000);
    } catch (error) {
        console.error('❌ 关闭服务器时出错:', error.message);
        process.exit(1);
    }
}

module.exports = app;
