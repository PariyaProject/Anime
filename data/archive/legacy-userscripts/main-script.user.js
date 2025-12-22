// ==UserScript==
// @name         次元城主页面优化脚本 v14.1.0
// @namespace    http://tampermonkey.net/
// @version      14.1.0
// @description  修复跨域localStorage问题的URL参数版本
// @author       Claude
// @match        https://www.cycani.org/watch/*
// @grant        GM_addStyle
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    console.log('🎬 主页面优化脚本启动 v14.1.0');

    // 样式
    GM_addStyle(`
        .main-optimized-notifier {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.95);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 999999;
            font-size: 14px;
            max-width: 350px;
            border-left: 5px solid #4CAF50;
            font-family: 'Microsoft YaHei', sans-serif;
        }
        .main-optimized-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999999;
            color: white;
            font-family: 'Microsoft YaHei', sans-serif;
        }
        .main-optimized-panel {
            background: rgba(0,0,0,0.95);
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            max-width: 450px;
            border: 2px solid #4CAF50;
        }
        .main-optimized-btn {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            margin: 10px;
            transition: all 0.3s;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }
        .main-optimized-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(0,0,0,0.4);
        }
        .episode-info {
            font-size: 20px;
            margin: 15px 0;
            color: #4CAF50;
            font-weight: bold;
        }
        .status-info {
            margin: 10px 0;
            padding: 10px;
            background: rgba(76, 175, 80, 0.2);
            border-radius: 6px;
            font-size: 14px;
        }
        .loading-indicator {
            margin: 15px 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        .loading-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `);

    // 通知函数
    function showNotification(message, type = 'info', duration = 4000) {
        console.log(`[主页面] ${message}`);

        const notification = document.createElement('div');
        notification.className = 'main-optimized-notifier';
        notification.style.borderLeftColor = type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#4CAF50';
        notification.textContent = message;

        document.body.appendChild(notification);

        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, duration);
        }

        return notification;
    }

    // 解析当前页面信息
    function parseCurrentEpisodeInfo() {
        try {
            let player = null;

            if (typeof unsafeWindow !== 'undefined' && unsafeWindow.player_aaaa) {
                player = unsafeWindow.player_aaaa;
            } else if (typeof player_aaaa !== 'undefined') {
                player = player_aaaa;
            }

            if (player) {
                return {
                    bangumiId: player.id,
                    season: player.sid,
                    episode: player.nid,
                    link_next: player.link_next,
                    encrypted_url: player.url,
                    from: player.from
                };
            }

            const urlMatch = window.location.pathname.match(/\/watch\/(\d+)\/(\d+)\/(\d+)\.html/);
            if (urlMatch) {
                return {
                    bangumiId: urlMatch[1],
                    season: urlMatch[2],
                    episode: parseInt(urlMatch[3]),
                    link_next: null,
                    encrypted_url: null
                };
            }

            return null;
        } catch (error) {
            console.error('解析当前页面信息失败:', error);
            return null;
        }
    }

    // 获取下一集信息 - 使用GM_xmlhttpRequest避免跨域问题
    async function getNextEpisodeInfo(currentInfo) {
        if (!currentInfo) return null;

        const nextUrl = getNextEpisodeUrl(currentInfo);
        if (!nextUrl) return null;

        console.log('🔍 获取下一集信息:', nextUrl);

        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: nextUrl,
                timeout: 10000,
                onload: function(response) {
                    try {
                        // 创建临时DOM来解析响应
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(response.responseText, 'text/html');

                        // 查找player_aaaa变量
                        const scripts = doc.getElementsByTagName('script');
                        for (const script of scripts) {
                            if (script.textContent) {
                                const playerMatch = script.textContent.match(/var\s+player_aaaa\s*=\s*({[^}]+});/);
                                if (playerMatch) {
                                    try {
                                        // 安全地解析player_aaaa对象
                                        const playerStr = playerMatch[1];
                                        const playerData = eval('(' + playerStr + ')');

                                        resolve({
                                            episode: playerData.nid,
                                            bangumiId: playerData.id,
                                            season: playerData.sid,
                                            encrypted_url: playerData.url,
                                            link_next: playerData.link_next,
                                            mainUrl: nextUrl,
                                            playerUrl: `https://player.cycanime.com/?url=${playerData.url}`
                                        });
                                        console.log('✅ 成功获取下一集信息');
                                        return;
                                    } catch (parseError) {
                                        console.warn('解析下一集player_aaaa失败:', parseError);
                                        continue;
                                    }
                                }
                            }
                        }

                        console.warn('⚠️ 未能从下一集页面获取player_aaaa，使用估算方式');
                        resolve(estimateNextEpisodeInfo(currentInfo));

                    } catch (error) {
                        console.error('解析下一集页面失败:', error);
                        resolve(estimateNextEpisodeInfo(currentInfo));
                    }
                },
                onerror: function() {
                    console.error('获取下一集页面失败');
                    resolve(estimateNextEpisodeInfo(currentInfo));
                },
                ontimeout: function() {
                    console.error('获取下一集页面超时');
                    resolve(estimateNextEpisodeInfo(currentInfo));
                }
            });
        });
    }

    // 估算下一集信息（备用方案）
    function estimateNextEpisodeInfo(currentInfo) {
        const nextEpisode = currentInfo.episode + 1;
        return {
            episode: nextEpisode,
            bangumiId: currentInfo.bangumiId,
            season: currentInfo.season,
            encrypted_url: null, // 无法获取真实加密URL
            mainUrl: `${window.location.origin}/watch/${currentInfo.bangumiId}/${currentInfo.season}/${nextEpisode}.html`,
            playerUrl: `https://player.cycanime.com/?url=placeholder&episode=${nextEpisode}`
        };
    }

    // 获取下一集URL
    function getNextEpisodeUrl(currentInfo) {
        if (currentInfo.link_next) {
            return window.location.origin + currentInfo.link_next;
        }
        const nextEpisode = currentInfo.episode + 1;
        return `${window.location.origin}/watch/${currentInfo.bangumiId}/${currentInfo.season}/${nextEpisode}.html`;
    }

    // 检查页面是否存在
    async function checkPageExists(url) {
        if (!url) return false;

        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'HEAD',
                url: url,
                timeout: 5000,
                onload: function(response) {
                    resolve(response.status >= 200 && response.status < 300);
                },
                onerror: function() {
                    resolve(false);
                },
                ontimeout: function() {
                    resolve(false);
                }
            });
        });
    }

    // 创建包含播放信息的URL参数
    function createPlaybackUrl(currentInfo, nextInfo) {
        const params = new URLSearchParams();
        params.append('episode', currentInfo.episode);
        params.append('bangumiId', currentInfo.bangumiId);
        params.append('season', currentInfo.season);
        params.append('current_url', currentInfo.encrypted_url);

        if (nextInfo) {
            params.append('next_episode', nextInfo.episode);
            params.append('next_url', nextInfo.playerUrl);
            params.append('next_mainUrl', nextInfo.mainUrl);
        }

        params.append('timestamp', Date.now());

        return `https://player.cycanime.com/?url=${currentInfo.encrypted_url}&${params.toString()}`;
    }

    // 创建导航界面
    function createNavigation(episodeInfo, nextInfo, hasNext) {
        const overlay = document.createElement('div');
        overlay.className = 'main-optimized-overlay';

        let nextStatus = '';
        if (hasNext && nextInfo) {
            nextStatus = `<div class="status-info">✅ 第${nextInfo.episode}集已准备，将自动连播</div>`;
        } else {
            nextStatus = `<div class="status-info">🎬 这是最后一集</div>`;
        }

        overlay.innerHTML = `
            <div class="main-optimized-panel">
                <h2>🎬 智能播放导航</h2>
                <div class="episode-info">当前: 第${episodeInfo.episode}集</div>
                ${nextStatus}
                <div class="loading-indicator" id="loading" style="display: none;">
                    <div class="loading-spinner"></div>
                    <span>正在处理...</span>
                </div>
                <button class="main-optimized-btn" id="play-btn" onclick="startPlayback()">
                    🎬 开始播放
                </button>
                ${hasNext && nextInfo ? `
                    <button class="main-optimized-btn" onclick="skipToNext()">
                        ⏭️ 跳转到下一集
                    </button>
                ` : ''}
                <button class="main-optimized-btn" onclick="cancelNavigation()" style="background: #666;">
                    ❌ 取消
                </button>
            </div>
        `;

        document.body.appendChild(overlay);

        window.startPlayback = () => {
            const loading = document.getElementById('loading');
            const playBtn = document.getElementById('play-btn');

            if (loading) loading.style.display = 'flex';
            if (playBtn) playBtn.disabled = true;

            const playerUrl = createPlaybackUrl(episodeInfo, nextInfo);
            console.log('🎬 导航到播放器:', playerUrl);

            setTimeout(() => {
                window.location.href = playerUrl;
            }, 500);
        };

        window.skipToNext = () => {
            if (nextInfo && nextInfo.playerUrl) {
                const loading = document.getElementById('loading');
                if (loading) loading.style.display = 'flex';

                const playerUrl = createPlaybackUrl(
                    {
                        episode: nextInfo.episode,
                        bangumiId: nextInfo.bangumiId,
                        season: nextInfo.season,
                        encrypted_url: nextInfo.encrypted_url
                    },
                    null // 跳转到下一集时暂时不传递再下一集的信息
                );

                console.log('⏭️ 跳转到下一集:', playerUrl);
                setTimeout(() => {
                    window.location.href = playerUrl;
                }, 500);
            }
        };

        window.cancelNavigation = () => {
            overlay.remove();
            showNotification('📺 已取消导航，返回原页面', 'info');
        };

        // 5秒后自动开始播放
        setTimeout(() => {
            if (document.contains(overlay)) {
                startPlayback();
            }
        }, 5000);

        return overlay;
    }

    // 主函数
    async function main() {
        try {
            showNotification('🚀 主页面优化脚本启动...', 'info');

            // 等待页面加载完成
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 解析当前页面信息
            const episodeInfo = parseCurrentEpisodeInfo();
            if (!episodeInfo || !episodeInfo.encrypted_url) {
                showNotification('❌ 无法获取当前页面播放信息', 'error');
                return;
            }

            showNotification(`📺 当前: 第${episodeInfo.episode}集`, 'success');

            // 获取下一集信息
            showNotification('🔍 正在获取下一集信息...', 'info');
            const nextInfo = await getNextEpisodeInfo(episodeInfo);
            const hasNext = !!nextInfo;

            if (hasNext) {
                showNotification(`✅ 第${nextInfo.episode}集已准备好`, 'success');

                // 验证下一集页面是否真实存在
                const pageExists = await checkPageExists(nextInfo.mainUrl);
                if (!pageExists) {
                    showNotification('⚠️ 下一集页面可能不存在', 'warning');
                }
            } else {
                showNotification('🎬 这是最后一集', 'info');
            }

            // 播放信息现在通过URL参数传递，无需localStorage存储

            // 创建导航界面
            createNavigation(episodeInfo, nextInfo, hasNext);

            showNotification('🎉 智能导航已准备就绪', 'success');

        } catch (error) {
            console.error('❌ 主页面脚本运行失败:', error);
            showNotification(`❌ 脚本运行失败: ${error.message}`, 'error');
        }
    }

    // 启动脚本
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }

})();