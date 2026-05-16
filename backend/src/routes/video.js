const express = require('express');
const router = express.Router();
const cheerio = require('cheerio');
const { getEnhancedHeaders } = require('../httpClient');
const axios = require('axios');
const CryptoJS = require('crypto-js');
const { browserPool, puppeteer } = require('../puppeteerPool');
const { requireAuth } = require('../AuthManager');
const { videoUrlCacheManager } = require('../VideoUrlCacheManager');
const { UpstreamAccessError, applyBrowserNetworkProfile, fetchUpstreamHtml } = require('../upstreamAccess');
function isValidVideoUrl(url) { return url && url.startsWith('http'); }

// Extracted from the current player.cycanime.com setting.js decryption flow.
const PLAYER_DECRYPTION_SALT = 'YLwJVbXw77pk2eOrAnFdBo2c3mWkLtodMni2wk81GCnP94ZltW';

function sendRouteError(res, error, fallbackMessage = '请求上游站点失败') {
    res.status(error?.statusCode || 500).json({
        success: false,
        error: error?.message || fallbackMessage,
        code: error?.code || undefined
    });
}

// API路由 - 获取剧集信息
router.get('/api/episode/:bangumiId/:season/:episode', requireAuth, async (req, res) => {
    try {
        const { bangumiId, season, episode } = req.params;
        const cacheKey = videoUrlCacheManager.buildKey(bangumiId, season, episode);
        const targetUrl = `https://www.cycani.org/watch/${bangumiId}/${season}/${episode}.html`;

        console.log(`🔍 获取剧集信息: ${targetUrl}`);

        const reusableEntry = videoUrlCacheManager.getReusableEntry(cacheKey);
        if (reusableEntry) {
            console.log(`♻️ 命中视频链接缓存: ${cacheKey}`);
            return res.json({
                success: true,
                data: serializeEpisodeResponse(reusableEntry, true)
            });
        }

        const { entry, cacheHit } = await videoUrlCacheManager.withInFlight(cacheKey, async () => {
            const recheckedEntry = videoUrlCacheManager.getReusableEntry(cacheKey);
            if (recheckedEntry) {
                return {
                    entry: recheckedEntry,
                    cacheHit: true
                };
            }

            const refreshedEntry = await resolveAndCacheEpisodeVideo({
                bangumiId,
                season,
                episode,
                targetUrl,
                preferCachedMetadata: true,
                allowMissingVideoUrl: true
            });

            return {
                entry: refreshedEntry,
                cacheHit: false
            };
        });

        res.json({
            success: true,
            data: serializeEpisodeResponse(entry, cacheHit)
        });

    } catch (error) {
        console.error('❌ 获取剧集信息失败:', error.message);
        sendRouteError(res, error, '获取剧集信息失败');
    }
});


// API路由 - 刷新视频URL (处理过期URL)
router.get('/api/refresh-video-url/:animeId/:season/:episode', requireAuth, async (req, res) => {
    try {
        const { animeId, season, episode } = req.params;
        const cacheKey = videoUrlCacheManager.buildKey(animeId, season, episode);
        const targetUrl = `https://www.cycani.org/watch/${animeId}/${season}/${episode}.html`;

        console.log(`🔄 刷新视频URL: ${targetUrl}`);

        const refreshedEntry = await videoUrlCacheManager.withInFlight(cacheKey, async () => (
            resolveAndCacheEpisodeVideo({
                bangumiId: animeId,
                season,
                episode,
                targetUrl,
                forceReloadMetadata: true,
                preferCachedMetadata: true
            })
        ));

        res.json({
            success: true,
            data: serializeRefreshResponse(refreshedEntry)
        });

    } catch (error) {
        console.error('❌ 刷新视频URL失败:', error.message);
        sendRouteError(res, error, '刷新视频URL失败');
    }
});


// API路由 - 视频代理
router.get('/api/video-proxy', requireAuth, async (req, res) => {
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
router.get('/api/stream', requireAuth, async (req, res) => {
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
        const rawTitle = $('title').text() || '未知剧集';
        // 支持TV番组和剧场番组的标题格式
        const title = rawTitle.replace(/_(?:TV番组|剧场番组).*$/, '').trim();

        return {
            title,
            originalEncryptedUrl: videoData?.url ? decryptVideoUrl(videoData.url) : null
        };

    } catch (error) {
        console.error('解析页面数据失败:', error);
        return {
            title: '解析失败',
            originalEncryptedUrl: null
        };
    }
}

async function fetchEpisodeMetadata(targetUrl) {
    const html = await fetchUpstreamHtml(targetUrl, {
        timeout: 10000
    });
    const $ = cheerio.load(html);
    return parseEpisodeData($);
}

function parseVideoUrlExpiration(videoUrl) {
    if (!videoUrl) {
        return null;
    }

    try {
        const url = new URL(videoUrl);
        const expiresParam = url.searchParams.get('x-expires');
        if (!expiresParam) {
            return null;
        }

        const expiresAt = Number.parseInt(expiresParam, 10) * 1000;
        return Number.isFinite(expiresAt) ? expiresAt : null;
    } catch (_error) {
        return null;
    }
}

function serializeEpisodeResponse(entry, cacheHit) {
    return {
        bangumiId: entry.bangumiId,
        season: entry.season,
        episode: entry.episode,
        title: entry.title,
        realVideoUrl: entry.realVideoUrl,
        videoUrlCacheHit: cacheHit,
        videoUrlExpiresAt: entry.expiresAt,
        videoUrlFetchedAt: entry.fetchedAt
    };
}

function serializeRefreshResponse(entry) {
    return {
        realVideoUrl: entry.realVideoUrl,
        videoUrlCacheHit: false,
        videoUrlExpiresAt: entry.expiresAt,
        videoUrlFetchedAt: entry.fetchedAt
    };
}

async function resolveAndCacheEpisodeVideo({
    bangumiId,
    season,
    episode,
    targetUrl,
    preferCachedMetadata = true,
    forceReloadMetadata = false,
    allowMissingVideoUrl = false
}) {
    const cacheKey = videoUrlCacheManager.buildKey(bangumiId, season, episode);
    const cachedEntry = preferCachedMetadata ? videoUrlCacheManager.peek(cacheKey) : null;

    let metadata = forceReloadMetadata ? null : cachedEntry;
    let originalEncryptedUrl = metadata?.originalEncryptedUrl || null;
    let resolvedTitle = metadata?.title || null;

    if (!originalEncryptedUrl) {
        metadata = await fetchEpisodeMetadata(targetUrl);
        originalEncryptedUrl = metadata.originalEncryptedUrl;
        resolvedTitle = metadata.title || resolvedTitle;
    }

    let realVideoUrl = null;
    if (originalEncryptedUrl) {
        console.log('🔍 尝试获取真实视频URL:', originalEncryptedUrl);
        realVideoUrl = await parsePlayerPage(originalEncryptedUrl, targetUrl);
    }

    if (!realVideoUrl) {
        if (!forceReloadMetadata && cachedEntry && cachedEntry.originalEncryptedUrl === originalEncryptedUrl) {
            metadata = await fetchEpisodeMetadata(targetUrl);
            originalEncryptedUrl = metadata.originalEncryptedUrl;
            resolvedTitle = metadata.title || resolvedTitle;

            if (originalEncryptedUrl) {
                console.log('🔄 使用最新剧集页元数据重试真实视频URL解析');
                realVideoUrl = await parsePlayerPage(originalEncryptedUrl, targetUrl);
            }
        }
    }

    if (!realVideoUrl) {
        if (allowMissingVideoUrl) {
            return {
                bangumiId,
                season: Number(season),
                episode: Number(episode),
                title: resolvedTitle || `第 ${episode} 集`,
                originalEncryptedUrl,
                realVideoUrl: null,
                expiresAt: null,
                fetchedAt: Date.now()
            };
        }

        throw new Error('无法获取可播放的视频链接');
    }

    console.log('✅ 成功获取真实视频URL:', realVideoUrl.substring(0, 100) + '...');

    return videoUrlCacheManager.setEntry(cacheKey, {
        bangumiId,
        season: Number(season),
        episode: Number(episode),
        title: resolvedTitle || `第 ${episode} 集`,
        originalEncryptedUrl,
        realVideoUrl,
        expiresAt: parseVideoUrlExpiration(realVideoUrl),
        fetchedAt: Date.now()
    });
}

// 解析播放器页面获取真实视频URL
async function parsePlayerPage(videoId, refererUrl = 'https://www.cycani.org/') {
    try {
        const playerUrl = `https://player.cycanime.com/?url=${videoId}`;
        console.log(`🎬 解析播放器页面: ${playerUrl}`);
        console.log(`📌 使用 Referer: ${refererUrl}`);

        // 方法1: 直接解密播放器 HTML 中的 config.url，避免依赖跨域 iframe 行为
        console.log('📡 尝试HTTP+AES解密方法...');
        const realVideoUrl = await parseWithAxios(playerUrl, refererUrl);

        if (realVideoUrl) {
            console.log(`✅ HTTP方法成功: ${realVideoUrl.substring(0, 100) + '...'}`);
            return realVideoUrl;
        }

        // 方法2: 仍保留 Puppeteer 作为兜底，兼容后续播放器实现变化
        if (puppeteer) {
            console.log('🤖 HTTP解密未命中，尝试使用Puppeteer从video元素读取URL...');
            const videoUrl = await getVideoUrlFromPuppeteer(playerUrl, refererUrl);
            if (videoUrl) {
                console.log(`✅ Puppeteer成功: ${videoUrl.substring(0, 80)}...`);
                return videoUrl;
            }
            console.log('⚠️ Puppeteer方法失败');
        }

        console.log('❌ 所有方法都失败');
        return null;

    } catch (error) {
        if (error instanceof UpstreamAccessError) {
            throw error;
        }
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
        const browser = await browserPool.getBrowser({ useProxy: true });

        page = await browser.newPage();
        await applyBrowserNetworkProfile(page, refererUrl, refererUrl, true);

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

        // 直接等待 video 元素出现并获取其 src（最多等待 10 秒）
        let videoUrl = null;
        try {
            await targetFrame.waitForSelector('video[src]', { timeout: 10000 });

            videoUrl = await targetFrame.evaluate(() => {
                const video = document.querySelector('video');
                return video ? video.currentSrc : null;
            });

            if (videoUrl && typeof videoUrl === 'string') {
                console.log(`✅ 成功获取视频URL: ${videoUrl.substring(0, 80)}...`);
            } else {
                console.log(`⚠️ video 元素存在但未找到 src`);
            }
        } catch (e) {
            console.log(`⚠️ 超时后仍未找到 video 元素: ${e.message}`);
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
async function parseWithAxios(playerUrl, refererUrl = 'https://www.cycani.org/') {
    try {
        console.log(`🌐 获取播放器页面: ${playerUrl}`);
        const origin = new URL(refererUrl).origin;
        const html = await fetchUpstreamHtml(playerUrl, {
            timeout: 10000,
            allowBrowserFallback: false,
            useProxy: true,
            headers: {
                Referer: refererUrl,
                Origin: origin
            }
        });

        const $ = cheerio.load(html);
        console.log('📄 页面标题:', $('title').text());

        const decryptedConfigUrl = decryptPlayerConfigUrl($, html);
        if (decryptedConfigUrl) {
            console.log('✅ 方法0 (config.url 解密): 找到视频源');
            return decryptedConfigUrl;
        }

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
        const htmlContent = html;
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
        if (error instanceof UpstreamAccessError) {
            throw error;
        }
        console.error('❌ Axios解析失败:', error.message);
        return null;
    }
}

function decryptPlayerConfigUrl($, html) {
    try {
        const encryptedUrl = extractPlayerConfigUrl(html);
        if (!encryptedUrl) {
            return null;
        }

        const viewportMetaId = $('meta[name="viewport"]').attr('id') || '';
        const charsetMetaId = $('meta[charset="UTF-8"]').attr('id') || $('meta[charset]').attr('id') || '';
        const viewportSeed = viewportMetaId.replace(/^now_/, '');
        const charsetSeed = charsetMetaId.replace(/^now_/, '');

        if (!viewportSeed || !charsetSeed || viewportSeed.length !== charsetSeed.length) {
            return null;
        }

        const orderedSeed = charsetSeed
            .split('')
            .map((digit, index) => ({
                id: Number.parseInt(digit, 10),
                text: viewportSeed[index] || ''
            }))
            .filter((entry) => Number.isFinite(entry.id) && entry.text)
            .sort((left, right) => left.id - right.id)
            .map((entry) => entry.text)
            .join('');

        if (!orderedSeed) {
            return null;
        }

        const md5 = CryptoJS.MD5(`${orderedSeed}${PLAYER_DECRYPTION_SALT}`).toString();
        const key = CryptoJS.enc.Utf8.parse(md5.slice(16));
        const iv = CryptoJS.enc.Utf8.parse(md5.slice(0, 16));
        const decrypted = CryptoJS.AES.decrypt(encryptedUrl, key, {
            iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        }).toString(CryptoJS.enc.Utf8);

        return decrypted && decrypted.startsWith('http') ? decrypted : null;
    } catch (error) {
        console.warn('⚠️ config.url 解密失败:', error.message);
        return null;
    }
}

function extractPlayerConfigUrl(html) {
    if (!html) {
        return null;
    }

    const urlMatch = html.match(/"url"\s*:\s*"([^"]+)"/);
    return urlMatch?.[1] || null;
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


module.exports = router;
