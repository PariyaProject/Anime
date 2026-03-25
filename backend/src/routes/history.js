const express = require('express');
const router = express.Router();
const { WatchHistoryManager } = require('../WatchHistoryManager');

// 观看历史API路由
router.post('/api/watch-history', async (req, res) => {
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

router.get('/api/watch-history', async (req, res) => {
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

router.get('/api/continue-watching', async (req, res) => {
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

router.get('/api/last-position/:animeId/:season/:episode', async (req, res) => {
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


module.exports = router;
