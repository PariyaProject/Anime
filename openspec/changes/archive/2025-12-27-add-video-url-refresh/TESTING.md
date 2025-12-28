# Testing Guide - Video URL Refresh Feature

本文档记录视频URL刷新功能的测试方法和相关知识。

## 功能概述

当视频URL即将过期时，系统会自动在过期前5秒刷新URL，确保播放不中断。

**最终方案：**
- ✅ 过期前5秒自动刷新
- ✅ 刷新后保持播放位置
- ✅ 刷新成功后重新安排下一次刷新
- ❌ 不使用403错误监听（被动响应）
- ❌ 不使用预防性轮询（减少资源消耗）
- ❌ 后端无缓存（简化架构）

## 测试函数

在视频播放页面（WatchView）中，已内置2个测试函数供开发者使用。打开浏览器控制台（F12）即可调用：

### 1. `testCheckExpiration()` - 查看URL过期状态

显示当前视频URL的过期信息：

```javascript
testCheckExpiration()
```

**输出示例：**
```
📍 Current URL: https://example.com/video.mp4?x-expires=1234567890...
⏰ Expires at: 2024-12-28 14:30:00
⏳ Time until expiration: 3480s
⏰ Auto-refresh scheduled in: 3475s (5s before expiration)
```

### 2. `testForceRefresh()` - 强制刷新URL

直接调用刷新功能，测试刷新是否正常工作：

```javascript
testForceRefresh()
```

**适用场景：**
- 测试刷新API是否正常工作
- 手动刷新视频URL
- 验证播放位置保持功能

## 刷新功能架构

### 前端实现

```
WatchView.vue (播放器页面)
├── scheduleUrlRefresh() - 计划刷新函数
│   └── setTimeout - 在过期前5秒触发
├── refreshVideoUrlSeamlessly() - 无缝刷新函数
│   ├── 记录播放位置
│   ├── 调用后端API获取新URL
│   ├── 更新Plyr源
│   └── 恢复播放位置
└── 测试函数 (window.testXxx)
```

### 后端API

```
GET /api/refresh-video-url/:animeId/:season/:episode
```

**无缓存设计：**
- 每次请求都使用Puppeteer获取最新URL
- 不使用MAP缓存
- 简化架构，提高可靠性

### 数据流

```
视频加载 → 解析x-expires → 计算刷新时间(过期前5秒) → setTimeout等待
                                                              ↓
                                                         URL过期前5秒
                                                              ↓
                                                    调用刷新API获取新URL
                                                              ↓
                                                    更新播放器源并恢复位置
                                                              ↓
                                                    重新安排下一次刷新
```

## 刷新时机

**自动刷新条件：**
- URL存在过期时间（有 x-expires 参数）
- 距离过期时间还有5秒或更少
- 触发自动刷新

**刷新流程：**
1. 计算刷新延迟 = `timeUntilExpiration - 5000ms`
2. 如果延迟 <= 0，立即刷新
3. 否则设置setTimeout等待

## 测试场景

### 场景1: 正常播放（无需刷新）

1. 打开视频播放页面
2. 控制台显示：`⏰ URL expires in 2644s, scheduling refresh in 2639s`
3. 视频正常播放，等待2639秒后自动刷新

### 场景2: 自动刷新

1. URL即将过期（5秒内）
2. 自动调用刷新API
3. 获取新URL并更新播放器
4. 恢复播放位置
5. 控制台显示：`⏰ Auto-refreshing URL before expiration...`
6. 重新安排下一次刷新

### 场景3: 手动测试

```javascript
// 查看过期状态和刷新计划
testCheckExpiration()

// 强制手动刷新
testForceRefresh()
```

## 常见问题

### Q: 为什么不在过期前更早刷新（如5分钟）？

A: 实测发现，视频CDN（byteimg.com）只有在URL即将过期或已过期时才会生成新的URL。过早刷新获取到的URL和旧URL相同，没有实际效果。

### Q: 刷新时会有明显的跳动感吗？

A: 刷新时会有短暂的进度跳转（从0回到原位置），已优化到100ms延迟，尽量减少视觉影响。

### Q: 刷新后播放位置会丢失吗？

A: 不会。刷新时会记录当前播放位置，刷新完成后自动恢复到相同位置。

### Q: 如何验证刷新功能是否工作？

A: 打开控制台，应该看到初始化时的日志：
```
⏰ URL expires in 2644s, scheduling refresh in 2639s
```

然后可以使用 `testForceRefresh()` 手动测试刷新功能。

### Q: 后端为什么不使用缓存？

A: 过早刷新时CDN返回的URL相同，缓存反而会导致无法获取新URL。无缓存设计更简单可靠。

## 技术细节

### URL过期解析

```javascript
// 从URL中提取 x-expires 参数
parseUrlExpiration(videoUrl: string): number | null {
  const urlObj = new URL(videoUrl)
  const expiresParam = urlObj.searchParams.get('x-expires')
  return expiresParam ? parseInt(expiresParam) * 1000 : null
}

// 计算剩余时间
getTimeUntilExpiration(videoUrl: string): number {
  const expires = parseUrlExpiration(videoUrl)
  if (!expires) return Infinity
  return expires - Date.now()
}
```

### 刷新时间计算

```javascript
// 过期前5秒刷新
const REFRESH_BEFORE_EXPIRATION = 5 * 1000 // 5 seconds
const refreshDelay = timeUntilExpiration - REFRESH_BEFORE_EXPIRATION

if (refreshDelay <= 0) {
  // 立即刷新
  refreshVideoUrlSeamlessly()
} else {
  // 延迟刷新
  setTimeout(() => {
    refreshVideoUrlSeamlessly()
  }, refreshDelay)
}
```

### Plyr API

```javascript
// 正确的视频元素访问方式
player.media  // ✅ HTMLVideoElement
player.elements.video  // ❌ 不存在

// 更新视频源
player.source = {
  type: 'video',
  sources: [{ src: freshUrl, type: 'video/mp4' }]
}

// 等待ready事件后恢复位置
player.once('ready', () => {
  setTimeout(() => {
    player.currentTime = currentPosition
    if (wasPlaying) player.play()
  }, 100)
})
```

### Store状态更新

```javascript
// player.ts - 刷新后更新store
async function refreshVideoUrl(): Promise<string> {
  const result = await episodeService.refreshVideoUrl(animeId, season, episode)

  // 更新store中的URL（触发computed重新计算）
  if (currentEpisodeData.value) {
    currentEpisodeData.value.realVideoUrl = result.realVideoUrl
  }

  return result.realVideoUrl
}
```

## 相关文件

- `cycani-proxy/src/server.js` - 后端刷新API（无缓存）
- `frontend/src/services/episode.service.ts` - 刷新服务
- `frontend/src/stores/player.ts` - 播放器状态管理
- `frontend/src/views/WatchView.vue` - 播放器页面和计划刷新

## 更新日志

- 2024-12-28: 初始版本
- 2024-12-28: **定版** - 采用"过期前5秒自动刷新"方案，移除403监听和后端缓存
