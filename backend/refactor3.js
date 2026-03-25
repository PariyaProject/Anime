const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'src/server.js');
let code = fs.readFileSync(serverPath, 'utf8');

function extractBlock(startMarker, endMarker) {
    const start = code.indexOf(startMarker);
    if (start === -1) throw new Error("Start marker not found: " + startMarker);
    const end = code.indexOf(endMarker, start);
    if (end === -1) throw new Error("End marker not found: " + endMarker);
    const block = code.slice(start, end);
    code = code.slice(0, start) + code.slice(end);
    return block;
}

try {
    const urlConstructorBlock = extractBlock('// Initialize URL constructor', '// 获取动画真实集数的辅助函数');
    const animeEpisodeCount = extractBlock('// 获取动画真实集数的辅助函数', '// 主页路由');

    const healthRoute = extractBlock('// API路由 - 轻量级健康检查端点', '// API路由 - 获取剧集信息');
    const episodeRoute = extractBlock('// API路由 - 获取剧集信息', '// API路由 - 刷新视频URL (处理过期URL)');
    const refreshRoute = extractBlock('// API路由 - 刷新视频URL (处理过期URL)', '// API路由 - 获取动画列表');
    const animeListRoute = extractBlock('// API路由 - 获取动画列表', '// 图片代理路由');
    const imageProxyRoute = extractBlock('// 图片代理路由', '// 占位符图片路由');
    
    // We must find what's after placeholderRoute. In refactor1.js, history was replaced with `const historyRoutes...`
    const placeholderRoute = extractBlock('// 占位符图片路由', 'const historyRoutes');
    
    const weeklyScheduleRoute = extractBlock('// API路由 - 每周番剧时间表', '// API路由 - 搜索动画');
    const searchLegacyRoute = extractBlock('// API路由 - 搜索动画', '// API路由 - 本地搜索');
    const searchLocalRoute = extractBlock('// API路由 - 本地搜索', '// API路由 - 索引状态');
    const indexStatusRoute = extractBlock('// API路由 - 索引状态', '// API路由 - 重建索引');
    const indexRebuildRoute = extractBlock('// API路由 - 重建索引 (Admin only)', '// API路由 - 获取动画详情');
    const animeDetailRoute = extractBlock('// API路由 - 获取动画详情', '// API路由 - 视频代理');
    const videoProxyRoute = extractBlock('// API路由 - 视频代理', '// 视频流代理（如果需要）');
    const streamRoute = extractBlock('// 视频流代理（如果需要）', '// 工具函数 - 解析剧集数据');
    const videoHelpers = extractBlock('// 工具函数 - 解析剧集数据', '// SPA fallback for Vue Router history mode');

    const systemContent = `const express = require('express');\nconst router = express.Router();\nconst { httpClient, getEnhancedHeaders } = require('../httpClient');\nconst axios = require('axios');\n\n` + 
    [healthRoute, imageProxyRoute, placeholderRoute].join('\n').replace(/app\.(get|post|put|delete)\('/g, "router.$1('") + 
    `\nmodule.exports = router;\n`;
    fs.writeFileSync(path.join(__dirname, 'src/routes/system.js'), systemContent);

    const animeContent = `const express = require('express');\nconst router = express.Router();\nconst cheerio = require('cheerio');\nconst { AnimeListUrlConstructor, ApiParameterValidator } = require('../urlConstructor');\nconst { httpClient } = require('../httpClient');\nconst { getAnimeIndexManager } = require('../animeIndexManager');\n\n` +
    urlConstructorBlock + "\n" + animeEpisodeCount + "\n" + 
    [animeListRoute, weeklyScheduleRoute, searchLegacyRoute, searchLocalRoute, indexStatusRoute, indexRebuildRoute, animeDetailRoute].join('\n').replace(/app\.(get|post|put|delete)\('/g, "router.$1('") + 
    `\nmodule.exports = router;\n`;
    fs.writeFileSync(path.join(__dirname, 'src/routes/anime.js'), animeContent);

    const videoContent = `const express = require('express');\nconst router = express.Router();\nconst cheerio = require('cheerio');\nconst { httpClient, getEnhancedHeaders } = require('../httpClient');\nconst axios = require('axios');\nconst { browserPool, puppeteer } = require('../puppeteerPool');\nfunction isValidVideoUrl(url) { return url && url.startsWith('http'); }\n\n` +
    [episodeRoute, refreshRoute, videoProxyRoute, streamRoute, videoHelpers].join('\n').replace(/app\.(get|post|put|delete)\('/g, "router.$1('") + 
    `\nmodule.exports = router;\n`;
    fs.writeFileSync(path.join(__dirname, 'src/routes/video.js'), videoContent);

    const routesAnchor = code.indexOf("const historyRoutes = require('./routes/history');");
    code = code.slice(0, routesAnchor) + 
       "const systemRoutes = require('./routes/system');\n" +
       "const animeRoutes = require('./routes/anime');\n" +
       "const videoRoutes = require('./routes/video');\n" +
       "app.use('/', systemRoutes);\n" +
       "app.use('/', animeRoutes);\n" +
       "app.use('/', videoRoutes);\n" +
       code.slice(routesAnchor);

    fs.writeFileSync(serverPath, code);
    console.log('SUCCESS');
} catch(e) {
    console.error(e.message);
}
