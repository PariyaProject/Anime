const express = require('express');
const router = express.Router();
const cheerio = require('cheerio');
const { AnimeListUrlConstructor, ApiParameterValidator } = require('../urlConstructor');
const { httpClient } = require('../httpClient');
const { getAnimeIndexManager } = require('../animeIndexManager');

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


// API路由 - 获取动画列表
router.get('/api/anime-list', async (req, res) => {
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

        // ============================================================
        // Incremental Index Update (Transparent)
        // Runs on EVERY /api/anime-list request to actively grow the index
        // Checks all returned anime IDs against the index, adds missing ones
        // ============================================================
        try {
            const indexManager = getAnimeIndexManager();
            // Use the full animeList (before slicing) for incremental update
            // Pass channel parameter to store channel info in index
            const updateResult = await indexManager.incrementalUpdate(animeList, channel);
            if (updateResult.added > 0) {
                console.log(`📈 Index updated: +${updateResult.added} new anime (channel: ${channel})`);
            }
        } catch (indexError) {
            // Don't fail the request if index update fails
            console.warn(`⚠️ Index update failed: ${indexError.message}`);
        }

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


// API路由 - 每周番剧时间表
router.get('/api/weekly-schedule', async (req, res) => {
    try {
        const { day = 'all', refresh } = req.query; // day: 'monday', 'tuesday', ..., 'all', refresh: legacy parameter

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


// API路由 - 搜索动画 (Legacy - requires CAPTCHA, kept as fallback)
router.get('/api/search-anime', async (req, res) => {
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

        console.log(`🔍 搜索动画 (legacy): ${q}`);

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

        console.log(`✅ 搜索到 ${searchResults.length} 个结果 (legacy)`);

        res.json({
            success: true,
            data: {
                animeList: searchResults,
                searchQuery: q,
                totalCount: searchResults.length
            }
        });

    } catch (error) {
        console.error('❌ 搜索动画失败 (legacy):', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// API路由 - 本地搜索 (New - uses local index, no CAPTCHA)
router.get('/api/search-local', async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: '搜索关键词至少需要2个字符'
            });
        }

        const indexManager = getAnimeIndexManager();
        const stats = indexManager.getIndexStats();

        // Check if index is building
        if (stats.isBuilding) {
            return res.status(503).json({
                success: false,
                error: '索引正在构建中，请稍后再试',
                isBuilding: true
            });
        }

        // Check if index is empty
        if (stats.totalAnime === 0) {
            return res.status(503).json({
                success: false,
                error: '索引尚未构建，请先构建索引',
                isEmpty: true
            });
        }

        console.log(`🔍 本地搜索: ${q}`);

        // Search in local index
        const results = indexManager.search(q);

        console.log(`✅ 本地搜索到 ${results.length} 个结果`);

        res.json({
            success: true,
            data: {
                animeList: results,
                searchQuery: q,
                totalCount: results.length,
                indexLastUpdated: stats.lastUpdated
            }
        });

    } catch (error) {
        console.error('❌ 本地搜索失败:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// API路由 - 索引状态
router.get('/api/index-status', async (req, res) => {
    try {
        const indexManager = getAnimeIndexManager();
        const stats = indexManager.getIndexStats();

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('❌ 获取索引状态失败:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// API路由 - 重建索引 (Admin only)
router.post('/api/index-rebuild', async (req, res) => {
    try {
        const indexManager = getAnimeIndexManager();

        // Check if already building
        if (indexManager.isBuilding) {
            return res.status(409).json({
                success: false,
                error: '索引已在构建中',
                isBuilding: true
            });
        }

        console.log('🔄 触发索引重建...');

        // Start rebuild in background
        indexManager.buildInitialIndex().catch(error => {
            console.error('❌ 索引重建失败:', error.message);
        });

        res.json({
            success: true,
            message: '索引重建已启动'
        });

    } catch (error) {
        console.error('❌ 触发索引重建失败:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// API路由 - 获取动画详情
router.get('/api/anime/:animeId', async (req, res) => {
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
        // 支持多种格式:
        // - 播放页面: 不擅吸血的吸血鬼_第01集_TV番组 - 次元城动画 - 海量蓝光番剧免费看！
        // - TV详情页面: 不擅吸血的吸血鬼_TV番组 - 次元城动画 - 海量蓝光番剧免费看！
        // - 剧场详情页面: 剧场版 鬼灭之刃 无限城篇_剧场番组 - 次元城动画 - 海量蓝光番剧免费看！
        const pageTitle = $('title').text().trim();
        let titleMatch = pageTitle.match(/^(.+?)_第\d+集_/);
        if (!titleMatch) {
            // 如果没有集数匹配，尝试匹配详情页面格式（支持TV和剧场）
            titleMatch = pageTitle.match(/^(.+?)_(?:TV番组|剧场番组)/);
        }
        if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
            strategyUsed = 1;
            console.log(`🎯 策略1: 从页面标题提取: ${title}`);
        }

        // 策略2: 尝试从h1标签获取
        if (!title) {
            const fullTitle = $('h1').text().trim() || '';
            const titleText = fullTitle.replace(/_TV番组.*$/, '').trim();
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


module.exports = router;
