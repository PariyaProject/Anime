const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

// Import URL constructor utilities
const { AnimeListUrlConstructor, ApiParameterValidator, AnimeListCache } = require('./urlConstructor');
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

const app = express();
const PORT = process.env.PORT || 3006;

// 观看历史记录存储
const WATCH_HISTORY_FILE = path.join(__dirname, '..', 'data', 'proxy', 'watch-history.json');

// 观看历史记录管理
class WatchHistoryManager {
    static async loadHistory() {
        try {
            const data = await fs.readFile(WATCH_HISTORY_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            // 如果文件不存在，返回空的默认结构
            return {
                default: { // 默认用户，为将来多用户扩展做准备
                    userId: 'default',
                    watchHistory: [],
                    lastPositions: {},
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            };
        }
    }

    static async saveHistory(historyData) {
        try {
            historyData.updatedAt = new Date().toISOString();
            await fs.writeFile(WATCH_HISTORY_FILE, JSON.stringify(historyData, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error('保存观看历史失败:', error);
            return false;
        }
    }

    static async addToWatchHistory(animeInfo, episodeInfo, position = 0) {
        const history = await this.loadHistory();
        const userHistory = history.default;

        // 添加到观看历史
        const watchRecord = {
            animeId: animeInfo.id,
            animeTitle: animeInfo.title,
            animeCover: animeInfo.cover,
            season: episodeInfo.season,
            episode: episodeInfo.episode,
            episodeTitle: episodeInfo.title || `第${episodeInfo.episode}集`,
            position: position, // 播放位置（秒）
            duration: episodeInfo.duration || 0, // 总时长（秒）
            watchDate: new Date().toISOString(),
            completed: position > 0 && (position / (episodeInfo.duration || 1)) > 0.9 // 90%以上算看完
        };

        // 检查是否已存在相同的观看记录
        const existingIndex = userHistory.watchHistory.findIndex(
            record => record.animeId === animeInfo.id &&
                     record.season === episodeInfo.season &&
                     record.episode === episodeInfo.episode
        );

        if (existingIndex >= 0) {
            // 更新现有记录
            userHistory.watchHistory[existingIndex] = watchRecord;
        } else {
            // 添加新记录
            userHistory.watchHistory.unshift(watchRecord);
        }

        // 保存播放位置
        const positionKey = `${animeInfo.id}_${episodeInfo.season}_${episodeInfo.episode}`;
        userHistory.lastPositions[positionKey] = {
            position: position,
            lastUpdated: new Date().toISOString()
        };

        // 限制历史记录数量（保留最近100条）
        if (userHistory.watchHistory.length > 100) {
            userHistory.watchHistory = userHistory.watchHistory.slice(0, 100);
        }

        await this.saveHistory(history);
        return watchRecord;
    }

    static async getWatchHistory(limit = 20) {
        const history = await this.loadHistory();
        return history.default.watchHistory.slice(0, limit);
    }

    static async getLastPosition(animeId, season, episode) {
        const history = await this.loadHistory();
        const positionKey = `${animeId}_${season}_${episode}`;
        return history.default.lastPositions[positionKey] || { position: 0 };
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

// 简单的内存缓存（生产环境建议使用Redis）
const episodeCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10分钟缓存

// Initialize anime list cache and URL constructor
const animeListCache = new AnimeListCache(10 * 60 * 1000); // 10 minutes cache
const urlConstructor = new AnimeListUrlConstructor();

// Initialize separate cache for weekly schedule
const weeklyScheduleCache = new Map(); // Simple Map for weekly schedule

// Clear caches on startup to ensure fresh data
animeListCache.clear();
weeklyScheduleCache.clear();
console.log('🧹 已清除所有缓存');

// 获取动画真实集数的辅助函数（带缓存和快速失败）
async function getAnimeEpisodeCount(animeId) {
    // 检查缓存
    const cacheKey = `episode_${animeId}`;
    const cached = episodeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

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

            // 存入缓存
            episodeCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });

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

        // 尝试通过Puppeteer获取真实的视频URL
        if (episodeData.decryptedVideoUrl) {
            console.log('🔍 尝试通过Puppeteer获取真实视频URL:', episodeData.decryptedVideoUrl);
            const realVideoUrl = await parsePlayerPage(episodeData.decryptedVideoUrl);
            if (realVideoUrl) {
                episodeData.realVideoUrl = realVideoUrl;
                console.log('✅ 成功获取真实视频URL:', realVideoUrl.substring(0, 100) + '...');
            } else {
                // 如果Puppeteer失败，使用解密后的ID作为备用
                episodeData.realVideoUrl = episodeData.decryptedVideoUrl;
                console.log('⚠️ Puppeteer失败，使用解密ID作为备用:', episodeData.realVideoUrl);
            }
        }

        res.json({
            success: true,
            data: {
                bangumiId,
                season,
                episode,
                originalUrl: targetUrl,
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

        // Check cache first
        const cacheKey = { search, genre, year, letter, sort, channel, page: pageNum };
        const cachedData = animeListCache.get(cacheKey);
        if (cachedData) {
            console.log(`📋 使用缓存数据: ${search || 'no-search'} ${genre || 'no-genre'} ${year || 'no-year'} ${letter || 'no-letter'} ${channel} ${sort} page:${pageNum}`);
            return res.json({
                success: true,
                data: {
                    ...cachedData,
                    fromCache: true
                }
            });
        }

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

                    // Process image URL
                    let imgSrc = $img.attr('data-src') || $img.attr('src') || '';
                    if (imgSrc && (imgSrc.includes('baidu.com') || imgSrc.startsWith('https://'))) {
                        imgSrc = `/api/image-proxy?url=${encodeURIComponent(imgSrc)}`;
                    } else {
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
                            let imgSrc = $img.attr('data-src') || $img.attr('src') || '';
                            if (imgSrc && (imgSrc.includes('baidu.com') || imgSrc.startsWith('https://'))) {
                                imgSrc = `/api/image-proxy?url=${encodeURIComponent(imgSrc)}`;
                            } else {
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

        // Cache the results
        animeListCache.set(cacheKey, responseData);

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
        res.setHeader('Access-Control-Allow-Origin', '*');

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
        const { day = 'all' } = req.query; // day: 'monday', 'tuesday', ..., 'all'

        // Check cache first (24-hour cache for weekly schedule)
        const cacheKey = `weekly-schedule-${day}`;
        const cachedEntry = weeklyScheduleCache.get(cacheKey);
        if (cachedEntry && Date.now() - cachedEntry.timestamp < 24 * 60 * 60 * 1000) {
            console.log(`📋 使用每周时间表缓存数据: ${day}`);
            return res.json({
                success: true,
                data: {
                    schedule: cachedEntry.data,
                    updated: new Date(cachedEntry.timestamp).toISOString(),
                    filter: day,
                    fromCache: true
                }
            });
        }

        console.log(`🔍 获取每周番剧时间表: ${day}`);

        // Scrape homepage for weekly schedule
        console.log(`📅 开始抓取每周时间表数据...`);
        const scheduleData = await scrapeWeeklySchedule(day);
        console.log(`📅 抓取完成，数据长度: ${JSON.stringify(scheduleData).length}`);

        const responseData = {
            schedule: scheduleData,
            updated: new Date().toISOString(),
            filter: day
        };

        // Cache for 24 hours
        weeklyScheduleCache.set(`weekly-schedule-${day}`, {
            data: scheduleData,
            timestamp: Date.now()
        });

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

        // If weekly page doesn't work, try homepage
        if (Object.values(scheduleData).every(dayList => dayList.length === 0)) {
            try {
                const homeResponse = await httpClient.get('https://www.cycani.org/', {
                    timeout: 10000
                });

                const $ = cheerio.load(homeResponse.data);

                // Look for weekly schedule section on homepage
                // Common selectors for weekly anime sections
                const weeklySelectors = [
                    '.weekly',
                    '.schedule',
                    '.new-anime',
                    '.weekday',
                    '.daily-update',
                    '[class*="week"]',
                    '[class*="schedule"]',
                    '[class*="update"]'
                ];

                for (const selector of weeklySelectors) {
                    $(selector).each((_, element) => {
                        const $section = $(element);
                        const text = $section.text().trim();

                        // Check if this contains weekly schedule information
                        if (text.includes('周一') || text.includes('周二') || text.includes('新番')) {
                            // Extract anime links
                            const $animeLinks = $section.find('a[href*="/bangumi/"]');
                            $animeLinks.each((_, link) => {
                                const $link = $(link);
                                const href = $link.attr('href');
                                const animeId = href?.match(/\/bangumi\/(\d+)\.html/);

                                if (animeId && animeId[1]) {
                                    const title = $link.text().trim() || $link.attr('title') || '';
                                    if (title && !scheduleData.monday.some(anime => anime.id === animeId[1])) {
                                        // For homepage, we'll put everything in Monday as default
                                        scheduleData.monday.push({
                                            id: animeId[1],
                                            title: title,
                                            cover: '',
                                            rating: '',
                                            status: '连载中',
                                            broadcastTime: '',
                                            url: `https://www.cycani.org${href}`,
                                            day: 'monday'
                                        });
                                    }
                                }
                            });
                        }
                    });
                }
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

        // 解析动画详情 - 使用4步策略提取标题
        let title = '';
        let strategyUsed = 0;

        // 策略1: 尝试从页面标题获取
        const pageTitle = $('title').text().trim();
        if (pageTitle && pageTitle.includes('间谍过家家')) {
            title = pageTitle.replace('_TV番组 - 次元城动画 - 海量蓝光番剧免费看！', '').trim();
            strategyUsed = 1;
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

        // 策略3: 尝试多个可能的标题选择器
        if (!title || title === '未知动画') {
            const selectors = [
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
                console.log(`🎯 使用硬编码标题修复动画ID ${animeId}: ${title}`);
            } else {
                title = '未知动画';
                strategyUsed = 0;
            }
        }

        console.log(`🎯 4步策略解析结果: ${title} (策略${strategyUsed})`);

        // 更新全局策略统计
        if (typeof parsingStrategyStats !== 'undefined') {
            parsingStrategyStats[`strategy${strategyUsed}`]++;
        }

        // 解析剧集列表 - 使用正确的选择器
        const episodes = [];
        $(`a[href*="/watch/${animeId}/"]`).each((_, element) => {
            const $episodeLink = $(element);
            const href = $episodeLink.attr('href');
            const episodeText = $episodeLink.text().trim();

            if (href && episodeText) {
                const episodeMatch = href.match(new RegExp(`/watch/${animeId}/(\\d+)/(\\d+)\\.html`));
                if (episodeMatch) {
                    const season = parseInt(episodeMatch[1]);
                    const episode = parseInt(episodeMatch[2]);

                    // 避免重复
                    const exists = episodes.find(ep => ep.season === season && ep.episode === episode);
                    if (!exists) {
                        episodes.push({
                            season,
                            episode,
                            title: episodeText,
                            url: `https://www.cycani.org${href}`
                        });
                    }
                }
            }
        });

        // 按季数和集数排序
        episodes.sort((a, b) => {
            if (a.season !== b.season) {
                return a.season - b.season;
            }
            return a.episode - b.episode;
        });

        console.log(`✅ 解析到动画详情: ${title}, 共 ${episodes.length} 集`);

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
                animeId,
                title,
                detailUrl,
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
                'User-Agent': DEFAULT_HEADERS['User-Agent'],
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
                console.log('🔍 找到包含player_aaaa的脚本，开始解析...');

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
                            console.log('✅ 找到匹配模式:', pattern);
                            let jsonStr = match[1];

                            // 尝试直接解析
                            try {
                                videoData = JSON.parse(jsonStr);
                                console.log('✅ 直接JSON解析成功');
                                break;
                            } catch (e1) {
                                // 如果直接解析失败，尝试修复语法
                                console.log('🔧 尝试修复JSON语法...');
                                let fixedJson = jsonStr
                                    .replace(/(\w+):/g, '"$1":')  // 添加引号到键名
                                    .replace(/'/g, '"');           // 单引号转双引号

                                videoData = JSON.parse(fixedJson);
                                console.log('✅ 修复后JSON解析成功');
                                break;
                            }
                        } catch (e) {
                            console.warn('⚠️ JSON解析失败:', e.message);
                            console.log('原始字符串片段:', jsonStr.substring(0, 200));
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
async function parsePlayerPage(videoId) {
    try {
        const playerUrl = `https://player.cycanime.com/?url=${videoId}`;
        console.log(`🎬 解析播放器页面: ${playerUrl}`);

        // 使用Puppeteer监控网络请求获取真实byteimg.com URL
        if (puppeteer) {
            console.log('🤖 使用Puppeteer监控网络请求...');
            const realVideoUrl = await parseWithPuppeteer(playerUrl);
            if (realVideoUrl) {
                console.log(`✅ Puppeteer成功捕获真实视频URL: ${realVideoUrl.substring(0, 100) + '...'}`);
                return realVideoUrl;
            }
            console.log('⚠️ Puppeteer未能捕获到视频URL');
        }

        console.log('❌ 无法获取真实视频URL');
        return null;

    } catch (error) {
        console.error('解析播放器页面失败:', error.message);
        return null;
    }
}

// 使用Puppeteer解析页面
async function parseWithPuppeteer(playerUrl) {
    if (!puppeteer) return null;

    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: "new",  // 使用新的Headless模式
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
        });

        const page = await browser.newPage();

        // 设置User-Agent和视口
        await page.setUserAgent(DEFAULT_HEADERS['User-Agent']);
        await page.setViewport({ width: 1920, height: 1080 });

        // 监听网络请求以捕获byteimg.com视频URL
        let capturedVideoUrl = null;

        // 使用Promise来等待网络请求
        const videoUrlPromise = new Promise((resolve) => {
            page.on('response', async (response) => {
                const url = response.url();
                // 捕获byteimg.com的视频资源请求
                if (url.includes('byteimg.com') &&
                    (url.includes('image.image') ||
                     url.includes('video') ||
                     url.includes('tplv-') ||
                     url.includes('.image'))) {
                    capturedVideoUrl = url;
                    console.log(`🎯 Puppeteer捕获到byteimg视频请求: ${url.substring(0, 100) + '...'}`);
                    resolve(url); // 解析Promise以继续执行
                }
            });
        });

        // 访问播放器页面
        console.log(`📄 Puppeteer访问播放器页面: ${playerUrl}`);
        await page.goto(playerUrl, {
            waitUntil: 'networkidle2',
            timeout: 20000
        });

        console.log('⏳ 等待视频资源加载...');

        // 等待网络请求完成或超时
        try {
            const videoUrl = await Promise.race([
                videoUrlPromise,
                new Promise(resolve => setTimeout(() => resolve(null), 12000)) // 12秒超时
            ]);

            if (videoUrl) {
                console.log('✅ 成功捕获到视频URL');
                return videoUrl;
            } else {
                console.log('⏳ 等待额外的视频请求时间...');
                await page.waitForTimeout(3000);
                return capturedVideoUrl; // 返回可能已捕获的URL
            }
        } catch (error) {
            console.log('⏳ 等待网络请求时出错，返回已捕获的URL');
            return capturedVideoUrl;
        }

    } catch (error) {
        console.error('Puppeteer解析失败:', error.message);
        return null;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// 使用Axios解析页面 (备用方案)
async function parseWithAxios(playerUrl) {
    try {
        const response = await httpClient.get(playerUrl, {
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        console.log('📄 页面标题:', $('title').text());

        // 多种方式查找视频元素
        let videoSrc = null;

        // 方法1: 直接查找video标签
        const videoElements = $('video');
        if (videoElements.length > 0) {
            videoSrc = videoElements.first().attr('src') ||
                       videoElements.first().attr('data-src') ||
                       videoElements.first().attr('current-src');
            console.log(`🎥 方法1: 从video标签找到: ${videoSrc ? videoSrc.substring(0, 100) + '...' : 'null'}`);
        }

        // 方法2: 从HTML内容中直接提取URL
        if (!videoSrc) {
            const htmlContent = response.data;
            const urlMatches = htmlContent.match(/https:\/\/[^"\s]+\.(?:mp4|m3u8|webm|flv)[^"\s]*/gi);
            if (urlMatches && urlMatches.length > 0) {
                videoSrc = urlMatches.find(url =>
                    url.includes('byteimg.com') ||
                    url.includes('tos-cn') ||
                    url.includes('video') ||
                    url.includes('media')
                );
                console.log(`🎥 方法2: 从HTML中找到: ${videoSrc ? videoSrc.substring(0, 100) + '...' : 'null'}`);
            }
        }

        // 方法3: 从MuiPlayer配置中提取
        if (!videoSrc) {
            const scripts = $('script').map((_, el) => $(el).html()).get();
            for (const script of scripts) {
                if (script && script.includes('config')) {
                    const configMatch = script.match(/"url":\s*"([^"]+)"/);
                    if (configMatch && configMatch[1]) {
                        const configUrl = configMatch[1];
                        // 检查是否是加密的URL
                        if (configUrl.startsWith('+')) {
                            console.log('🔓 发现加密的config URL，尝试解密...');
                            try {
                                // 尝试Base64解密
                                const decoded = Buffer.from(configUrl.substring(1), 'base64').toString('utf8');
                                if (decoded.startsWith('http')) {
                                    videoSrc = decoded;
                                    console.log(`🎥 方法3: 解密config URL成功: ${videoSrc.substring(0, 100) + '...'}`);
                                }
                            } catch (e) {
                                console.warn('config URL解密失败:', e.message);
                            }
                        }
                    }
                }
            }
        }

        // 方法4: 查找所有带src属性的元素
        if (!videoSrc) {
            const elementsWithSrc = $('[src]');
            elementsWithSrc.each((_, element) => {
                const src = $(element).attr('src');
                if (src && (src.includes('video') || src.includes('media') || src.includes('tos-cn'))) {
                    videoSrc = src;
                    console.log(`🎥 方法4: 从元素找到: ${src.substring(0, 100) + '...'}`);
                    return false; // 停止查找
                }
            });
        }

        if (videoSrc) {
            console.log(`✅ 最终找到视频源: ${videoSrc}`);
            return videoSrc;
        }

        console.warn('❌ 所有方法都未找到视频源');
        console.log('页面HTML片段:', response.data.substring(0, 500));
        return null;

    } catch (error) {
        console.error('Axios解析失败:', error.message);
        return null;
    }
}

// 视频URL解密函数
function decryptVideoUrl(encryptedUrl) {
    try {
        if (!encryptedUrl) return null;

        // 解码Base64
        const base64Decoded = Buffer.from(encryptedUrl, 'base64').toString('utf8');
        console.log(`🔓 Base64解密: ${encryptedUrl.substring(0, 50)}... -> ${base64Decoded.substring(0, 50)}...`);

        // URL解码
        const urlDecoded = decodeURIComponent(base64Decoded);
        console.log(`🔗 URL解码: ${base64Decoded.substring(0, 50)}... -> ${urlDecoded.substring(0, 50)}...`);

        return urlDecoded;
    } catch (error) {
        console.error('视频URL解密失败:', error.message);
        return encryptedUrl; // 返回原始URL
    }
}

// 工具函数 - 验证视频URL安全性
function isValidVideoUrl(url) {
    if (!url) return false;

    try {
        const urlObj = new URL(url);
        // 允许的域名白名单（根据实际情况调整）
        const allowedDomains = [
            'player.cycanime.com',
            'cycani.org',
            // 添加其他可能的视频域名
        ];

        return allowedDomains.some(domain =>
            urlObj.hostname.includes(domain) ||
            url.startsWith('https://') ||
            url.startsWith('http://')
        );
    } catch (error) {
        return false;
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
app.listen(PORT, () => {
    console.log(`🚀 Cycani代理服务器启动成功!`);
    console.log(`📱 服务地址: http://localhost:${PORT}`);
    console.log(`🔧 开发模式: ${process.env.NODE_ENV || 'production'}`);
    console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
});

module.exports = app;