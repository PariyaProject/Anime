const express = require('express');
const router = express.Router();
const { requireAuth } = require('../AuthManager');
const { pluginManager } = require('../plugins/PluginManager');
const { videoUrlCacheManager } = require('../VideoUrlCacheManager');
const { httpClient, getEnhancedHeaders } = require('../httpClient');

function isValidVideoUrl(url) { return url && url.startsWith('http'); }

function sendRouteError(res, error, fallbackMessage = '请求上游站点失败') {
    res.status(error?.statusCode || 500).json({
        success: false,
        error: error?.message || fallbackMessage,
        code: error?.code || undefined
    });
}

function serializeEpisodeResponse(entry, cacheHit) {
    return {
        bangumiId: entry.bangumiId,
        season: entry.season,
        episode: entry.episode,
        title: entry.title || `第 ${entry.episode} 集`,
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

// Helper to fetch and cache video url from plugin
async function resolveAndCacheEpisodeVideo({ source, bangumiId, season, episode }) {
    const cacheKey = videoUrlCacheManager.buildKey(source, bangumiId, season, episode);
    const plugin = pluginManager.getPlugin(source);
    
    // Fetch from plugin
    const videoResult = await plugin.getVideoUrl(bangumiId, season, episode);
    
    return videoUrlCacheManager.setEntry(cacheKey, {
        bangumiId,
        season: Number(season),
        episode: Number(episode),
        title: `第 ${episode} 集`,
        realVideoUrl: videoResult.url,
        expiresAt: videoResult.expiresAt || null,
        fetchedAt: Date.now()
    });
}

// API路由 - 获取剧集信息
router.get('/api/episode/:bangumiId/:season/:episode', requireAuth, async (req, res) => {
    try {
        const { bangumiId, season, episode } = req.params;
        const { source } = req.query;
        
        const cacheKey = videoUrlCacheManager.buildKey(source, bangumiId, season, episode);

        console.log(`🔍 获取剧集信息: ${source} - ${bangumiId} S${season}E${episode}`);

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
                return { entry: recheckedEntry, cacheHit: true };
            }

            const refreshedEntry = await resolveAndCacheEpisodeVideo({
                source, bangumiId, season, episode
            });

            return { entry: refreshedEntry, cacheHit: false };
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
        const { source } = req.query;
        
        const cacheKey = videoUrlCacheManager.buildKey(source, animeId, season, episode);

        console.log(`🔄 刷新视频URL: ${source} - ${animeId} S${season}E${episode}`);

        const refreshedEntry = await videoUrlCacheManager.withInFlight(cacheKey, async () => (
            resolveAndCacheEpisodeVideo({
                source, bangumiId: animeId, season, episode
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

        if (!url || !isValidVideoUrl(url)) {
            return res.status(400).json({ success: false, error: '无效的视频URL' });
        }

        res.json({
            success: true,
            videoUrl: url,
            proxyUrl: `/api/stream?url=${encodeURIComponent(url)}`
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 视频流代理（如果需要）
router.get('/api/stream', requireAuth, async (req, res) => {
    try {
        const { url } = req.query;

        if (!url || !isValidVideoUrl(url)) {
            return res.status(400).send('Invalid video URL');
        }

        const response = await httpClient.get(url, {
            headers: {
                ...getEnhancedHeaders(url),
                'Range': req.headers.range || ''
            },
            responseType: 'stream'
        });

        res.writeHead(response.status, response.headers);
        response.data.pipe(res);

    } catch (error) {
        console.error('❌ 流代理失败:', error.message);
        res.status(500).send('Stream proxy failed');
    }
});

module.exports = router;
