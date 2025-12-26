# 视频解析流程文档

本文档详细说明了 Cycani 代理服务中视频 URL 解析的完整流程。

---

## 概述

视频解析的目标是从 cycani.org 获取加密的视频ID，然后通过 player.cycanime.com 播放器页面解密获取真实的视频播放地址。

---

## 完整流程

### 第一步：用户请求剧集信息

**API 端点**：`GET /api/episode/:bangumiId/:season/:episode`

**示例请求**：
```
GET /api/episode/6004/1/1
```

**目标页面**：`https://www.cycani.org/watch/6004/1/1.html`

---

### 第二步：获取剧集页面 HTML

```javascript
const response = await httpClient.get(targetUrl);
const $ = cheerio.load(response.data);
```

**获取内容**：剧集页面的完整 HTML，包含：
- 页面标题
- 剧集信息
- **关键：`<script>` 标签中的 `player_aaaa` 变量**

---

### 第三步：解析 `player_aaaa` 变量

**函数**：`parseEpisodeData($)`

#### 3.1 查找脚本

遍历页面所有 `<script>` 标签，找到包含 `player_aaaa` 的那个：

```javascript
const scripts = $('script').map((_, el) => $(el).html()).get();
for (const script of scripts) {
    if (script && script.includes('player_aaaa')) {
        // 找到了！
    }
}
```

#### 3.2 提取 JSON 数据

`player_aaaa` 变量的典型格式：
```javascript
var player_aaaa = {
    "url": "JTYzJTc5JTYzJTYxJTYlJTY5JTI...",
    "url_next": "JTYzJTc5JTYzJTYxJTYlJTY5JTI..."
};
```

使用正则表达式匹配提取：
```javascript
const patterns = [
    /var\s+player_aaaa\s*=\s*({[^;]+});?/,
    /player_aaaa\s*=\s*({[^;]+});?/,
    /window\.player_aaaa\s*=\s*({[^;]+});?/
];
```

#### 3.3 解析 JSON

```javascript
videoData = JSON.parse(match[1]);
// 得到:
// {
//   url: "JTYzJTc5JTYzJTYxJTYlJTY5JTI...",
//   url_next: "..."
// }
```

---

### 第四步：解密视频ID

**函数**：`decryptVideoUrl(videoData.url)`

#### 4.1 Base64 解码

```javascript
const base64Decoded = Buffer.from(encryptedUrl, 'base64').toString('utf8');
// "JTYzJTc5..." → "%63%79%63%61%6E%69%2D..."
```

#### 4.2 URL 解码

```javascript
const urlDecoded = decodeURIComponent(base64Decoded);
// "%63%79%63%61..." → "cycani-dcd01-40890417c254f4ca839391fe8fb334e01759801315"
```

**最终得到加密的视频ID**：`cycani-dcd01-40890417c254f4ca839391fe8fb334e01759801315`

---

### 第五步：解析播放器页面获取真实视频URL

**函数**：`parsePlayerPage(decryptedVideoId)`

#### 5.1 构建播放器URL

```
https://player.cycanime.com/?url=cycani-dcd01-40890417c254f4ca839391fe8fb334e01759801315
```

#### 5.2 方案一：Puppeteer（主要方案）

**函数**：`getVideoUrlFromPuppeteer(playerUrl)`

**流程**：
1. 从浏览器池获取浏览器实例（首次启动约 2-3 秒，后续复用约 0.5-1 秒）
2. 创建新页面
3. **设置关键 HTTP 头**：
   ```javascript
   await page.setExtraHTTPHeaders({
       'Referer': 'https://www.cycani.org/',
       'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
       'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
   });
   ```
   **重要**：`Referer` 头是必须的，否则 `player.cycanime.com` 会拒绝请求
4. 访问播放器URL
5. 等待 `networkidle0`（所有网络请求空闲，最多 30 秒）
6. 执行 JavaScript 获取 `<video>` 元素的 `src` 属性：
   ```javascript
   document.querySelector('video').src
   ```
7. 如果第一次没找到，等待 3 秒后重试
8. 关闭页面，保持浏览器运行
9. 返回真实视频URL（如 `https://tos-cn...`）

**浏览器池优化**：
- 使用单例模式维护一个浏览器实例
- 避免每次请求都启动新浏览器
- 支持并发请求的启动锁机制
- 服务器关闭时自动清理

#### 5.3 方案二：HTTP + Cheerio（备用方案）

**函数**：`parseWithAxios(playerUrl)`

如果 Puppeteer 失败，使用此备用方案：

1. 直接 HTTP GET 获取播放器页面HTML
2. 用 Cheerio 解析：
   - **方法1**：查找 `<video src="...">` 标签
   - **方法2**：用正则表达式匹配 `.mp4`、`.m3u8` 等视频URL
   - **方法3**：查找带 `src` 属性的元素
3. 返回找到的视频URL

---

### 第六步：返回给前端

```javascript
res.json({
    success: true,
    data: {
        bangumiId: "6004",
        season: 1,
        episode: 1,
        title: "xxx 第1集",
        videoUrl: "cycani-dcd01-...",          // 加密的视频ID
        decryptedVideoUrl: "cycani-dcd01-...", // 解密后的视频ID
        realVideoUrl: "https://tos-cn...",    // 真实视频URL（如果成功）
        originalUrl: "https://www.cycani.org/watch/6004/1/1.html"
    }
})
```

---

## 数据流图

```
用户请求 GET /api/episode/6004/1/1
    ↓
[1] 获取 cycani.org/watch/6004/1/1.html 页面 HTML
    ↓
[2] 解析 <script> 中的 player_aaaa 变量（包含加密的视频ID）
    ↓
[3] 提取加密的 video ID (Base64编码的JSON字符串)
    ↓
[4] Base64 解码 → URL 解码 → 得到加密ID
    输出示例: cycani-dcd01-40890417c254f4ca839391fe8fb334e01759801315
    ↓
[5] 访问 player.cycanime.com/?url=加密ID
    ↓
[6] Puppeteer 获取浏览器实例（复用）
    ↓
[7] 创建新页面并设置关键 HTTP 头
    - Referer: https://www.cycani.org/ ⚠️ 必须设置
    - Accept, Accept-Language 等
    ↓
[8] 访问播放器 URL，等待 networkidle0
    ↓
[9] 执行 JS 提取 video.src
    ↓
[10] 返回真实视频URL (如 https://tos-cn-...)
    ↓
返回给前端
```

---

## 关键技术点

### 1. player_aaaa 变量

- cycani.org 在页面中嵌入的加密视频ID
- 格式：JSON 对象，包含 `url` 和 `url_next` 字段
- 值经过 Base64 编码，可能还需要 URL 编码

### 2. 双重加密

1. **Base64 编码**：将原始字符串编码为 Base64
2. **URL 编码**：将 Base64 结果中的特殊字符进行 URL 编码（%XX 格式）

解密时需要逆向操作：
1. URL 解码
2. Base64 解码

### 3. 播放器页面

- URL：`https://player.cycanime.com/?url={加密ID}`
- 作用：解密视频ID并加载真实视频
- 使用 MuiPlayer PRO 播放器
- **重要**：需要 `Referer: https://www.cycani.org/` 头，否则会拒绝请求

### 4. 原网站的播放器加载机制

#### 原网站**不使用 iframe**，而是通过 JavaScript 动态加载播放器：

```javascript
// player.js 中的关键逻辑
MacPlayer.Play = function() {
    // 动态创建播放器容器
    document.write('<div class="MacPlayer">...</div>');

    // 根据 player_data.from 动态加载播放器 JS
    document.write('<script src="' + this.Path + this.PlayFrom + '.js"></script>')
    // 例如：/static/js/dcd01.js 或 /static/js/zijiana.js
}

// 播放器 JS 文件（如 dcd01.js）会创建 iframe 指向 player.cycanime.com
```

#### 数据流对比

**原网站访问（快）**：
```
用户访问 cycani.org/watch/6004/2/1.html
    ↓
页面加载 player_aaaa 变量 + playerconfig.js + player.js
    ↓
player.js 解密并根据 player_data.from 动态加载播放器
    ↓
创建 iframe → player.cycanime.com/?url={加密ID}
    ↓
iframe 请求带有 Referer: cycani.org/watch/6004/2/1.html ✓
    ↓
视频加载成功 ✓
```

**单独打开 iframe（慢/失败）**：
```
用户直接访问 player.cycanime.com/?url={加密ID}
    ↓
请求 Referer 为空或 player.cycanime.com ✗
    ↓
player.cycanime.com 检测到非法来源
    ↓
视频加载失败或很慢 ✗
```

#### 关键区别

| 项目 | 原网站访问 | 单独打开 iframe |
|------|------------|------------------|
| **Referer** | `https://www.cycani.org/watch/6004/2/1.html` | 空或 `player.cycanime.com` |
| **父页面** | cycani.org 完整页面 | 无/浏览器直接打开 |
| **Cookie** | cycani.org 的 Cookie | 无 |
| **父页面 JS** | 有 player.js 等支持 | 无 |

**结论**：`player.cycanime.com` 有 Referer 检查机制，只允许来自 `cycani.org` 的请求访问。这是防盗链和反爬虫的一种常见手段。

### 5. Puppeteer 的作用

- 模拟真实浏览器环境
- 执行页面中的 JavaScript 代码
- 获取动态生成的 `<video>` 元素的 `src` 属性
- 这是目前唯一可靠的获取真实视频URL的方法

### 6. 浏览器池优化

**实现**：`BrowserPool` 类

**优点**：
- 首次请求启动浏览器（2-3秒）
- 后续请求直接复用（0.5-1秒）
- 避免频繁启动/关闭浏览器
- 支持优雅关闭

**代码位置**：`src/server.js` 第 25-94 行

### 7. Referer 验证机制

**作用**：`player.cycanime.com` 通过检查 HTTP 请求的 `Referer` 头来验证请求来源，防止盗链和未授权访问。

**实现方式**：
```javascript
// Puppeteer 访问时必须设置 Referer
await page.setExtraHTTPHeaders({
    'Referer': 'https://www.cycani.org/',
    // ... 其他头部
});
```

**为什么必须**：
- 没有正确 Referer 的请求会被拒绝或返回错误
- 这是网站的反爬虫和防盗链策略
- 模拟真实用户从原网站访问的行为

---

## 错误处理

### Puppeteer 超时处理

```javascript
try {
    await page.goto(playerUrl, { waitUntil: 'networkidle0', timeout: 30000 });
} catch (gotoError) {
    if (gotoError.message.includes('timeout')) {
        console.log(`⏱️ 页面加载超时，尝试继续...`);
        // 继续执行，不抛出错误
    } else {
        throw gotoError;
    }
}
```

### 降级策略

1. **首选**：Puppeteer 获取真实视频URL
2. **备用1**：如果 Puppeteer 失败，返回播放器URL（iframe 播放）
3. **备用2**：HTTP + Cheerio 尝试解析（目前成功率较低）

---

## 相关文件

- **后端主文件**：`cycani-proxy/src/server.js`
- **关键函数**：
  - `parseEpisodeData($)` - 解析 player_aaaa
  - `decryptVideoUrl(encryptedUrl)` - 解密视频ID
  - `parsePlayerPage(videoId)` - 解析播放器页面
  - `getVideoUrlFromPuppeteer(playerUrl)` - Puppeteer 获取真实URL
  - `parseWithAxios(playerUrl)` - HTTP 备用方案

---

## 日志示例

成功的解析流程日志：
```
🔍 获取剧集信息: https://www.cycani.org/watch/6004/1/1.html
✅ 找到播放器数据
🔓 解密视频ID: cycani-dcd01-40890417c254f4ca839391fe8fb334e...
🎬 解析播放器页面: https://player.cycanime.com/?url=...
🚀 启动浏览器实例...
✅ 浏览器实例已启动
📄 访问播放器页面...
✅ 成功获取视频URL
✅ 成功获取真实视频URL: https://tos-cn-...
```

使用浏览器池的后续请求：
```
🔍 获取剧集信息: https://www.cycani.org/watch/6004/1/2.html
✅ 找到播放器数据
🔓 解密视频ID: cycani-dcd01-44780392a875662d553fff3e527ebad...
🎬 解析播放器页面: https://player.cycanime.com/?url=...
📄 访问播放器页面...
✅ 成功获取视频URL
✅ 成功获取真实视频URL: https://tos-cn-...
```

---

## 常见问题

### Q: 为什么在原网站上视频加载很快，但单独打开 player.cycanime.com 的 iframe 却很难加载成功？

**A**: 这是因为 `player.cycanime.com` 实现了 Referer 验证机制：

1. **原网站访问流程**：
   - 用户访问 `cycani.org/watch/6004/2/1.html`
   - 页面通过 JavaScript 动态创建 iframe
   - iframe 请求带有正确的 Referer: `cycani.org/watch/6004/2/1.html`
   - 播放器验证 Referer 通过，返回视频 ✓

2. **单独打开 iframe 流程**：
   - 用户直接访问 `player.cycanime.com/?url={加密ID}`
   - 请求 Referer 为空或 `player.cycanime.com`
   - 播放器检测到非法来源，拒绝请求 ✗

**解决方案**：使用 Puppeteer 访问时必须设置正确的 Referer：

```javascript
await page.setExtraHTTPHeaders({
    'Referer': 'https://www.cycani.org/',
    // ... 其他头部
});
```

### Q: 如果不设置 Referer 会发生什么？

**A**: 可能出现以下情况：
- 播放器页面加载超时
- 返回 403 Forbidden
- 视频元素不出现或 src 为空
- 其他反爬虫拦截行为

### Q: 为什么 Puppeteer 比直接 HTTP 请求更可靠？

**A**:
1. Puppeteer 可以执行页面中的 JavaScript，获取动态生成的内容
2. 可以正确设置所有必要的 HTTP 头（包括 Referer）
3. 模拟真实浏览器环境，不容易被检测为机器人
4. 可以处理复杂的页面加载逻辑和异步操作

---

## 更新日期

- 2025-12-27: 初始版本
- 2025-12-27: 添加 Referer 验证机制说明，补充原网站播放器加载机制分析
