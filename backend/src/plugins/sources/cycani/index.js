const BasePlugin = require('../../BasePlugin');
const cheerio = require('cheerio');
const CryptoJS = require('crypto-js');
const { UpstreamAccessError, fetchUpstreamHtml } = require('../../../upstreamAccess');
const { decryptVideoUrl, resolveVideoUrl } = require('./videoParser');

const PLAYER_DECRYPTION_SALT = 'YLwJVbXw77pk2eOrAnFdBo2c3mWkLtodMni2wk81GCnP94ZltW';

class CycaniPlugin extends BasePlugin {
    getManifest() {
        return {
            id: 'cycani',
            name: '次元城动漫',
            version: '1.0.0',
            icon: 'bi bi-play-btn-fill',
            description: '提供 cycani.org 的动漫资源解析',
            lang: 'zh',
            capabilities: {
                browse: true,
                search: true,
                weeklySchedule: true,
                animeDetail: true,
                multiQuality: false,
            },
            uiLayout: {
                home: [
                    { component: 'HeroBanner' },
                    { component: 'ContinueWatching' },
                    { component: 'WeeklyScheduleWidget' },
                    { component: 'FilterableGrid' }
                ],
                detail: [
                    { component: 'AnimeInfo' },
                    { component: 'EpisodeList' }
                ]
            },
            filters: [
                {
                    id: 'channel',
                    label: '频道',
                    type: 'select',
                    options: [
                        { value: 'tv', label: 'TV番剧' },
                        { value: 'movie', label: '剧场版' },
                        { value: '4k', label: '4K专区' },
                        { value: 'guoman', label: '国漫' }
                    ],
                    default: 'tv'
                },
                {
                    id: 'sort',
                    label: '排序',
                    type: 'select',
                    options: [
                        { value: 'time', label: '按时间' },
                        { value: 'hits', label: '按人气' },
                        { value: 'score', label: '按评分' }
                    ],
                    default: 'time'
                }
            ],
            network: {
                proxyDomains: ['cycani.org', 'cycanime.com', 'player.cycanime.com'],
                requiresGlobalProxy: false,
            },
            userConfig: []
        };
    }

    /**
     * Build URL for Cycani
     */
    buildListUrl(filters, page = 1) {
        const { search, genre, year, letter, sort, channel = 'tv' } = filters;
        const baseUrl = 'https://www.cycani.org';

        if (search) {
            return `${baseUrl}/search?wd=${encodeURIComponent(search)}`;
        }

        const channelMap = {
            'tv': 20,
            'movie': 21,
            '4k': 26,
            'guoman': 27
        };
        const channelId = channelMap[channel] || 20;
        const showPath = `/show/${channelId}`;

        let url = `${baseUrl}${showPath}.html`;

        if (genre) url = `${baseUrl}${showPath}/class/${encodeURIComponent(genre)}.html`;
        else if (year) url = `${baseUrl}${showPath}/year/${year}.html`;
        else if (letter) url = `${baseUrl}${showPath}/letter/${letter}.html`;

        if (sort && sort !== 'time') url = url.replace('.html', `/by/${sort}.html`);
        if (page > 1) url = url.replace('.html', `/page/${page}.html`);

        return url;
    }

    async fetchHtml(url, options = {}) {
        // Use the host's fetchUpstreamHtml which manages proxies, rate limits, and Puppeteer CAPTCHA fallback
        return await fetchUpstreamHtml(url, {
            timeout: 15000,
            ...options
        });
    }

    async getAnimeList(filters, pageStr = 1) {
        const page = parseInt(pageStr, 10);
        // Map 24-item app pages to 48-item cycani pages
        const limit = 24;
        const ITEMS_PER_PAGE_ON_SOURCE = 48;
        const startItem = (page - 1) * limit;
        const sourcePage = Math.floor(startItem / ITEMS_PER_PAGE_ON_SOURCE) + 1;
        const offsetInSourcePage = startItem % ITEMS_PER_PAGE_ON_SOURCE;

        const targetUrl = this.buildListUrl(filters, sourcePage);
        this.log(`Fetching list: ${targetUrl}`);
        
        const html = await this.fetchHtml(targetUrl);
        const $ = cheerio.load(html);

        const animeList = [];

        $('.public-list-box').each((_, element) => {
            const $box = $(element);
            const $link = $box.find('a[href*="/bangumi/"]');
            const $img = $box.find('img');

            if ($link.length && $img.length) {
                const href = $link.attr('href');
                const match = href.match(/\/bangumi\/(\d+)\.html/);
                if (match && match[1]) {
                    const id = match[1];
                    const title = $img.attr('alt') || $link.attr('title') || '';
                    
                    let cover = $img.attr('data-src') || $img.attr('src') || '';
                    if (!cover.startsWith('http')) cover = '/api/placeholder-image';

                    let status = '连载中';
                    let episodes = '未知';
                    const subtitleText = $box.find('.public-list-subtitle').text().trim() || $box.text();
                    
                    if (subtitleText) {
                        if (subtitleText.includes('已完结') || subtitleText.includes('全')) status = '已完结';
                        const epMatch = subtitleText.match(/(\d+)集/);
                        if (epMatch) episodes = epMatch[1];
                    }

                    let score = '7.5';
                    const scoreText = $box.find('.public-list-prb i, .public-list-prb').text().trim();
                    if (scoreText) {
                        const sMatch = scoreText.match(/(\d+\.?\d*)/);
                        if (sMatch) score = sMatch[1];
                    }

                    if (!animeList.find(a => a.id === id)) {
                        animeList.push({
                            id, title, cover, type: filters.channel === 'movie' ? '剧场版' : 'TV',
                            year: '', episodes, status, score, channel: filters.channel || 'tv'
                        });
                    }
                }
            }
        });

        let totalPages = 1;
        const pageInfoMatch = $('body').text().match(/(?:\/|当前)(\d+)页/);
        if (pageInfoMatch) {
            totalPages = parseInt(pageInfoMatch[1]);
        } else {
            $('.pagelink a, .pagination a, [class*="page"] a').each((_, link) => {
                const text = $(link).text().trim();
                const match = text.match(/\d+/);
                if (match && parseInt(match[0]) > totalPages) {
                    totalPages = parseInt(match[0]);
                }
            });
        }

        const startIndex = offsetInSourcePage;
        const endIndex = Math.min(startIndex + limit, animeList.length);
        
        let finalAnimeList = animeList.slice(startIndex, endIndex);

        // If we need items from the next page to fulfill the 24 limit
        if (endIndex > animeList.length && sourcePage < totalPages) {
            try {
                const nextUrl = this.buildListUrl(filters, sourcePage + 1);
                const nextHtml = await this.fetchHtml(nextUrl);
                const $next = cheerio.load(nextHtml);
                const nextList = [];
                // Simplified parse for the tail items
                $next('.public-list-box').each((_, element) => {
                    const $box = $next(element);
                    const $link = $box.find('a[href*="/bangumi/"]');
                    const $img = $box.find('img');
                    if ($link.length && $img.length) {
                        const href = $link.attr('href');
                        const match = href.match(/\/bangumi\/(\d+)\.html/);
                        if (match && match[1]) {
                            let cover = $img.attr('data-src') || $img.attr('src') || '';
                            if (!cover.startsWith('http')) cover = '/api/placeholder-image';
                            nextList.push({
                                id: match[1],
                                title: $img.attr('alt') || $link.attr('title') || '',
                                cover,
                                type: 'TV', year: '', episodes: '未知', status: '已完结', score: '5.5',
                                channel: filters.channel || 'tv'
                            });
                        }
                    }
                });
                
                const needed = limit - finalAnimeList.length;
                finalAnimeList = finalAnimeList.concat(nextList.slice(0, needed));
            } catch (err) {
                this.warn('Failed to fetch next page tail', err.message);
            }
        }

        const totalItems = totalPages * ITEMS_PER_PAGE_ON_SOURCE;
        const userTotalPages = Math.ceil(totalItems / limit);

        return {
            animeList: finalAnimeList,
            currentPage: page,
            totalPages: userTotalPages,
            totalCount: totalItems,
            filters
        };
    }

    async searchAnime(keyword, pageStr = 1) {
        if (!keyword || keyword.trim().length < 2) {
            throw new Error('搜索关键词至少需要2个字符');
        }

        const searchUrl = `https://www.cycani.org/search?wd=${encodeURIComponent(keyword)}`;
        this.log(`Search: ${searchUrl}`);
        
        const html = await this.fetchHtml(searchUrl);
        const $ = cheerio.load(html);
        const animeList = [];

        $('.lp-pic-list > li, .search-result .item').each((_, element) => {
            const $item = $(element);
            const $link = $item.find('a').first();
            const $img = $item.find('img').first();

            if ($link.length) {
                const href = $link.attr('href');
                const title = $img.attr('alt') || $link.text().trim() || '';
                const imgSrc = $img.attr('src') || '';
                const animeIdMatch = href ? href.match(/\/bangumi\/(\d+)\.html/) : null;

                if (animeIdMatch && animeIdMatch[1] && title) {
                    animeList.push({
                        id: animeIdMatch[1],
                        title: title,
                        cover: imgSrc.startsWith('http') ? imgSrc : `https://www.cycani.org${imgSrc}`,
                        url: `https://www.cycani.org${href}`,
                        status: '未知', // Search results usually lack these on cycani
                        episodes: '未知',
                        year: '',
                        score: '',
                        type: '未知'
                    });
                }
            }
        });

        return {
            animeList,
            currentPage: 1,
            totalPages: 1, // Cycani search doesn't usually paginate well in this structure
            totalCount: animeList.length
        };
    }

    async getWeeklySchedule(dayFilter = 'all') {
        const scheduleData = {
            monday: [], tuesday: [], wednesday: [], thursday: [],
            friday: [], saturday: [], sunday: []
        };

        const weeklyUrl = 'https://www.cycani.org/index.php/label/weekday.html';
        try {
            const html = await this.fetchHtml(weeklyUrl);
            const $ = cheerio.load(html);

            $('.content, .schedule, .weekday, .daily, .main, .container').each((_, element) => {
                const $section = $(element);
                const text = $section.text().trim();
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
                        $section.find('a[href*="/bangumi/"], a[href*="/watch/"]').each((_, link) => {
                            const $link = $(link);
                            const href = $link.attr('href');
                            const title = $link.text().trim() || $link.attr('title') || '';
                            if (!title || title.length < 2) return;

                            let animeId = null;
                            if (href?.includes('/bangumi/')) {
                                const match = href.match(/\/bangumi\/(\d+)\.html/);
                                if (match) animeId = match[1];
                            } else if (href?.includes('/watch/')) {
                                const match = href.match(/\/watch\/(\d+)\/\d+\/\d+\.html/);
                                if (match) animeId = match[1];
                            }

                            if (animeId) {
                                const parentText = $link.closest('div, li, span, p').text().trim();
                                const timeMatch = parentText.match(/(\d+\|[^|\s]+)/);
                                const isCompleted = parentText.includes('已完结') || parentText.includes('完结');

                                scheduleData[day].push({
                                    id: animeId,
                                    title: title,
                                    cover: '', 
                                    status: isCompleted ? '已完结' : '连载中',
                                    broadcastTime: timeMatch ? timeMatch[1] : '',
                                    day: day
                                });
                            }
                        });
                    }
                }
            });
        } catch (e) {
            this.warn('Weekly page request failed: ' + e.message);
        }

        const isEmpty = Object.values(scheduleData).every(dayList => dayList.length === 0);
        if (isEmpty) {
            this.warn('Weekly page returned empty data, attempting to parse from home page...');
            try {
                const homeHtml = await this.fetchHtml('https://www.cycani.org/');
                const $h = cheerio.load(homeHtml);
                $h('a[href*="/bangumi/"], a[href*="/watch/"]').each((_, link) => {
                    const $link = $h(link);
                    const href = $link.attr('href');
                    const title = $link.text().trim() || $link.attr('title') || '';
                    if (!title || title.length < 2) return;

                    const parentText = $link.closest('.public-list-box, .public-list-div, li, div').text().trim();
                    const dayMatch = parentText.match(/(周一|周二|周三|周四|周五|周六|周日|星期一|星期二|星期三|星期四|星期五|星期六|星期日)/);
                    if (dayMatch) {
                        let animeId = null;
                        if (href?.includes('/bangumi/')) {
                            const match = href.match(/\/bangumi\/(\d+)\.html/);
                            if (match) animeId = match[1];
                        } else if (href?.includes('/watch/')) {
                            const match = href.match(/\/watch\/(\d+)\/\d+\/\d+\.html/);
                            if (match) animeId = match[1];
                        }

                        if (animeId) {
                            let dayKey = 'monday';
                            if (/周二|星期二/.test(dayMatch[1])) dayKey = 'tuesday';
                            else if (/周三|星期三/.test(dayMatch[1])) dayKey = 'wednesday';
                            else if (/周四|星期四/.test(dayMatch[1])) dayKey = 'thursday';
                            else if (/周五|星期五/.test(dayMatch[1])) dayKey = 'friday';
                            else if (/周六|星期六/.test(dayMatch[1])) dayKey = 'saturday';
                            else if (/周日|星期日/.test(dayMatch[1])) dayKey = 'sunday';

                            const timeMatch = parentText.match(/(\d+\|[^|\s]+)/);
                            const isCompleted = parentText.includes('已完结') || parentText.includes('完结');

                            if (!scheduleData[dayKey].find(a => a.id === animeId)) {
                                let cover = '';
                                const $img = $link.find('img').first();
                                if (!$img.length) {
                                    // Sometimes the image is in a parent/sibling element depending on HTML structure
                                    const $parentBox = $link.closest('.public-list-box, .public-list-div');
                                    const $boxImg = $parentBox.find('img').first();
                                    if ($boxImg.length) cover = $boxImg.attr('data-src') || $boxImg.attr('src') || '';
                                } else {
                                    cover = $img.attr('data-src') || $img.attr('src') || '';
                                }
                                // Ensure absolute URL
                                if (cover && !cover.startsWith('http')) {
                                    cover = cover.startsWith('//') ? 'https:' + cover : 'https://www.cycani.org' + cover;
                                }

                                scheduleData[dayKey].push({
                                    id: animeId,
                                    title: title,
                                    cover: cover,
                                    status: isCompleted ? '已完结' : '连载中',
                                    broadcastTime: timeMatch ? timeMatch[1] : '',
                                    day: dayKey
                                });
                            }
                        }
                    }
                });
            } catch (fallbackError) {
                this.warn('Fallback to home page also failed', fallbackError.message);
                // Don't throw here if we failed to parse home page, just return empty
            }
        }

        if (dayFilter !== 'all' && scheduleData[dayFilter]) {
            return { [dayFilter]: scheduleData[dayFilter] };
        }
        return scheduleData;
    }

    async getAnimeDetail(animeId) {
        const detailUrl = `https://www.cycani.org/bangumi/${animeId}.html`;
        this.log(`Get Detail: ${detailUrl}`);
        
        const html = await this.fetchHtml(detailUrl);
        const $ = cheerio.load(html);
        
        let title = this._parseTitle($, animeId);

        let cover = $('.detail-pic img.lazy').attr('data-src') || $('.detail-pic img').attr('src') || '';
        let description = $('#height_limit').text().trim() || $('meta[name="description"]').attr('content') || '';
        let year = $('.slide-info-remarks a[href*="/search/year/"]').first().text().trim() || '';
        let type = $('title').text().includes('剧场番组') ? '剧场' : 'TV';

        const episodes = await this._parseEpisodes($, animeId);

        return {
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
        };
    }

    async getEpisodeList(animeId) {
        const detailUrl = `https://www.cycani.org/bangumi/${animeId}.html`;
        const html = await this.fetchHtml(detailUrl);
        const $ = cheerio.load(html);
        return await this._parseEpisodes($, animeId);
    }

    _parseTitle($, animeId) {
        let title = '';

        // 策略1: 尝试从页面标题获取 - 通用正则表达式解析
        const pageTitle = $('title').text().trim();
        let titleMatch = pageTitle.match(/^(.+?)_第\d+集_/);
        if (!titleMatch) {
            titleMatch = pageTitle.match(/^(.+?)_(?:TV番组|剧场番组)/);
        }
        if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
        }

        // 策略2: 尝试从h1标签获取
        if (!title) {
            const fullTitle = $('h1').text().trim() || '';
            const titleText = fullTitle.replace(/_TV番组.*$/, '').trim();
            if (titleText && titleText !== '未知动画') {
                title = titleText;
            }
        }

        // 策略3: 尝试多个可能的标题选择器
        if (!title || title === '未知动画') {
            const selectors = [
                '.this-title',
                '.player-title-link',
                'h2 .player-title-link',
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
                    break;
                }
            }
        }

        // 策略4: 特殊ID硬编码修复
        if (!title || title === '未知动画') {
            if (animeId === '5998') {
                title = '间谍过家家 第三季';
            }
        }

        // 策略5: 从 JavaScript player_aaaa 对象提取标题
        if (!title || title === '未知动画') {
            const scriptContent = $('script:contains("player_aaaa")').html();
            if (scriptContent) {
                const vodNameMatch = scriptContent.match(/"vod_name"\s*:\s*"((?:\\u[0-9a-fA-F]{4})+)"/);
                if (vodNameMatch && vodNameMatch[1]) {
                    try {
                        const decodedTitle = vodNameMatch[1].replace(/\\u([0-9a-fA-F]{4})/g,
                            (match, hex) => String.fromCharCode(parseInt(hex, 16))
                        );
                        if (decodedTitle && decodedTitle !== '未知动画') {
                            title = decodedTitle;
                        }
                    } catch (error) {}
                }
            }
        }

        if (!title || title === '未知动画') {
            title = '未知动画';
        }

        return title;
    }

    async _parseEpisodes($, animeId) {
        const episodes = [];
        $(`a[href*="/watch/${animeId}/"]`).each((_, element) => {
            const $link = $(element);
            const href = $link.attr('href');
            const title = $link.text().trim();
            if (href && title) {
                const match = href.match(new RegExp(`/watch/${animeId}/(\\d+)/(\\d+)\\.html`));
                if (match) {
                    const source = parseInt(match[1]);
                    const episode = parseInt(match[2]);
                    if (source === 1 && !episodes.find(ep => ep.episode === episode)) {
                        episodes.push({
                            season: 1,
                            episode,
                            title,
                            url: `https://www.cycani.org${href}`
                        });
                    }
                }
            }
        });
        return episodes.sort((a, b) => a.episode - b.episode);
    }

    async getVideoUrl(animeId, season, episode) {
        const targetUrl = `https://www.cycani.org/watch/${animeId}/${season}/${episode}.html`;
        this.log(`Get Video: ${targetUrl}`);
        
        const html = await this.fetchHtml(targetUrl);
        const $ = cheerio.load(html);

        const scripts = $('script').map((_, el) => $(el).html()).get();
        let videoData = null;

        for (const script of scripts) {
            if (script && script.includes('player_aaaa')) {
                const patterns = [
                    /var\s+player_aaaa\s*=\s*({[^;]+});?/,
                    /player_aaaa\s*=\s*({[^;]+});?/,
                    /window\.player_aaaa\s*=\s*({[^;]+});?/
                ];
                for (const pattern of patterns) {
                    const match = script.match(pattern);
                    if (match) {
                        try {
                            videoData = JSON.parse(match[1]);
                            break;
                        } catch (e1) {
                            try {
                                let fixedJson = match[1].replace(/(\w+):/g, '"$1":').replace(/'/g, '"');
                                videoData = JSON.parse(fixedJson);
                                break;
                            } catch (e2) {}
                        }
                    }
                }
                if (videoData) break;
            }
        }

        if (!videoData || !videoData.url) {
            throw new Error('Could not find encrypted video URL in page');
        }

        const originalEncryptedUrl = decryptVideoUrl(videoData.url);
        if (!originalEncryptedUrl) {
            throw new Error('Failed to decrypt original video URL');
        }

        const realVideoUrl = await resolveVideoUrl(originalEncryptedUrl, targetUrl, this.browserPool);
        
        if (!realVideoUrl) {
            throw new Error('Could not resolve actual media URL from player page');
        }

        let expiresAt = null;
        try {
            const parsedUrl = new URL(realVideoUrl);
            const expiresParam = parsedUrl.searchParams.get('x-expires');
            if (expiresParam) {
                const timestamp = Number.parseInt(expiresParam, 10) * 1000;
                if (Number.isFinite(timestamp)) expiresAt = timestamp;
            }
        } catch (e) {}

        return {
            url: realVideoUrl,
            headers: {
                'Referer': 'https://player.cycanime.com/'
            },
            expiresAt
        };
    }
}

module.exports = CycaniPlugin;
