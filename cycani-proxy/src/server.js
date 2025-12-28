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
const PORT = process.env.PORT || 3006;

// ============================================================
// Data Storage Configuration
// ============================================================

// New location for watch history data (inside application directory)
const WATCH_HISTORY_FILE = path.join(__dirname, '..', 'config', 'watch-history.json');
// Legacy location (for migration)
const LEGACY_WATCH_HISTORY_FILE = path.join(__dirname, '..', '..', 'data', 'proxy', 'watch-history.json');

// ============================================================
// Data Storage Resilience Helper Functions
// ============================================================

/**
 * Ensures the config directory exists for storing data files
 * Creates the directory if it's missing, never throws errors
 */
async function ensureConfigDirectory() {
    try {
        const configDir = path.dirname(WATCH_HISTORY_FILE);
        await fs.mkdir(configDir, { recursive: true });
        console.log(`✅ Config directory ensured: ${configDir}`);
        return true;
    } catch (error) {
        // Log but don't throw - server should continue even if directory creation fails
        console.error(`⚠️ Failed to create config directory: ${error.message}`);
        return false;
    }
}

/**
 * Creates a backup of the data file before any write operation
 * @param {string} filePath - Path to the file to backup
 */
async function createBackup(filePath) {
    try {
        // Check if file exists before backing up
        await fs.access(filePath);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${filePath}.backup.${timestamp}`;
        await fs.copyFile(filePath, backupPath);
        console.log(`📦 Backup created: ${backupPath}`);

        // Clean up old backups (keep only the 5 most recent)
        const dir = path.dirname(filePath);
        const files = await fs.readdir(dir);
        const backups = files
            .filter(f => f.startsWith(path.basename(filePath)) && f.includes('.backup.'))
            .sort()
            .reverse();

        if (backups.length > 5) {
            for (const oldBackup of backups.slice(5)) {
                try {
                    await fs.unlink(path.join(dir, oldBackup));
                    console.log(`🗑️ Cleaned up old backup: ${oldBackup}`);
                } catch (e) {
                    // Ignore cleanup errors
                }
            }
        }
    } catch (error) {
        if (error.code !== 'ENOENT') {
            // ENOENT means file doesn't exist, which is fine for new files
            console.warn(`⚠️ Backup creation failed: ${error.message}`);
        }
    }
}

/**
 * Validates and recovers corrupted data files
 * - Creates a backup of corrupted files
 * - Returns a default empty structure when recovery fails
 * - Logs all recovery actions for debugging
 * @param {string} filePath - Path to the data file
 * @param {object} defaultStructure - Default structure to return on failure
 * @returns {object} Parsed data or default structure
 */
async function validateAndRecoverDataFile(filePath, defaultStructure) {
    try {
        // Check if file exists
        await fs.access(filePath);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`📄 Data file not found, will use default structure: ${filePath}`);
            return defaultStructure;
        }
        console.error(`❌ Error accessing data file: ${error.message}`);
        return defaultStructure;
    }

    try {
        // Read file content
        const content = await fs.readFile(filePath, 'utf8');

        // Validate JSON structure
        let data;
        try {
            data = JSON.parse(content);
        } catch (parseError) {
            console.error(`❌ Invalid JSON in data file: ${filePath}`);
            // Create backup of corrupted file
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const corruptedBackup = `${filePath}.corrupted.${timestamp}`;
            await fs.copyFile(filePath, corruptedBackup);
            console.log(`📦 Corrupted file backed up to: ${corruptedBackup}`);
            return defaultStructure;
        }

        // Validate data structure (basic validation)
        if (!data || typeof data !== 'object') {
            throw new Error('Data is not an object');
        }

        // If we have a default key like 'default', validate it exists
        if (defaultStructure.default && !data.default) {
            throw new Error('Missing default user data');
        }

        console.log(`✅ Data file validated successfully: ${filePath}`);
        return data;
    } catch (error) {
        console.error(`❌ Data file validation failed: ${error.message}`);
        // Return default structure on any error
        return defaultStructure;
    }
}

/**
 * Migrates data from legacy location to new location
 * Called once during server startup if old data file exists
 */
async function migrateOldDataFile() {
    try {
        // Check if legacy file exists
        await fs.access(LEGACY_WATCH_HISTORY_FILE);

        // Check if new file already exists
        try {
            await fs.access(WATCH_HISTORY_FILE);
            console.log(`ℹ️ New data file already exists, skipping migration`);
            return;
        } catch (e) {
            // New file doesn't exist, proceed with migration
        }

        // Ensure config directory exists
        await ensureConfigDirectory();

        // Copy the file
        await fs.copyFile(LEGACY_WATCH_HISTORY_FILE, WATCH_HISTORY_FILE);
        console.log(`📦 Migrated watch history from legacy location:`);
        console.log(`   Old: ${LEGACY_WATCH_HISTORY_FILE}`);
        console.log(`   New: ${WATCH_HISTORY_FILE}`);

        // Create a backup of the old file before deleting
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const oldBackup = `${LEGACY_WATCH_HISTORY_FILE}.migrated.${timestamp}`;
        await fs.rename(LEGACY_WATCH_HISTORY_FILE, oldBackup);
        console.log(`📦 Old file backed up to: ${oldBackup}`);

    } catch (error) {
        if (error.code === 'ENOENT') {
            // No legacy file exists, no migration needed
            console.log(`ℹ️ No legacy data file found, no migration needed`);
        } else {
            console.error(`⚠️ Data migration failed: ${error.message}`);
        }
    }
}

// Default empty structure for watch history
const DEFAULT_WATCH_HISTORY = {
    default: {
        userId: 'default',
        watchHistory: [],
        lastPositions: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
};

// 观看历史记录管理
class WatchHistoryManager {
    /**
     * Loads watch history with automatic validation and recovery
     * Handles missing files, corrupted JSON, and invalid structures gracefully
     * Server will NEVER crash due to data file issues
     */
    static async loadHistory() {
        return await validateAndRecoverDataFile(WATCH_HISTORY_FILE, DEFAULT_WATCH_HISTORY);
    }

    /**
     * Saves watch history with automatic directory creation and backup
     * Ensures data is safely persisted with proper error handling
     * @param {object} historyData - The history data to save
     * @returns {boolean} Success status
     */
    static async saveHistory(historyData) {
        try {
            // Ensure directory exists before writing
            await ensureConfigDirectory();

            // Create backup before writing
            await createBackup(WATCH_HISTORY_FILE);

            // Update timestamp and write file
            historyData.updatedAt = new Date().toISOString();
            const jsonString = JSON.stringify(historyData, null, 2);
            console.log(`[DEBUG] saveHistory: Writing to ${WATCH_HISTORY_FILE}`);
            console.log(`[DEBUG] saveHistory: File size will be ${jsonString.length} bytes`);
            await fs.writeFile(WATCH_HISTORY_FILE, jsonString, 'utf8');
            console.log(`[DEBUG] saveHistory: File written successfully`);
            return true;
        } catch (error) {
            // Log error but don't throw - server should continue
            console.error('❌ 保存观看历史失败:', error.message);
            return false;
        }
    }

    static async addToWatchHistory(animeInfo, episodeInfo, position = 0) {
        const history = await this.loadHistory();
        const userHistory = history.default;

        // 验证必要参数
        if (!animeInfo || !animeInfo.id) {
            console.error('❌ Invalid animeInfo: missing animeId', animeInfo);
            throw new Error('Invalid animeInfo: animeId is required');
        }

        if (!episodeInfo) {
            console.error('❌ Invalid episodeInfo: missing episode info', episodeInfo);
            throw new Error('Invalid episodeInfo: episode info is required');
        }

        // 将 season 和 episode 转换为字符串以确保一致性
        const season = String(episodeInfo.season);
        const episode = String(episodeInfo.episode);

        // 添加到观看历史
        const watchRecord = {
            animeId: String(animeInfo.id),
            animeTitle: animeInfo.title || '未知动画',
            animeCover: animeInfo.cover || '',
            season: season,
            episode: episode,
            episodeTitle: episodeInfo.title || `第${episode}集`,
            position: position, // 播放位置（秒）
            duration: episodeInfo.duration || 0, // 总时长（秒）
            watchDate: new Date().toISOString(),
            completed: position > 0 && (position / (episodeInfo.duration || 1)) > 0.9 // 90%以上算看完
        };

        // 检查是否已存在相同的观看记录（使用字符串比较确保类型一致）
        const existingIndex = userHistory.watchHistory.findIndex(
            record => String(record.animeId) === String(animeInfo.id) &&
                     String(record.season) === season &&
                     String(record.episode) === episode
        );

        if (existingIndex >= 0) {
            // 更新现有记录
            console.log(`📝 Updating existing watch record: ${animeInfo.id} S${season}E${episode}`);
            userHistory.watchHistory[existingIndex] = watchRecord;
        } else {
            // 添加新记录
            console.log(`➕ Adding new watch record: ${animeInfo.id} S${season}E${episode}`);
            userHistory.watchHistory.unshift(watchRecord);
        }

        // 保存播放位置（使用字符串键以确保一致性）
        const positionKey = `${animeInfo.id}_${season}_${episode}`;
        userHistory.lastPositions[positionKey] = {
            position: position,
            lastUpdated: new Date().toISOString()
        };
        console.log(`[DEBUG] Saving position for ${positionKey}: ${position}s`);

        // 限制历史记录数量（保留最近100条）
        if (userHistory.watchHistory.length > 100) {
            userHistory.watchHistory = userHistory.watchHistory.slice(0, 100);
        }

        const saved = await this.saveHistory(history);
        console.log(`[DEBUG] saveHistory returned:`, saved);
        return watchRecord;
    }

    static async getWatchHistory(limit = 20) {
        const history = await this.loadHistory();
        return history.default.watchHistory.slice(0, limit);
    }

    static async getLastPosition(animeId, season, episode) {
        const history = await this.loadHistory();

        // 将所有参数转换为字符串以确保一致性
        const positionKey = `${String(animeId)}_${String(season)}_${String(episode)}`;

        console.log(`[DEBUG] getLastPosition: ${positionKey}`);

        const positionData = history.default.lastPositions[positionKey];

        if (positionData) {
            console.log(`[DEBUG] Found position: ${positionData.position}s at ${positionData.lastUpdated}`);
            return positionData;
        } else {
            console.log(`[DEBUG] No position found for ${positionKey}, returning 0`);
            return { position: 0 };
        }
    }

    static async getContinueWatching() {
        const history = await this.loadHistory();
        const userHistory = history.default;

        // 返回完整的观看历史，包括已完成的内容
        const continueWatching = userHistory.watchHistory
            .sort((a, b) => new Date(b.watchDate) - new Date(a.watchDate))
            .slice(0, 12); // 最多显示12个

        return continueWatching;
    }
}

// 安全中间件
app.use(helmet({
    contentSecurityPolicy: false // 允许加载外部视频资源
}));

// CORS配置
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true
}));

// 解析JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Initialize URL constructor
const urlConstructor = new AnimeListUrlConstructor();

// 获取动画真实集数的辅助函数（无缓存，始终获取最新数据）
async function getAnimeEpisodeCount(animeId) {
    try {
        const detailUrl = `https://www.cycani.org/bangumi/${animeId}.html`;

        const response = await httpClient.get(detailUrl, {
            timeout: 3000 // 减少到3秒超时
        });

        const $ = cheerio.load(response.data);
        const episodes = [];

        // 解析所有集数链接
        $(`a[href*="/watch/${animeId}/"]`).each((_, element) => {
            const $episodeLink = $(element);
            const href = $episodeLink.attr('href');

            if (href) {
                const episodeMatch = href.match(new RegExp(`/watch/${animeId}/(\\d+)/(\\d+)\\.html`));
                if (episodeMatch) {
                    const season = parseInt(episodeMatch[1]);
                    const episode = parseInt(episodeMatch[2]);

                    // 避免重复
                    const exists = episodes.find(ep => ep.season === season && ep.episode === episode);
                    if (!exists) {
                        episodes.push({ season, episode });
                    }
                }
            }
        });

        if (episodes.length > 0) {
            // 计算总集数
            const seasonGroups = {};
            episodes.forEach(ep => {
                if (!seasonGroups[ep.season]) {
                    seasonGroups[ep.season] = [];
                }
                seasonGroups[ep.season].push(ep.episode);
            });

            let totalEpisodes = 0;
            const seasonCounts = [];

            Object.keys(seasonGroups).sort((a, b) => parseInt(a) - parseInt(b)).forEach(season => {
                const seasonEpisodes = seasonGroups[season];
                const maxEpisode = Math.max(...seasonEpisodes);
                seasonCounts.push(`第${season}季${maxEpisode}集`);
                totalEpisodes += maxEpisode;
            });

            const result = {
                totalEpisodes: totalEpisodes,
                episodesText: seasonCounts.join('·'),
                hasMultipleSeasons: Object.keys(seasonGroups).length > 1
            };

            return result;
        }

        return null;

    } catch (error) {
        // 快速失败，不输出过多错误日志
        return null;
    }
}

// 主页路由
app.get('/', (req, res) => {
    const indexPath = useVueFrontend
        ? path.join(distPath, 'index.html')
        : path.join(publicPath, 'index.html');
    res.sendFile(indexPath);
});

// API路由 - 轻量级健康检查端点
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// API路由 - 获取剧集信息
app.get('/api/episode/:bangumiId/:season/:episode', async (req, res) => {
    try {
        const { bangumiId, season, episode } = req.params;
        const targetUrl = `https://www.cycani.org/watch/${bangumiId}/${season}/${episode}.html`;

        console.log(`🔍 获取剧集信息: ${targetUrl}`);

        const response = await httpClient.get(targetUrl, {
            timeout: 10000
        });

        const $ = cheerio.load(response.data);

        // 解析页面中的视频信息
        const episodeData = parseEpisodeData($);

        // Store the original encrypted URL (cycani- ID) for future refresh capability
        const originalEncryptedUrl = episodeData.decryptedVideoUrl;

        // 尝试通过HTTP+AES解密获取真实的视频URL
        if (episodeData.decryptedVideoUrl) {
            console.log('🔍 尝试获取真实视频URL:', episodeData.decryptedVideoUrl);
            const realVideoUrl = await parsePlayerPage(episodeData.decryptedVideoUrl, targetUrl);
            if (realVideoUrl) {
                episodeData.realVideoUrl = realVideoUrl;
                console.log('✅ 成功获取真实视频URL:', realVideoUrl.substring(0, 100) + '...');
            } else {
                // 如果解密失败，使用播放器URL作为备用
                episodeData.realVideoUrl = `https://player.cycanime.com/?url=${episodeData.decryptedVideoUrl}`;
                console.log('⚠️ 解密失败，返回播放器URL作为备用:', episodeData.realVideoUrl);
            }
        }

        res.json({
            success: true,
            data: {
                bangumiId,
                season,
                episode,
                originalUrl: targetUrl,
                originalEncryptedUrl: originalEncryptedUrl, // Store for refresh capability
                ...episodeData
            }
        });

    } catch (error) {
        console.error('❌ 获取剧集信息失败:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API路由 - 刷新视频URL (处理过期URL)
app.get('/api/refresh-video-url/:animeId/:season/:episode', async (req, res) => {
    try {
        const { animeId, season, episode } = req.params;
        const targetUrl = `https://www.cycani.org/watch/${animeId}/${season}/${episode}.html`;

        console.log(`🔄 刷新视频URL: ${targetUrl}`);

        // Fetch fresh episode data
        const response = await httpClient.get(targetUrl, {
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const episodeData = parseEpisodeData($);

        if (!episodeData.decryptedVideoUrl) {
            throw new Error('无法找到加密视频URL');
        }

        // Get fresh real video URL using Puppeteer
        const realVideoUrl = await parsePlayerPage(episodeData.decryptedVideoUrl, targetUrl);

        if (!realVideoUrl) {
            throw new Error('无法获取刷新后的视频URL');
        }

        console.log('✅ 成功刷新视频URL:', realVideoUrl.substring(0, 100) + '...');

        res.json({
            success: true,
            data: {
                realVideoUrl: realVideoUrl,
                originalEncryptedUrl: episodeData.decryptedVideoUrl
            }
        });

    } catch (error) {
        console.error('❌ 刷新视频URL失败:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API路由 - 获取动画列表
app.get('/api/anime-list', async (req, res) => {
    try {
        // Extract and validate parameters
        const {
            page = 1,
            limit = 24,
            search = '',
            genre = '',
            year = '',
            letter = '',
            channel = 'tv',
            sort = 'time'
        } = req.query;

        // Convert page to number
        const pageNum = parseInt(page);

        // Validate parameters
        const validationErrors = ApiParameterValidator.validateAnimeListFilters({
            search, genre, year, letter, sort, page: pageNum, channel
        });

        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid parameters',
                details: validationErrors
            });
        }

        // Note: useCache parameter can be used for future opt-in caching implementation
        // Currently always fetches fresh data to support development workflow
        const useCache = req.query.useCache === 'true' || req.query.useCache === '1';

        // Construct target URL using the new URL constructor
        // NOTE: We need to handle pagination mapping
        // User requests page X with limit Y (e.g., page=4, limit=24)
        // But original website has 48 items per page
        // So we need to calculate which source page to request and extract the needed portion

        const ITEMS_PER_PAGE_ON_SOURCE = 48; // Original website has 48 items per page
        const startItem = (pageNum - 1) * limit; // Starting item index (0-based)
        const sourcePage = Math.floor(startItem / ITEMS_PER_PAGE_ON_SOURCE) + 1;
        const offsetInSourcePage = startItem % ITEMS_PER_PAGE_ON_SOURCE;

        console.log(`📊 分页映射: 用户请求第${pageNum}页(limit=${limit}), 起始项=${startItem}, 原网站第${sourcePage}页, 偏移=${offsetInSourcePage}`);

        const targetUrl = urlConstructor.construct({
            search, genre, year, letter, sort, channel, page: sourcePage
        });

        console.log(`🔍 获取动画列表: ${targetUrl}`);

        const response = await httpClient.get(targetUrl, {
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const animeList = [];

        // Parse anime list with improved selectors
        for (const element of $('.public-list-box').toArray()) {
            const $box = $(element);
            const $link = $box.find('a[href*="/bangumi/"]');
            const $img = $box.find('img');
            const $subtitle = $box.find('.public-list-subtitle');

            if ($link.length && $img.length) {
                const href = $link.attr('href');
                const animeId = href?.match(/\/bangumi\/(\d+)\.html/);

                if (animeId && animeId[1]) {
                    const title = $img.attr('alt') || $link.attr('title') || '';

                    // Process image URL - return original URLs directly for better performance
                    // Frontend will handle CORS errors with fallback to placeholder
                    let imgSrc = $img.attr('data-src') || $img.attr('src') || '';
                    if (!imgSrc || (!imgSrc.startsWith('http://') && !imgSrc.startsWith('https://'))) {
                        imgSrc = '/api/placeholder-image';
                    }

                    // Parse subtitle information for episodes and status
                    let subtitleText = $subtitle.text().trim();
                    if (!subtitleText) {
                        const alternativeSubtitles = [
                            '.public-list-subtitle',
                            '.public-list-item .subtitle',
                            '.list-subtitle',
                            '.item-subtitle',
                            '.public-list-box .subtitle',
                            '.public-list-box > div:last-child',
                            '.public-list-box span'
                        ];

                        for (const selector of alternativeSubtitles) {
                            const $altSubtitle = $box.find(selector);
                            if ($altSubtitle.length) {
                                subtitleText = $altSubtitle.text().trim();
                                if (subtitleText) break;
                            }
                        }
                    }

                    // Try to find status information in box text
                    if (!subtitleText) {
                        const boxText = $box.text();
                        if (boxText.includes('已完结')) {
                            subtitleText = '已完结';
                        } else if (boxText.includes('更新至') || boxText.includes('连载中') || boxText.includes('更新')) {
                            subtitleText = '连载中';
                        }
                    }

                    let episodes = '未知';
                    let status = '连载中';

                    if (subtitleText) {
                        const episodeMatches = subtitleText.match(/(\d+)集/);
                        if (episodeMatches) {
                            episodes = episodeMatches[1];
                        }

                        if (subtitleText.includes('已完结') || subtitleText.includes('全')) {
                            status = '已完结';
                        } else if (subtitleText.includes('更新至') || subtitleText.includes('连载中') ||
                                 subtitleText.includes('更新') || subtitleText.includes('连载')) {
                            status = '连载中';
                        }
                    }

                    // Parse rating with multiple selectors
                    let score = '7.5';
                    const scoreSelectors = [
                        '.public-list-prb i',
                        '.public-list-prb',
                        '.rating i',
                        '.rating',
                        '.score i',
                        '.score',
                        'i:contains("分")',
                        'i:contains("⭐")',
                        '.public-list-item:contains("分")'
                    ];

                    for (const selector of scoreSelectors) {
                        const $score = $box.find(selector);
                        if ($score.length) {
                            const scoreText = $score.text().trim();
                            if (scoreText) {
                                const scoreMatch = scoreText.match(/(\d+\.?\d*)/);
                                if (scoreMatch) {
                                    score = scoreMatch[1];
                                    break;
                                }
                            }
                        }
                    }

                    // Try to find score in box text if still default
                    if (score === '7.5') {
                        const boxText = $box.text();
                        const decimalMatch = boxText.match(/(\d\.\d+)/g);
                        if (decimalMatch && decimalMatch.length > 0) {
                            const possibleScore = decimalMatch.find(num => {
                                const parsed = parseFloat(num);
                                return parsed >= 0 && parsed <= 10;
                            });
                            if (possibleScore) {
                                score = possibleScore;
                            }
                        }
                    }

                    // Avoid duplicates
                    const exists = animeList.find(anime => anime.id === animeId[1]);
                    if (!exists && title) {
                        animeList.push({
                            id: animeId[1],
                            title: title,
                            cover: imgSrc,
                            url: `https://www.cycani.org${href}`,
                            type: 'TV',
                            year: '', // Will be parsed from individual anime details if needed
                            episodes: episodes,
                            status: status,
                            score: score,
                            channel: channel
                        });

                        // Debug info for first few items
                        if (animeList.length <= 3) {
                            console.log(`📺 动画 ${animeList.length}: ${title}`);
                            console.log(`   状态: ${status}, 集数: ${episodes}, 评分: ${score}`);
                            console.log(`   原始字幕信息: "${subtitleText}"`);
                        }
                    }
                }
            }
        }

        // Get pagination information
        let totalPages = 1;

        // Method 1: Look for text showing page info like "1 / 85页" or "当前1/64页"
        const pageInfoText = $('body').text();
        const pageInfoMatch = pageInfoText.match(/(?:\/|当前)(\d+)页/);
        if (pageInfoMatch) {
            totalPages = parseInt(pageInfoMatch[1]);
        }

        // Method 2: Look for pagination links (try multiple selectors)
        if (totalPages === 1) {
            const paginationSelectors = [
                '.pagelink a',
                '.pagination a',
                '[class*="page"] a',
                'a:contains("尾页")',
                'a:contains("下一页")'
            ];

            for (const selector of paginationSelectors) {
                try {
                    const $links = $(selector);
                    if ($links.length > 0) {
                        // Look for the highest page number
                        $links.each((i, link) => {
                            const text = $(link).text().trim();
                            const match = text.match(/\d+/);
                            if (match) {
                                const pageNum = parseInt(match[0]);
                                if (pageNum > totalPages) {
                                    totalPages = pageNum;
                                }
                            }

                            // Also check URL for page numbers
                            const href = $(link).attr('href');
                            if (href) {
                                const urlMatch = href.match(/\/page\/(\d+)\.html/);
                                if (urlMatch) {
                                    const pageNum = parseInt(urlMatch[1]);
                                    if (pageNum > totalPages) {
                                        totalPages = pageNum;
                                    }
                                }
                            }
                        });
                    }
                } catch (e) {
                    // Selector might be invalid, continue to next
                }
            }
        }

        console.log(`📄 网站总页数: ${totalPages} 页`);

        // Note: We no longer do client-side filtering/sorting since URLs handle this
        // But we need to extract the correct slice based on pagination mapping
        const startIndex = offsetInSourcePage; // Start from the calculated offset
        const endIndex = Math.min(startIndex + limit, animeList.length);

        // Check if we need to fetch the next page from source website
        let finalAnimeList = [];
        if (endIndex > animeList.length && sourcePage < totalPages) {
            // Need to fetch next page from source
            console.log(`📄 需要从原网站第${sourcePage + 1}页获取更多数据...`);
            try {
                const nextUrl = urlConstructor.construct({
                    search, genre, year, letter, sort, channel, page: sourcePage + 1
                });
                const nextResponse = await httpClient.get(nextUrl, {
                    timeout: 15000
                });
                const $next = cheerio.load(nextResponse.data);

                // Parse next page with same logic
                for (const element of $('.public-list-box').toArray()) {
                    const $box = $(element);
                    const $link = $box.find('a[href*="/bangumi/"]');
                    const $img = $box.find('img');

                    if ($link.length && $img.length) {
                        const href = $link.attr('href');
                        const animeId = href?.match(/\/bangumi\/(\d+)\.html/);
                        if (animeId && animeId[1]) {
                            const title = $img.attr('alt') || $link.attr('title') || '';
                            // Use original image URL directly - frontend handles CORS errors
                            let imgSrc = $img.attr('data-src') || $img.attr('src') || '';
                            if (!imgSrc || (!imgSrc.startsWith('http://') && !imgSrc.startsWith('https://'))) {
                                imgSrc = '/api/placeholder-image';
                            }

                            const exists = animeList.find(anime => anime.id === animeId[1]);
                            if (!exists && title) {
                                animeList.push({
                                    id: animeId[1],
                                    title: title,
                                    cover: imgSrc,
                                    url: `https://www.cycani.org${href}`,
                                    type: 'TV',
                                    year: '',
                                    episodes: '未知',
                                    status: '已完结',
                                    score: '5.5',
                                    channel: channel
                                });
                            }
                        }
                    }
                }
            } catch (nextError) {
                console.warn('⚠️ 无法获取下一页数据:', nextError.message);
            }
        }

        // Extract the slice we need
        finalAnimeList = animeList.slice(startIndex, startIndex + limit);

        // Calculate user-facing pagination
        const totalItems = totalPages * ITEMS_PER_PAGE_ON_SOURCE; // Approximate total
        const userTotalPages = Math.ceil(totalItems / limit); // User-facing total pages

        console.log(`✅ 解析到 ${animeList.length} 个动画，提取 ${finalAnimeList.length} 个 (offset ${startIndex})`);

        const responseData = {
            animeList: finalAnimeList,
            currentPage: pageNum,
            totalPages: userTotalPages,
            totalCount: totalItems,
            filters: {
                search,
                genre,
                year,
                letter,
                sort,
                channel
            }
        };

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('❌ 获取动画列表失败:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 图片代理路由
app.get('/api/image-proxy', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).send('Missing URL parameter');
        }

        // 如果URL无效，返回占位符图片
        if (!url || url.includes('data:image')) {
            return res.redirect('/api/placeholder-image');
        }

        console.log(`🖼️ 代理图片: ${decodeURIComponent(url).substring(0, 100)}...`);

        const response = await httpClient.get(url, {
            timeout: 10000,
            responseType: 'arraybuffer',
            skipRetry: true // 图片加载失败不重试，直接用占位符
        });

        // 设置正确的Content-Type
        const contentType = response.headers['content-type'] || 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 缓存一天

        // CORS headers - allow cross-origin requests
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', '*');

        // Cross-Origin headers to fix ERR_BLOCKED_BY_RESPONSE.NotSameOrigin
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

        res.send(response.data);

    } catch (error) {
        console.error('❌ 图片代理失败:', error.message);
        // 如果代理失败，返回本地占位符图片（不使用外部服务）
        res.redirect('/api/placeholder-image');
    }
});

// 占位符图片路由
app.get('/api/placeholder-image', (req, res) => {
    // 生成一个简单的SVG占位符
    const svg = `
        <svg width="200" height="280" xmlns="http://www.w3.org/2000/svg">
            <rect width="200" height="280" fill="#f8f9fa"/>
            <text x="100" y="140" text-anchor="middle" font-family="Arial" font-size="14" fill="#6c757d">
                无封面
            </text>
        </svg>
    `;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    // CORS headers - allow cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', '*');

    // Cross-Origin headers to fix ERR_BLOCKED_BY_RESPONSE.NotSameOrigin
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

    res.send(svg);
});

// 观看历史API路由
app.post('/api/watch-history', async (req, res) => {
    try {
        const { animeInfo, episodeInfo, position = 0 } = req.body;

        if (!animeInfo || !episodeInfo) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数'
            });
        }

        const watchRecord = await WatchHistoryManager.addToWatchHistory(
            animeInfo,
            episodeInfo,
            position
        );

        res.json({
            success: true,
            data: watchRecord,
            message: '观看历史已记录'
        });

    } catch (error) {
        console.error('记录观看历史失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/watch-history', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        const history = await WatchHistoryManager.getWatchHistory(parseInt(limit));

        res.json({
            success: true,
            data: history
        });

    } catch (error) {
        console.error('获取观看历史失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/continue-watching', async (req, res) => {
    try {
        const continueWatching = await WatchHistoryManager.getContinueWatching();

        res.json({
            success: true,
            data: continueWatching
        });

    } catch (error) {
        console.error('获取继续观看内容失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/last-position/:animeId/:season/:episode', async (req, res) => {
    try {
        const { animeId, season, episode } = req.params;
        const position = await WatchHistoryManager.getLastPosition(
            animeId,
            parseInt(season),
            parseInt(episode)
        );

        res.json({
            success: true,
            data: position
        });

    } catch (error) {
        console.error('获取上次观看位置失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API路由 - 每周番剧时间表
app.get('/api/weekly-schedule', async (req, res) => {
    try {
        const { day = 'all', refresh } = req.query; // day: 'monday', 'tuesday', ..., 'all', refresh: legacy parameter

        // Note: useCache parameter can be used for future opt-in caching implementation
        // Currently always fetches fresh data to support development workflow
        const useCache = req.query.useCache === 'true' || req.query.useCache === '1';

        // Keep refresh parameter for legacy compatibility
        if (refresh === 'true' || refresh === '1') {
            console.log(`🔄 强制刷新每周时间表: ${day}`);
        } else {
            console.log(`🔍 获取每周番剧时间表: ${day}`);
        }

        // Scrape homepage for weekly schedule
        console.log(`📅 开始抓取每周时间表数据...`);
        const scheduleData = await scrapeWeeklySchedule(day);
        console.log(`📅 抓取完成，数据长度: ${JSON.stringify(scheduleData).length}`);

        const responseData = {
            schedule: scheduleData,
            updated: new Date().toISOString(),
            filter: day
        };

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('❌ 获取每周番剧时间表失败:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 每周时间表解析函数
async function scrapeWeeklySchedule(dayFilter = 'all') {
    const scheduleData = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
    };

    try {
        // Try to get schedule from dedicated weekly page first
        const weeklyUrl = 'https://www.cycani.org/index.php/label/weekday.html';

        try {
            const response = await httpClient.get(weeklyUrl, {
                timeout: 10000
            });

            const $ = cheerio.load(response.data);

            // Parse weekly schedule from the page
            // Look for content that might contain daily schedules
            $('.content, .schedule, .weekday, .daily, .main, .container').each((_, element) => {
                const $section = $(element);
                const text = $section.text().trim();

                // Try to identify day patterns and extract anime info
                const dayPatterns = [
                    { day: 'monday', pattern: /周一|星期一|Monday/i },
                    { day: 'tuesday', pattern: /周二|星期二|Tuesday/i },
                    { day: 'wednesday', pattern: /周三|星期三|Wednesday/i },
                    { day: 'thursday', pattern: /周四|星期四|Thursday/i },
                    { day: 'friday', pattern: /周五|星期五|Friday/i },
                    { day: 'saturday', pattern: /周六|星期六|Saturday/i },
                    { day: 'sunday', pattern: /周日|星期日|Sunday/i }
                ];

                for (const { day, pattern } of dayPatterns) {
                    if (pattern.test(text)) {
                        // Extract anime information for this day
                        // Look for both /bangumi/ and /watch/ links
                        const $animeLinks = $section.find('a[href*="/bangumi/"], a[href*="/watch/"]');
                        $animeLinks.each((_, link) => {
                            const $link = $(link);
                            const href = $link.attr('href');
                            const title = $link.text().trim() || $link.attr('title') || '';

                            // Skip if no meaningful title
                            if (!title || title.length < 2) return;

                            // Extract anime ID from different URL patterns
                            let animeId = null;
                            if (href?.includes('/bangumi/')) {
                                const match = href.match(/\/bangumi\/(\d+)\.html/);
                                if (match) animeId = match[1];
                            } else if (href?.includes('/watch/')) {
                                const match = href.match(/\/watch\/(\d+)\/\d+\/\d+\.html/);
                                if (match) animeId = match[1];
                            }

                            if (animeId) {
                                // Try to extract additional info like broadcast time
                                const $parent = $link.closest('div, li, span, p');
                                const parentText = $parent.text().trim();

                                // Extract broadcast time pattern (e.g., "11|周一24:05后")
                                const timeMatch = parentText.match(/(\d+\|[^|\s]+)/);
                                const broadcastTime = timeMatch ? timeMatch[1] : '';

                                // Extract rating pattern (look for numbers like 6.5, 4.0, etc.)
                                const ratingMatch = parentText.match(/(\d\.\d)/);
                                const rating = ratingMatch ? ratingMatch[1] : '';

                                // Check if completed
                                const isCompleted = parentText.includes('已完结') || parentText.includes('完结');

                                // Construct proper URL for the anime details page
                                const detailUrl = href.includes('/bangumi/') ?
                                    `https://www.cycani.org${href}` :
                                    `https://www.cycani.org/bangumi/${animeId}.html`;

                                scheduleData[day].push({
                                    id: animeId,
                                    title: title,
                                    cover: '', // Will be filled later if needed
                                    rating: rating,
                                    status: isCompleted ? '已完结' : '连载中',
                                    broadcastTime: broadcastTime,
                                    url: detailUrl,
                                    watchUrl: href.includes('/watch/') ? `https://www.cycani.org${href}` : null,
                                    day: day
                                });
                            }
                        });
                    }
                }
            });
        } catch (weeklyError) {
            console.log('⚠️ 无法获取专用每周时间表页面，尝试首页:', weeklyError.message);
        }

        // If weekly page doesn't work, try homepage with week-module-X divs
        if (Object.values(scheduleData).every(dayList => dayList.length === 0)) {
            try {
                const homeResponse = await httpClient.get('https://www.cycani.org/', {
                    timeout: 10000
                });

                const $ = cheerio.load(homeResponse.data);

                // Map week-module-X divs to days
                const dayMapping = {
                    1: 'monday',
                    2: 'tuesday',
                    3: 'wednesday',
                    4: 'thursday',
                    5: 'friday',
                    6: 'saturday',
                    7: 'sunday'
                };

                // Iterate through each week-module-X div
                for (let i = 1; i <= 7; i++) {
                    const $module = $(`#week-module-${i}`);
                    if ($module.length === 0) continue;

                    const dayKey = dayMapping[i];
                    if (!dayKey) continue;

                    // Extract anime info from each module (only primary links with images)
                    $module.find('a.public-list-exp[href*="/bangumi/"]').each((_, link) => {
                        const $link = $(link);
                        const href = $link.attr('href');
                        const match = href?.match(/\/bangumi\/(\d+)\.html/);

                        if (match && match[1]) {
                            const animeId = match[1];
                            const title = $link.attr('title') || '';

                            if (!title) return;

                            // Get parent element to extract additional info
                            const $parent = $link.closest('.public-list-box');

                            // Extract rating
                            const ratingText = $parent.find('.public-list-prb').text().trim() || '';

                            // Extract broadcast time from subtitle (in public-list-button sibling)
                            const subtitleText = $parent.find('.public-list-subtitle').text().trim() || '';

                            // Check if completed
                            const isCompleted = subtitleText.includes('已完结') || subtitleText.includes('完结');

                            // Extract cover image from data-src attribute
                            let cover = '';
                            const $img = $link.find('img[data-src], img[src]').first();
                            if ($img.length) {
                                cover = $img.attr('data-src') || $img.attr('src') || '';
                            }

                            scheduleData[dayKey].push({
                                id: animeId,
                                title: title,
                                cover: cover,
                                rating: ratingText,
                                status: isCompleted ? '已完结' : '连载中',
                                broadcastTime: subtitleText,
                                url: `https://www.cycani.org${href}`,
                                watchUrl: null,
                                day: dayKey
                            });
                        }
                    });
                }

                console.log(`✅ 从首页解析到数据:`, Object.entries(scheduleData).map(([day, animes]) => `${day}: ${animes.length}个`).join(', '));

            } catch (homeError) {
                console.log('⚠️ 首页解析也失败，返回空时间表:', homeError.message);
            }
        }

        console.log(`📅 解析到每周时间表:`, Object.entries(scheduleData).map(([day, animes]) => `${day}: ${animes.length}个`).join(', '));

        // Apply day filter if specified
        if (dayFilter !== 'all' && scheduleData[dayFilter]) {
            return { [dayFilter]: scheduleData[dayFilter] };
        }

        return scheduleData;

    } catch (error) {
        console.error('解析每周时间表失败:', error);
        return scheduleData;
    }
}

// API路由 - 搜索动画
app.get('/api/search-anime', async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.json({
                success: true,
                data: {
                    animeList: [],
                    message: '搜索关键词至少需要2个字符'
                }
            });
        }

        console.log(`🔍 搜索动画: ${q}`);

        // 使用搜索接口
        const searchUrl = `https://www.cycani.org/search?wd=${encodeURIComponent(q)}`;
        const response = await httpClient.get(searchUrl, {
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const searchResults = [];

        // 解析搜索结果
        $('.lp-pic-list > li, .search-result .item').each((_, element) => {
            const $item = $(element);
            const $link = $item.find('a').first();
            const $img = $item.find('img').first();

            if ($link.length) {
                const href = $link.attr('href');
                const title = $img.attr('alt') || $link.text().trim() || '';
                const imgSrc = $img.attr('src') || '';
                const animeId = href ? href.match(/\/bangumi\/(\d+)\.html/) : null;

                if (animeId && animeId[1] && title) {
                    searchResults.push({
                        id: animeId[1],
                        title: title,
                        cover: imgSrc.startsWith('http') ? imgSrc : `https://www.cycani.org${imgSrc}`,
                        url: `https://www.cycani.org${href}`
                    });
                }
            }
        });

        console.log(`✅ 搜索到 ${searchResults.length} 个结果`);

        res.json({
            success: true,
            data: {
                animeList: searchResults,
                searchQuery: q,
                totalCount: searchResults.length
            }
        });

    } catch (error) {
        console.error('❌ 搜索动画失败:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API路由 - 获取动画详情
app.get('/api/anime/:animeId', async (req, res) => {
    try {
        const { animeId } = req.params;
        const detailUrl = `https://www.cycani.org/bangumi/${animeId}.html`;

        console.log(`🔍 获取动画详情: ${detailUrl}`);

        const response = await httpClient.get(detailUrl, {
            timeout: 15000
        });

        const $ = cheerio.load(response.data);

        // 调试输出 - 检查HTML结构
        console.log(`🔍 调试信息 - 页面标题: ${$('title').text().trim()}`);
        console.log(`🔍 调试信息 - 第一个h1: ${$('h1').first().text().trim()}`);
        console.log(`🔍 调试信息 - 所有h1文本: ${$('h1').map((_, el) => $(el).text().trim()).get().join(' | ')}`);

        // 解析动画详情 - 使用5步策略提取标题
        let title = '';
        let strategyUsed = 0;

        // 策略1: 尝试从页面标题获取 - 通用正则表达式解析
        // 支持两种格式:
        // - 播放页面: 不擅吸血的吸血鬼_第01集_TV番组 - 次元城动画 - 海量蓝光番剧免费看！
        // - 详情页面: 不擅吸血的吸血鬼_TV番组 - 次元城动画 - 海量蓝光番剧免费看！
        const pageTitle = $('title').text().trim();
        let titleMatch = pageTitle.match(/^(.+?)_第\d+集_/);
        if (!titleMatch) {
            // 如果没有集数匹配，尝试匹配详情页面格式
            titleMatch = pageTitle.match(/^(.+?)_TV番组/);
        }
        if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
            strategyUsed = 1;
            console.log(`🎯 策略1: 从页面标题提取: ${title}`);
        }

        // 策略2: 尝试从h1标签获取
        if (!title) {
            const fullTitle = $('h1').text().trim() || '';
            const titleText = fullTitle.replace('_TV番组 - 次元城动画 - 海量蓝光番剧免费看！', '').trim();
            if (titleText && titleText !== '未知动画') {
                title = titleText;
                strategyUsed = 2;
            }
        }

        // 策略3: 尝试多个可能的标题选择器 - 添加可靠的 .this-title 和 .player-title-link
        if (!title || title === '未知动画') {
            const selectors = [
                '.this-title',           // 最可靠 - 主标题元素
                '.player-title-link',    // 可靠 - 播放器标题链接
                'h2 .player-title-link', // 备选 - h2 中的标题链接
                '.detail-title h1',
                '.anime-title h1',
                '.page-title h1',
                '.bangumi-title h1',
                '.info-title h1',
                'h1.anime-title',
                '.title h1',
                'h1.title'
            ];

            for (const selector of selectors) {
                const tempTitle = $(selector).text().trim();
                if (tempTitle && tempTitle !== '未知动画' && tempTitle.length > 0) {
                    title = tempTitle;
                    strategyUsed = 3;
                    console.log(`🎯 使用选择器 ${selector} 找到标题: ${title}`);
                    break;
                }
            }
        }

        // 策略4: 特殊ID硬编码修复
        if (!title || title === '未知动画') {
            if (animeId === '5998') {
                title = '间谍过家家 第三季';
                strategyUsed = 4;
                console.log(`🎯 策略4: 使用硬编码标题修复动画ID ${animeId}: ${title}`);
            }
        }

        // 策略5: 从 JavaScript player_aaaa 对象提取标题
        if (!title || title === '未知动画') {
            const scriptContent = $('script:contains("player_aaaa")').html();
            if (scriptContent) {
                // 尝试匹配 vod_name 字段的 Unicode 转义序列
                const vodNameMatch = scriptContent.match(/"vod_name"\s*:\s*"((?:\\u[0-9a-fA-F]{4})+)"/);
                if (vodNameMatch && vodNameMatch[1]) {
                    try {
                        // 解码 Unicode 转义序列
                        const decodedTitle = vodNameMatch[1].replace(/\\u([0-9a-fA-F]{4})/g,
                            (match, hex) => String.fromCharCode(parseInt(hex, 16))
                        );
                        if (decodedTitle && decodedTitle !== '未知动画') {
                            title = decodedTitle;
                            strategyUsed = 5;
                            console.log(`🎯 策略5: 从JavaScript对象提取: ${title}`);
                        }
                    } catch (error) {
                        console.log(`⚠️ 策略5: Unicode解码失败 - ${error.message}`);
                    }
                }
            }
        }

        // 最终回退：如果所有策略都失败
        if (!title || title === '未知动画') {
            title = '未知动画';
            strategyUsed = 0;
        }

        console.log(`🎯 5步策略解析结果: ${title} (策略${strategyUsed})`);

        // 更新全局策略统计
        if (typeof parsingStrategyStats !== 'undefined') {
            parsingStrategyStats[`strategy${strategyUsed}`]++;
        }

        // 解析剧集列表 - 使用正确的选择器
        const episodes = [];
        // Only scrape the first play source (season=1) to avoid duplicate episodes
        // Note: The site uses /watch/{animeId}/{source}/{episode}.html where {source} is the play source (1, 2, 3...)
        // not the actual season number. We only use the first source to avoid duplicates.
        $(`a[href*="/watch/${animeId}/"]`).each((_, element) => {
            const $episodeLink = $(element);
            const href = $episodeLink.attr('href');
            const episodeText = $episodeLink.text().trim();

            if (href && episodeText) {
                const episodeMatch = href.match(new RegExp(`/watch/${animeId}/(\\d+)/(\\d+)\\.html`));
                if (episodeMatch) {
                    const source = parseInt(episodeMatch[1]);
                    const episode = parseInt(episodeMatch[2]);

                    // Only include episodes from the first play source (source=1)
                    // This avoids duplicate episodes when multiple play sources are available
                    if (source === 1) {
                        // Avoid duplicates
                        const exists = episodes.find(ep => ep.episode === episode);
                        if (!exists) {
                            episodes.push({
                                season: 1,  // Always use season 1 for the first play source
                                episode,
                                title: episodeText,
                                url: `https://www.cycani.org${href}`
                            });
                        }
                    }
                }
            }
        });

        // Sort by episode number
        episodes.sort((a, b) => a.episode - b.episode);

        // Scrape additional anime metadata
        // Cover image
        let cover = '';
        const $coverImg = $('.detail-pic img.lazy');
        if ($coverImg.length) {
            cover = $coverImg.attr('data-src') || '';
        }
        if (!cover) {
            const $coverImg2 = $('.detail-pic img');
            if ($coverImg2.length) {
                cover = $coverImg2.attr('src') || $coverImg2.attr('data-src') || '';
            }
        }

        // Description
        let description = '';
        const $descDiv = $('#height_limit');
        if ($descDiv.length) {
            description = $descDiv.text().trim();
        }
        // Fallback to meta description
        if (!description) {
            const $metaDesc = $('meta[name="description"]');
            if ($metaDesc.length) {
                description = $metaDesc.attr('content') || '';
            }
        }

        // Year
        let year = '';
        const $yearSpan = $('.slide-info-remarks a[href*="/search/year/"]');
        if ($yearSpan.length) {
            year = $yearSpan.first().text().trim();
        }

        // Type (TV, Movie, etc.)
        let type = 'TV';
        // pageTitle is already declared above at line 1169
        if (pageTitle.includes('TV番组')) {
            type = 'TV';
        } else if (pageTitle.includes('剧场番组')) {
            type = '剧场';
        } else if (pageTitle.includes('OAD')) {
            type = 'OAD';
        } else if (pageTitle.includes('OVA')) {
            type = 'OVA';
        }

        console.log(`✅ 解析到动画详情: ${title}, 共 ${episodes.length} 集`);
        console.log(`📺 封面: ${cover ? '已找到' : '未找到'}`);
        console.log(`📝 简介: ${description ? description.substring(0, 50) + '...' : '未找到'}`);
        console.log(`📅 年份: ${year || '未找到'}`);
        console.log(`🎬 类型: ${type}`);

        // 调试季节数据
        const seasons = [...new Set(episodes.map(ep => ep.season))];
        console.log(`📊 季节分布: ${seasons.join(', ')} (共${seasons.length}季)`);
        seasons.forEach(season => {
            const seasonEpisodes = episodes.filter(ep => ep.season === season);
            console.log(`  第${season}季: ${seasonEpisodes.length}集 (${Math.min(...seasonEpisodes.map(ep => ep.episode))}-${Math.max(...seasonEpisodes.map(ep => ep.episode))})`);
        });

        res.json({
            success: true,
            data: {
                id: animeId,
                title,
                cover,
                type,
                year,
                description,
                score: 0,
                status: '未知',
                genres: [],
                episodes,
                totalSeasons: [...new Set(episodes.map(ep => ep.season))].length,
                totalEpisodes: episodes.length
            }
        });

    } catch (error) {
        console.error('❌ 获取动画详情失败:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API路由 - 视频代理
app.get('/api/video-proxy', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                success: false,
                error: '缺少视频URL参数'
            });
        }

        console.log(`🎬 代理视频请求: ${url}`);

        // 验证URL安全性
        if (!isValidVideoUrl(url)) {
            return res.status(400).json({
                success: false,
                error: '无效的视频URL'
            });
        }

        // 这里我们先返回URL，实际实现中可能需要流式代理
        res.json({
            success: true,
            videoUrl: url,
            proxyUrl: `/api/stream?url=${encodeURIComponent(url)}`
        });

    } catch (error) {
        console.error('❌ 视频代理失败:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 视频流代理（如果需要）
app.get('/api/stream', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url || !isValidVideoUrl(url)) {
            return res.status(400).send('Invalid video URL');
        }

        console.log(`🚀 开始视频流代理: ${url}`);

        const response = await axios({
            method: 'GET',
            url: url,
            headers: {
                ...getEnhancedHeaders(url),
                'Referer': 'https://player.cycanime.com/',
                'Range': req.headers.range || ''
            },
            responseType: 'stream'
        });

        // 设置响应头
        res.writeHead(response.status, response.headers);

        // 流式传输
        response.data.pipe(res);

    } catch (error) {
        console.error('❌ 流代理失败:', error.message);
        res.status(500).send('Stream proxy failed');
    }
});

// 工具函数 - 解析剧集数据
function parseEpisodeData($) {
    try {
        // 尝试解析页面中的player_aaaa变量
        const scripts = $('script').map((_, el) => $(el).html()).get();

        let videoData = null;

        for (const script of scripts) {
            if (script && script.includes('player_aaaa')) {
                // 尝试多种匹配模式
                const patterns = [
                    /var\s+player_aaaa\s*=\s*({[^;]+});?/,
                    /player_aaaa\s*=\s*({[^;]+});?/,
                    /window\.player_aaaa\s*=\s*({[^;]+});?/
                ];

                for (const pattern of patterns) {
                    const match = script.match(pattern);
                    if (match) {
                        try {
                            let jsonStr = match[1];

                            // 尝试直接解析
                            try {
                                videoData = JSON.parse(jsonStr);
                                console.log('✅ 找到播放器数据');
                                break;
                            } catch (e1) {
                                // 如果直接解析失败，尝试修复语法
                                let fixedJson = jsonStr
                                    .replace(/(\w+):/g, '"$1":')  // 添加引号到键名
                                    .replace(/'/g, '"');           // 单引号转双引号

                                videoData = JSON.parse(fixedJson);
                                console.log('✅ 找到播放器数据（修复后）');
                                break;
                            }
                        } catch (e) {
                            // 静默失败，继续尝试下一个模式
                        }
                    }
                }

                if (videoData) {
                    break;
                }
            }
        }

        // 如果没有解析到数据，返回基本信息
        const title = $('title').text() || '未知剧集';

        return {
            title,
            videoUrl: videoData?.url || null,
            decryptedVideoUrl: videoData?.url ? decryptVideoUrl(videoData.url) : null,
            nextUrl: videoData?.url_next || null,
            decryptedNextUrl: videoData?.url_next ? decryptVideoUrl(videoData.url_next) : null,
            videoData: videoData || null
        };

    } catch (error) {
        console.error('解析页面数据失败:', error);
        return {
            title: '解析失败',
            error: error.message
        };
    }
}

// 解析播放器页面获取真实视频URL
async function parsePlayerPage(videoId, refererUrl = 'https://www.cycani.org/') {
    try {
        const playerUrl = `https://player.cycanime.com/?url=${videoId}`;
        console.log(`🎬 解析播放器页面: ${playerUrl}`);
        console.log(`📌 使用 Referer: ${refererUrl}`);

        // 方法1: 尝试使用Puppeteer从video元素直接读取解密后的URL
        if (puppeteer) {
            console.log('🤖 使用Puppeteer从video元素读取URL...');
            const videoUrl = await getVideoUrlFromPuppeteer(playerUrl, refererUrl);
            if (videoUrl) {
                console.log(`✅ Puppeteer成功: ${videoUrl.substring(0, 80)}...`);
                return videoUrl;
            }
            console.log('⚠️ Puppeteer方法失败');
        }

        // 方法2: HTTP方法作为备用（目前解密不工作，但保留以备将来使用）
        console.log('📡 尝试HTTP+AES解密方法...');
        const realVideoUrl = await parseWithAxios(playerUrl);

        if (realVideoUrl) {
            console.log(`✅ HTTP方法成功: ${realVideoUrl.substring(0, 100) + '...'}`);
            return realVideoUrl;
        }

        console.log('❌ 所有方法都失败');
        return null;

    } catch (error) {
        console.error('解析播放器页面失败:', error.message);
        return null;
    }
}

/**
 * 使用Puppeteer从video元素直接读取解密后的视频URL
 * 这比拦截网络请求更可靠，因为我们获取的是浏览器已经解密后的URL
 * 使用浏览器实例池复用浏览器，提升性能
 */
async function getVideoUrlFromPuppeteer(playerUrl, refererUrl = 'https://www.cycani.org/') {
    if (!browserPool) return null;

    let page = null;
    try {
        // 从池中获取浏览器实例
        const browser = await browserPool.getBrowser();

        page = await browser.newPage();
        await page.setUserAgent(getEnhancedHeaders()['User-Agent']);

        console.log(`📄 访问剧集页面: ${refererUrl}`);

        // 直接访问 cycani.org 剧集页面，让 MacPlayer 自动创建 iframe
        await page.goto(refererUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        console.log(`⏳ 等待 player.cycanime.com iframe 出现...`);

        // 主动等待 iframe 出现（最多等待 5 秒）
        await page.waitForFunction(() => {
            const iframes = Array.from(document.querySelectorAll('iframe'));
            return iframes.some(iframe => iframe.src && iframe.src.includes('player.cycanime.com'));
        }, { timeout: 5000 });

        console.log(`✅ iframe 已出现，查找 video 元素...`);

        // 使用 Puppeteer 的 frames() API 获取 player.cycanime.com 的 frame
        const targetFrame = page.frames().find(f => f.url().includes('player.cycanime.com'));

        if (!targetFrame) {
            console.log(`⚠️ 未找到 player.cycanime.com frame`);
            return null;
        }

        console.log(`✅ 找到目标 frame，等待 video 元素...`);

        // 在 frame 中循环等待 video 元素出现
        let videoUrl = null;
        const maxAttempts = 20; // 最多尝试 20 次
        for (let i = 0; i < maxAttempts; i++) {
            const result = await targetFrame.evaluate(() => {
                const video = document.querySelector('video');
                if (video && video.currentSrc) {
                    return video.currentSrc;
                }
                return null;
            });

            if (result && typeof result === 'string') {
                videoUrl = result;
                console.log(`✅ 成功获取视频URL: ${videoUrl.substring(0, 80)}...`);
                break;
            }

            // 等待 500ms 后重试
            await page.waitForTimeout(500);
        }

        if (!videoUrl) {
            console.log(`⚠️ 超时后仍未找到 video 元素`);
        }

        // 关闭页面，但保持浏览器运行
        if (page) {
            try {
                await page.close();
            } catch (e) {
                // 忽略关闭错误
            }
        }

        return videoUrl;

    } catch (error) {
        console.error('Puppeteer获取video src失败:', error.message);
        if (page) {
            try {
                await page.close();
            } catch (e) {
                // 忽略关闭错误
            }
        }
        return null;
    }
}

// 使用Axios解析页面 (备用方案)
async function parseWithAxios(playerUrl) {
    try {
        console.log(`🌐 获取播放器页面: ${playerUrl}`);
        const response = await httpClient.get(playerUrl, {
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        console.log('📄 页面标题:', $('title').text());

        // 方法1: 直接查找video标签
        const videoElements = $('video');
        if (videoElements.length > 0) {
            const videoSrc = videoElements.first().attr('src') ||
                           videoElements.first().attr('data-src') ||
                           videoElements.first().attr('current-src');
            if (videoSrc) {
                console.log(`✅ 方法1 (video标签): 找到视频源`);
                return videoSrc;
            }
        }

        // 方法2: 从HTML中直接提取URL
        const htmlContent = response.data;
        const urlMatches = htmlContent.match(/https:\/\/[^"\s]+\.(?:mp4|m3u8|webm|flv)[^"\s]*/gi);
        if (urlMatches && urlMatches.length > 0) {
            const videoSrc = urlMatches.find(url =>
                url.includes('byteimg.com') ||
                url.includes('tos-cn') ||
                url.includes('video') ||
                url.includes('media')
            );
            if (videoSrc) {
                console.log(`✅ 方法2 (HTML正则): 找到视频源`);
                return videoSrc;
            }
        }

        // 方法3: 查找所有带src属性的元素
        const elementsWithSrc = $('[src]');
        let foundVideoSrc = null;
        elementsWithSrc.each((_, element) => {
            const src = $(element).attr('src');
            if (src && (src.includes('video') || src.includes('media') || src.includes('tos-cn') || src.includes('byteimg.com'))) {
                foundVideoSrc = src;
                return false;
            }
        });

        if (foundVideoSrc) {
            console.log(`✅ 方法3 (元素src): 找到视频源`);
            return foundVideoSrc;
        }

        console.warn('❌ 所有方法都未找到视频源');
        return null;

    } catch (error) {
        console.error('❌ Axios解析失败:', error.message);
        return null;
    }
}

// 视频URL解密函数
function decryptVideoUrl(encryptedUrl) {
    try {
        if (!encryptedUrl) return null;

        // 解码Base64
        const base64Decoded = Buffer.from(encryptedUrl, 'base64').toString('utf8');

        // URL解码
        const urlDecoded = decodeURIComponent(base64Decoded);

        // 只输出最终结果，减少日志噪音
        console.log(`🔓 解密视频ID: ${urlDecoded.substring(0, 40)}...`);

        return urlDecoded;
    } catch (error) {
        console.error('视频URL解密失败:', error.message);
        return encryptedUrl; // 返回原始URL
    }
}

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
    console.log(`✅ Data storage initialization complete`);

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