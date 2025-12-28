# Proposal: Fix Video URL Extraction Failure

## Problem Statement

The backend video URL extraction is failing, preventing the frontend from playing videos. The error logs show:

```
🤖 使用Puppeteer从video元素读取URL...
🚀 启动浏览器实例...
✅ 浏览器实例已启动
📄 访问播放器页面...
⏱️ 页面加载超时，尝试继续...
⚠️ 未找到 video 元素
⚠️ Puppeteer方法失败
📡 尝试HTTP+AES解密方法...
🌐 获取播放器页面...
📄 页面标题: MuiPlayer PRO
❌ 所有方法都未找到视频源
❌ 所有方法都失败
⚠️ 解密失败，返回播放器URL作为备用
```

**Key Observations:**
- The original website (cycani.org) can play the videos successfully
- This indicates the issue is with our extraction implementation, not network or external factors
- Puppeteer finds the page (MuiPlayer PRO) but cannot locate the video element
- HTTP+AES decryption fallback also fails to find video sources

## Root Cause Analysis

Based on the error logs, code inspection, and documentation in `docs/video-parsing-flow.md`:

1. **Puppeteer Timeout Issue**: The page loads (we see "MuiPlayer PRO" title) but times out before the video element is ready
2. **Insufficient Wait Time**: The current 3-second fallback wait (line 1966 in server.js) is not enough for MuiPlayer PRO to initialize
3. **Dynamic Video Element Creation**: MuiPlayer PRO creates the video element dynamically after JavaScript execution
4. **Network Cancellation by MuiPlayer PRO**: When `networkidle0` timeout occurs, MuiPlayer PRO may cancel pending video requests, preventing the video element from being created

**Key Reference from Documentation:**
- The flow is documented in `docs/video-parsing-flow.md` (lines 123-148)
- Current timeout: 30 seconds with `networkidle0` (line 349 in docs)
- Current retry wait: 3 seconds (line 145 in docs)
- Browser pool is already implemented and working (lines 149-153 in docs)

## Proposed Solution

Enhance the video URL extraction logic with the following improvements:

1. **Extended Puppeteer Wait Times**: Increase timeout from 30s to 60s and add multiple polling attempts
2. **Wait for Specific Selectors**: Add explicit waits for MuiPlayer PRO's video element initialization
3. **Retry Strategy**: Implement 3 retry attempts with increasing delays (3s, 5s, 10s)
4. **Enhanced Video Detection**: Check for video elements in shadow DOM and iframe children
5. **Network Request Interception**: As a fallback, intercept network requests to capture the video URL directly
6. **Better Error Logging**: Log detailed diagnostic information for debugging

## What Changes

- **Enhance Puppeteer Video Detection** (`server.js:1917-2015`):
  - Increase page load timeout from 30s to 60s
  - Add multiple retry attempts with exponential backoff
  - Wait for specific MuiPlayer PRO selectors
  - Check shadow DOM and nested iframes

- **Add Network Request Interception** (new feature):
  - Intercept XHR/fetch requests to capture video URL
  - Filter for .m3u8, .mp4, and other video file requests
  - Use as fallback when direct video element detection fails

- **Improve HTTP+AES Fallback** (`server.js:2018-2079`):
  - Add more comprehensive regex patterns for video URLs
  - Check for blob URLs and data URIs
  - Parse JavaScript for embedded video configurations

- **Enhanced Logging and Diagnostics**:
  - Log page structure and DOM tree when video not found
  - Log network requests during page load
  - Provide actionable error messages

## Impact

- **Affected specs**:
  - `video-url-extraction` (NEW - new capability for reliable video URL extraction)
- **Affected code**:
  - `cycani-proxy/src/server.js:1917-2015` (Puppeteer video extraction)
  - `cycani-proxy/src/server.js:2018-2079` (HTTP+AES fallback)
  - New network request interception logic

## Dependencies

- Existing Puppeteer installation (already present)
- Existing browser pool infrastructure (already implemented)
- No new external dependencies required

## Success Criteria

- Puppeteer successfully extracts video URLs from player.cycanime.com
- Network request interception provides reliable fallback
- Reduced timeout errors and "未找到 video 元素" messages
- Video playback works correctly in the frontend
- Existing functionality remains intact
- Better diagnostic logging for future debugging

## Alternative Approaches Considered

1. **Increase timeout only**: Too simplistic, doesn't address dynamic element creation
2. **Use different browser automation**: Puppeteer is already installed and working; switching would add complexity
3. **Frontend-only solution**: Would require cross-origin iframe communication, which is blocked by browser security
4. **Return player URL to frontend**: Already implemented as fallback, but doesn't resolve the core extraction issue

## Technical Context

**Documented Flow** (from `docs/video-parsing-flow.md`):

The video parsing follows a 6-step process:
1. Get episode page HTML from cycani.org
2. Parse `player_aaaa` variable from `<script>` tags
3. Extract encrypted video ID (Base64 + URL encoded)
4. Decrypt to get `cycani-dcd01-xxxxx` format ID
5. Access `player.cycanime.com/?url={decryptedID}` with Puppeteer
6. Extract `video.src` from the page

**Current Flow (Broken):**
```
Request episode → Scrape cycani.org → Get encrypted ID (cycani-xxx)
→ Call getVideoUrlFromPuppeteer(playerUrl) → Page loads (MuiPlayer PRO)
→ networkidle0 timeout (30s) → Try to find video element → FAIL
→ Wait 3s and retry → Still no video element → FAIL
→ Fallback to parseWithAxios() → FAIL (MuiPlayer PRO is dynamic)
→ Return player URL (doesn't work in frontend Plyr player)
```

**Why It Fails:**
- `networkidle0` waits for ALL network requests to complete
- MuiPlayer PRO may continuously poll or keep connections open
- The 30-second timeout triggers before video element is created
- The 3-second retry is insufficient for MuiPlayer PRO's async initialization

**Proposed Flow (Fixed):**
```
Request episode → Scrape cycani.org → Get encrypted ID (cycani-xxx)
→ Call enhanced getVideoUrlFromPuppeteer() → Use 'domcontentloaded' instead of 'networkidle0'
→ Poll for video element with exponential backoff (3s, 5s, 10s)
→ Find video element OR intercept network request → SUCCESS
→ Return real video URL (works in Plyr player)
```

**Example of Expected Success:**
```
🤖 使用增强版Puppeteer获取视频URL...
🚀 从浏览器池获取实例...
✅ 浏览器实例已启动
📄 访问播放器页面 (domcontentloaded)...
⏳ 等待 MuiPlayer PRO 初始化...
⏳ 第1次检测: 未找到 video 元素
⏳ 第2次检测 (+3s): 未找到 video 元素
⏳ 第3次检测 (+5s): 未找到 video 元素
✅ 第4次检测 (+10s): 检测到 video 元素
🎯 成功提取视频URL: https://tos-cn-xxxxx...
```

**Key Changes from Documented Flow:**
1. **Wait Strategy**: Change from `networkidle0` (30s) to `domcontentloaded` (faster, less strict)
2. **Retry Logic**: Instead of one 3s retry, implement multiple retries with backoff
3. **Detection Method**: Poll for video element instead of assuming it exists after network idle
4. **Fallback**: Network request interception as additional fallback before HTTP+AES
