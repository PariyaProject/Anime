const express = require('express');
const router = express.Router();
const { httpClient, getEnhancedHeaders } = require('../httpClient');
const axios = require('axios');

// API路由 - 轻量级健康检查端点
router.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});


// 图片代理路由
router.get('/api/image-proxy', async (req, res) => {
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
router.get('/api/placeholder-image', (req, res) => {
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


module.exports = router;
