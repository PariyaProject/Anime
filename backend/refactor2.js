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
    // ---- 1. EXTRACT BROWSER POOL ----
    const poolStart = code.indexOf('// 尝试引入Puppeteer');
    const poolEnd = code.indexOf('const app = express();');
    const poolCode = code.slice(poolStart, poolEnd);
    code = code.slice(0, poolStart) + "const { browserPool } = require('./puppeteerPool');\n" + code.slice(poolEnd);
    
    fs.writeFileSync(path.join(__dirname, 'src/puppeteerPool.js'), poolCode + "\nmodule.exports = { browserPool };\n");

    // ---- 2. EXTRACT SYSTEM ROUTES ----
    const healthCode = extractBlock('// API路由 - 轻量级健康检查端点', '// API路由 - 获取剧集信息');
    // For image proxy, wait, anime list is between refresh and image proxy in the original file
} catch(e) {
    console.error(e);
}
