const express = require('express');
const router = express.Router();
const { getAnimeIndexManager } = require('../animeIndexManager');
const { requireAuth } = require('../AuthManager');
const { pluginManager } = require('../plugins/PluginManager');

function sendRouteError(res, error, fallbackMessage = '请求上游站点失败') {
    res.status(error?.statusCode || 500).json({
        success: false,
        error: error?.message || fallbackMessage,
        code: error?.code || undefined
    });
}

// API路由 - 获取动画列表
router.get('/api/anime-list', requireAuth, async (req, res) => {
    try {
        const { source, page = 1, ...filters } = req.query;
        const plugin = pluginManager.getPlugin(source);
        
        const data = await plugin.getAnimeList(filters, page);
        
        // Asynchronously update local index
        if (data && data.animeList && data.animeList.length > 0) {
            getAnimeIndexManager().incrementalUpdate(data.animeList, source).catch(console.error);
        }
        
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('❌ 获取动画列表失败:', error.message);
        sendRouteError(res, error, '获取动画列表失败');
    }
});

// API路由 - 获取每周时间表
router.get('/api/weekly-schedule', requireAuth, async (req, res) => {
    try {
        const { source, day = 'all' } = req.query;
        const plugin = pluginManager.getPlugin(source);
        
        const data = await plugin.getWeeklySchedule(day);
        
        res.json({
            success: true,
            data: {
                schedule: data,
                updated: new Date().toISOString(),
                filter: day
            }
        });
    } catch (error) {
        console.error('❌ 获取每周时间表失败:', error.message);
        sendRouteError(res, error, '获取每周时间表失败');
    }
});

// API路由 - 搜索动画 (Legacy remote search)
router.get('/api/search-anime', requireAuth, async (req, res) => {
    try {
        const { source, q, page = 1 } = req.query;
        const plugin = pluginManager.getPlugin(source);

        const data = await plugin.searchAnime(q, page);

        res.json({
            success: true,
            data: {
                animeList: data.animeList,
                searchQuery: q,
                totalCount: data.totalCount
            }
        });
    } catch (error) {
        console.error('❌ 搜索动画失败 (legacy):', error.message);
        sendRouteError(res, error, '搜索动画失败');
    }
});

// API路由 - 本地搜索 (New - uses local index)
router.get('/api/search-local', requireAuth, async (req, res) => {
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

        if (stats.isBuilding) {
            return res.status(503).json({
                success: false,
                error: '索引正在构建中，请稍后再试',
                isBuilding: true
            });
        }

        if (stats.totalAnime === 0) {
            return res.status(503).json({
                success: false,
                error: '索引尚未构建，请先构建索引',
                isEmpty: true
            });
        }

        const results = indexManager.search(q);

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
        res.status(500).json({ success: false, error: error.message });
    }
});

// API路由 - 索引状态
router.get('/api/index-status', requireAuth, async (req, res) => {
    try {
        const indexManager = getAnimeIndexManager();
        const stats = indexManager.getIndexStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API路由 - 重建索引 (Admin only)
router.post('/api/index-rebuild', requireAuth, async (req, res) => {
    try {
        const indexManager = getAnimeIndexManager();
        if (indexManager.isBuilding) {
            return res.status(409).json({
                success: false, error: '索引已在构建中', isBuilding: true
            });
        }
        indexManager.buildInitialIndex().catch(e => console.error(e));
        res.json({ success: true, message: '索引重建已启动' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API路由 - 获取动画详情
router.get('/api/anime/:animeId', requireAuth, async (req, res) => {
    try {
        const { animeId } = req.params;
        const { source } = req.query;
        const plugin = pluginManager.getPlugin(source);

        const data = await plugin.getAnimeDetail(animeId);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('❌ 获取动画详情失败:', error.message);
        sendRouteError(res, error, '获取动画详情失败');
    }
});

module.exports = router;
