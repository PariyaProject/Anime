const express = require('express');
const router = express.Router();
const { WatchHistoryManager } = require('../WatchHistoryManager');
const { requireAuth } = require('../AuthManager');

// 观看历史API路由
router.post('/api/watch-history', requireAuth, async (req, res) => {
    try {
        const { animeInfo, episodeInfo, position = 0, sourceDeviceId = '' } = req.body;

        if (!animeInfo || !episodeInfo) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数'
            });
        }

        const watchRecord = await WatchHistoryManager.addToWatchHistory(
            req.authUser.id,
            animeInfo,
            episodeInfo,
            position,
            sourceDeviceId
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

router.get('/api/watch-history', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        if (!req.authUser) {
            return res.json({
                success: true,
                data: []
            });
        }

        const history = await WatchHistoryManager.getWatchHistory(req.authUser.id, parseInt(limit));

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

router.get('/api/continue-watching', async (req, res) => {
    try {
        if (!req.authUser) {
            return res.json({
                success: true,
                data: []
            });
        }

        const continueWatching = await WatchHistoryManager.getContinueWatching(req.authUser.id);

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

router.get('/api/last-position/:animeId/:season/:episode', async (req, res) => {
    try {
        if (!req.authUser) {
            return res.status(401).json({
                success: false,
                error: '请先登录'
            });
        }

        const { animeId, season, episode } = req.params;
        const position = await WatchHistoryManager.getLastPosition(
            req.authUser.id,
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


module.exports = router;
