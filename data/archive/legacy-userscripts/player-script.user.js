// ==UserScript==
// @name         次元城播放器优化脚本 v14.2.0
// @namespace    http://tampermonkey.net/
// @version      14.2.0
// @description  简化稳定版本
// @author       Claude
// @match        https://player.cycanime.com/*
// @grant        GM_addStyle
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    console.log('🎬 播放器优化脚本启动 v14.2.0');

    // 样式
    GM_addStyle(`
        .player-optimized-overlay {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 999999;
            font-family: 'Microsoft YaHei', sans-serif;
            border-left: 4px solid #4CAF50;
            min-width: 250px;
        }
        .player-optimized-controls {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            padding: 15px;
            border-radius: 8px;
            z-index: 999999;
            color: white;
            font-family: 'Microsoft YaHei', sans-serif;
        }
        .player-optimized-btn {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 8px 15px;
            border-radius: 4px;
            cursor: pointer;
            margin: 2px;
            font-size: 12px;
            transition: all 0.2s;
        }
        .player-optimized-btn:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        .player-progress {
            width: 100%;
            height: 4px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 2px;
            margin: 10px 0;
            overflow: hidden;
        }
        .player-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4CAF50, #45a049);
            width: 0%;
            transition: width 0.5s;
        }
        .next-episode-modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.95);
            color: white;
            padding: 30px 40px;
            border-radius: 12px;
            z-index: 9999999;
            font-family: 'Microsoft YaHei', sans-serif;
            text-align: center;
            border-left: 4px solid #ff9800;
            min-width: 300px;
        }
        .countdown-number {
            font-size: 32px;
            font-weight: bold;
            color: #ff9800;
            margin: 15px 0;
        }
        .modal-buttons {
            margin-top: 20px;
            display: flex;
            gap: 10px;
            justify-content: center;
        }
    `);

    // 从URL参数读取播放信息
    function readPlaybackInfoFromUrl() {
        try {
            console.log('🔍 当前URL:', window.location.href);

            const urlParams = new URLSearchParams(window.location.search);

            const episode = urlParams.get('episode');
            const bangumiId = urlParams.get('bangumiId');
            const season = urlParams.get('season');
            const current_url = urlParams.get('current_url');
            const next_episode = urlParams.get('next_episode');
            const next_url = urlParams.get('next_url');
            const next_mainUrl = urlParams.get('next_mainUrl');
            const timestamp = urlParams.get('timestamp');

            console.log('🔍 解析的参数:', { episode, bangumiId, season, current_url, next_episode, next_url });

            if (!episode || !bangumiId || !season || !current_url) {
                console.log('❌ URL参数中缺少必要的播放信息');
                return null;
            }

            const playbackInfo = {
                current: {
                    episode: parseInt(episode),
                    bangumiId: parseInt(bangumiId),
                    season: parseInt(season),
                    encrypted_url: current_url
                },
                next: null
            };

            // 如果有下一集信息
            if (next_episode && next_url) {
                playbackInfo.next = {
                    episode: parseInt(next_episode),
                    url: next_url,
                    mainUrl: next_mainUrl
                };
            }

            // 检查时间戳（可选）
            if (timestamp) {
                const now = Date.now();
                const timeDiff = now - parseInt(timestamp);
                console.log('🕐 URL参数时间差:', Math.floor(timeDiff / 1000), '秒');

                // 如果超过30分钟仍然显示警告但不阻止使用
                if (timeDiff > 30 * 60 * 1000) {
                    console.log('⚠️ URL参数较旧，但仍然可以使用');
                }
            }

            console.log('✅ 从URL读取播放信息:', playbackInfo);
            return playbackInfo;
        } catch (error) {
            console.error('❌ 解析URL参数失败:', error);
            console.error('❌ 错误详情:', error.message, error.stack);
            return null;
        }
    }

    // 清理播放信息（URL参数方式无需清理）
    function clearPlaybackInfo() {
        console.log('🗑️ URL参数方式无需清理播放信息');
    }

    // 显示视频未找到错误
    function showVideoNotFoundError() {
        const errorHint = document.createElement('div');
        errorHint.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(244, 67, 54, 0.95);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 9999998;
            font-family: 'Microsoft YaHei', sans-serif;
            text-align: center;
            max-width: 350px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border-left: 4px solid #f44336;
        `;
        errorHint.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px;">❌ 视频播放器检测失败</div>
            <div style="font-size: 14px; margin-bottom: 12px;">未找到有效的视频元素，可能需要等待页面加载完成</div>
            <div style="font-size: 12px; opacity: 0.8;">请检查页面是否正常加载视频内容</div>
            <button class="player-optimized-btn" onclick="this.parentElement.remove()" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); margin-top: 10px;">关闭</button>
        `;
        document.body.appendChild(errorHint);

        // 15秒后自动消失
        setTimeout(() => {
            if (errorHint.parentNode) {
                errorHint.style.opacity = '0';
                errorHint.style.transition = 'opacity 0.3s';
                setTimeout(() => {
                    if (errorHint.parentNode) {
                        errorHint.parentNode.removeChild(errorHint);
                    }
                }, 300);
            }
        }, 15000);
    }

    // 等待视频元素就绪 - 增强版检测
    function waitForVideoReady() {
        return new Promise(resolve => {
            let attempts = 0;
            const maxAttempts = 60; // 增加到60秒，给更多时间加载

            const check = () => {
                attempts++;

                // 多种方式查找视频元素
                let video = document.querySelector('video');

                // 如果没找到video，检查iframe内的视频
                if (!video) {
                    const iframes = document.querySelectorAll('iframe');
                    for (const iframe of iframes) {
                        try {
                            if (iframe.contentDocument) {
                                video = iframe.contentDocument.querySelector('video');
                                if (video) {
                                    console.log('✅ 在iframe中找到视频元素');
                                    break;
                                }
                            }
                        } catch (e) {
                            // 跨域iframe无法访问
                        }
                    }
                }

                // 检查各种可能的播放器容器
                if (!video) {
                    const playerContainers = document.querySelectorAll('[id*="player"], [class*="player"], [id*="video"], [class*="video"]');
                    console.log(`🔍 检查播放器容器: 找到${playerContainers.length}个容器`);
                }

                if (video) {
                    console.log(`✅ 找到视频元素: ${video.tagName}, readyState: ${video.readyState}, paused: ${video.paused}`);

                    // 检查视频是否有源
                    if (video.src || video.currentSrc) {
                        console.log(`✅ 视频源已设置: ${video.src || video.currentSrc}`);

                        // 如果视频已经加载完成
                        if (video.readyState >= 4) { // HAVE_ENOUGH_DATA
                            console.log('✅ 视频数据已完全加载');
                            resolve(video);
                            return;
                        }

                        // 如果视频开始加载但未完成
                        if (video.readyState > 0) {
                            console.log('🔄 视频正在加载中...');
                            // 监听加载完成事件
                            video.addEventListener('loadeddata', () => {
                                console.log('✅ 视频数据加载完成');
                                resolve(video);
                            }, { once: true });

                            video.addEventListener('canplay', () => {
                                console.log('✅ 视频可以播放');
                                resolve(video);
                            }, { once: true });

                            return;
                        }

                        // 视频存在但没有加载，等待一下
                        if (attempts < maxAttempts) {
                            setTimeout(check, 1000);
                            return;
                        }
                    } else {
                        console.log('⚠️ 视频元素存在但没有源URL');
                    }
                }

                if (attempts < maxAttempts) {
                    console.log(`🔄 等待视频元素... (${attempts}/${maxAttempts})`);
                    setTimeout(check, 1000);
                } else {
                    console.log('❌ 等待视频超时，未找到有效的视频元素');
                    resolve(null);
                }
            };

            check();
        });
    }

    // 创建状态显示界面
    function createStatusDisplay(playbackInfo) {
        const overlay = document.createElement('div');
        overlay.className = 'player-optimized-overlay';

        const currentEpisode = playbackInfo.current?.episode || 1;
        const nextEpisode = playbackInfo.next?.episode;

        let nextStatus = '🎬 最后一集';
        if (nextEpisode) {
            nextStatus = `📺 下一集: 第${nextEpisode}集 ✅`;
        }

        overlay.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px;">🎬 自动连播模式</div>
            <div style="font-size: 14px; margin-bottom: 5px;">当前: 第${currentEpisode}集</div>
            <div style="font-size: 14px; color: #4CAF50; margin-bottom: 10px;">${nextStatus}</div>
            <div class="player-progress">
                <div class="player-progress-fill" id="progress-fill"></div>
            </div>
            <div id="time-display" style="font-size: 12px; opacity: 0.8;">准备播放...</div>
        `;

        document.body.appendChild(overlay);
        return overlay;
    }

    // 创建控制面板
    function createControls() {
        const controls = document.createElement('div');
        controls.className = 'player-optimized-controls';
        controls.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px;">🎮 播放控制</div>
            <button class="player-optimized-btn" onclick="playerTogglePlay()">▶️ 播放/暂停</button>
            <button class="player-optimized-btn" onclick="playerFullscreen()">🔳 全屏</button>
            <button class="player-optimized-btn" onclick="playerSkipNext()">⏭️ 下一集</button>
            <button class="player-optimized-btn" id="autoplay-toggle" onclick="playerToggleAutoplay()">🔄 连播: 开启</button>
        `;

        document.body.appendChild(controls);

        let autoplayEnabled = true;

        window.playerTogglePlay = () => {
            const video = document.querySelector('video');
            if (video) {
                video.paused ? video.play() : video.pause();
            }
        };

        window.playerFullscreen = () => {
            const video = document.querySelector('video');
            if (video && video.requestFullscreen) {
                video.requestFullscreen();
            }
        };

        window.playerSkipNext = () => {
            const playbackInfo = readPlaybackInfoFromUrl();
            if (playbackInfo && playbackInfo.next) {
                goToNextEpisode(playbackInfo);
            }
        };

        window.playerToggleAutoplay = () => {
            autoplayEnabled = !autoplayEnabled;
            const btn = document.getElementById('autoplay-toggle');
            if (btn) {
                btn.textContent = `🔄 连播: ${autoplayEnabled ? '开启' : '关闭'}`;
            }
            console.log(`自动连播${autoplayEnabled ? '已开启' : '已关闭'}`);
        };

        return { getAutoplayEnabled: () => autoplayEnabled };
    }

    // 尝试自动播放 - 简化强制播放策略
    async function tryAutoPlay(video) {
        try {
            console.log('🎬 开始自动播放...');
            console.log('📊 播放前视频状态:', {
                readyState: video.readyState,
                paused: video.paused,
                currentTime: video.currentTime,
                duration: video.duration,
                muted: video.muted,
                volume: video.volume,
                src: video.src ? '已设置' : '未设置'
            });

            // 简单直接的播放逻辑
            video.muted = true;
            console.log('🔇 已设置静音状态');

            // 直接尝试播放
            const playPromise = video.play();
            console.log('🎮 调用了video.play()');

            if (playPromise !== undefined) {
                await playPromise;
                console.log('🎉 自动播放成功！');
                console.log('📊 播放后状态:', {
                    paused: video.paused,
                    currentTime: video.currentTime,
                    muted: video.muted
                });

                // 启动智能声音恢复
                setTimeout(() => {
                    smartUnmute(video, false, video.volume);
                }, 1000); // 1秒后再尝试恢复声音

                return true;
            } else {
                console.log('⚠️ video.play()没有返回Promise');
                return false;
            }

        } catch (error) {
            console.log('❌ 自动播放失败:', error.message);
            console.log('📊 错误时视频状态:', {
                paused: video.paused,
                currentTime: video.currentTime,
                muted: video.muted,
                error: video.error ? video.error.message : '无',
                readyState: video.readyState
            });

            // 显示手动播放提示
            showManualPlayHint();
            return false;
        }
    }

    // 简化声音恢复 - 先确保自动播放工作
    async function smartUnmute(video, originalMuted, originalVolume) {
        if (originalMuted) {
            console.log('🔇 视频本来就是静音状态，无需恢复');
            return;
        }

        console.log('🔊 尝试自动恢复声音...');

        // 简单的声音恢复尝试
        setTimeout(() => {
            try {
                video.muted = false;
                console.log('🔊 尝试恢复声音');

                // 检查是否成功
                setTimeout(() => {
                    if (!video.muted && !video.paused) {
                        console.log('🎉 声音恢复成功！');
                    } else {
                        console.log('⚠️ 声音恢复失败，显示用户提示');
                        showSoundRestoreHint(video);
                    }
                }, 500);

            } catch (error) {
                console.log('❌ 声音恢复失败:', error.message);
                showSoundRestoreHint(video);
            }
        }, 2000); // 2秒后尝试恢复声音
    }

    // 显示声音恢复提示
    function showSoundRestoreHint(video) {
        // 避免重复显示
        if (document.querySelector('.sound-restore-hint')) return;

        const hint = document.createElement('div');
        hint.className = 'sound-restore-hint';
        hint.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: rgba(33, 150, 243, 0.95);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 9999998;
            font-family: 'Microsoft YaHei', sans-serif;
            text-align: center;
            max-width: 320px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border-left: 4px solid #2196F3;
            animation: slideIn 0.3s ease-out;
        `;

        hint.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px;">🔊 视频正在静音播放</div>
            <div style="font-size: 14px; margin-bottom: 12px; opacity: 0.9;">浏览器限制自动播放声音</div>
            <div style="font-size: 12px; margin-bottom: 15px; opacity: 0.8;">点击任意位置或播放按钮恢复声音</div>
            <button class="player-optimized-btn" onclick="window.forceRestoreSound()" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); margin-right: 8px; padding: 8px 16px;">恢复声音</button>
            <button class="player-optimized-btn" onclick="window.hideSoundHint()" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 8px 16px;">保持静音</button>
        `;

        // 添加动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(hint);

        // 15秒后自动消失
        setTimeout(() => {
            hideSoundRestoreHint();
        }, 15000);

        // 全局函数
        window.forceRestoreSound = () => {
            const video = document.querySelector('video');
            if (video && video.muted && !video.paused) {
                video.muted = false;
                console.log('🎉 手动恢复声音成功！');
                hideSoundRestoreHint();
            }
        };

        window.hideSoundHint = () => {
            hideSoundRestoreHint();
        };
    }

    const hideSoundRestoreHint = () => {
        const hint = document.querySelector('.sound-restore-hint');
        if (hint) {
            hint.style.opacity = '0';
            hint.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                if (document.contains(hint)) {
                    document.body.removeChild(hint);
                }
            }, 300);
        }
    };

    // 简化的用户交互播放（备用方案）
    function attemptUserInteractionPlay(video) {
        console.log('🔄 尝试通过用户交互触发播放...');
        // 这里可以留空，因为我们已经有了直接播放的工作方法
        // 如果直接播放失败，会调用 showManualPlayHint()
    }

    // 显示手动播放提示
    function showManualPlayHint() {
        const hint = document.createElement('div');
        hint.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 152, 0, 0.95);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 9999998;
            font-family: 'Microsoft YaHei', sans-serif;
            text-align: center;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        hint.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px;">🎬 请手动播放</div>
            <div style="font-size: 14px; margin-bottom: 12px;">浏览器策略要求用户手动开始播放</div>
            <button class="player-optimized-btn" onclick="this.parentElement.remove(); document.querySelector('video')?.play();" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); margin-right: 8px;">播放</button>
            <button class="player-optimized-btn" onclick="this.parentElement.remove()" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);">关闭</button>
        `;
        document.body.appendChild(hint);

        // 8秒后自动消失
        setTimeout(() => {
            if (hint.parentNode) {
                hint.style.opacity = '0';
                hint.style.transition = 'opacity 0.3s';
                setTimeout(() => {
                    if (hint.parentNode) {
                        hint.parentNode.removeChild(hint);
                    }
                }, 300);
            }
        }, 8000);

        // 点击任意位置关闭
        hint.addEventListener('click', (e) => {
            if (e.target !== hint.querySelector('button')) {
                if (hint.parentNode) {
                    hint.parentNode.removeChild(hint);
                }
            }
        });
    }

    // 监控播放进度 - 基于MCP测试优化
    function monitorProgress(video, playbackInfo, controls) {
        let hasNotifiedNearEnd = false;
        let progressInterval;

        const updateProgress = () => {
            if (video.duration && video.currentTime) {
                // 更新进度条
                const percent = (video.currentTime / video.duration) * 100;
                const progressFill = document.getElementById('progress-fill');
                if (progressFill) {
                    progressFill.style.width = percent + '%';
                }

                // 更新时间显示
                const timeDisplay = document.getElementById('time-display');
                if (timeDisplay) {
                    const current = Math.floor(video.currentTime);
                    const duration = Math.floor(video.duration);
                    const currentMin = Math.floor(current / 60);
                    const currentSec = current % 60;
                    const durationMin = Math.floor(duration / 60);
                    const durationSec = duration % 60;

                    timeDisplay.textContent = `${String(currentMin).padStart(2, '0')}:${String(currentSec).padStart(2, '0')} / ${String(durationMin).padStart(2, '0')}:${String(durationSec).padStart(2, '0')}`;
                }

                // 检查是否接近结束（30秒前）
                const timeRemaining = video.duration - video.currentTime;
                if (timeRemaining <= 30 && timeRemaining > 0 && !hasNotifiedNearEnd && controls.getAutoplayEnabled()) {
                    hasNotifiedNearEnd = true;
                    showNextEpisodeModal(playbackInfo);
                }
            }
        };

        // 每1秒更新进度
        progressInterval = setInterval(updateProgress, 1000);

        // 监听播放结束
        video.addEventListener('ended', () => {
            clearInterval(progressInterval);
            console.log('🎬 视频播放结束');
            if (controls.getAutoplayEnabled()) {
                goToNextEpisode(playbackInfo);
            }
        });

        // 监听播放错误
        video.addEventListener('error', (e) => {
            clearInterval(progressInterval);
            console.error('❌ 视频播放错误:', e);
        });
    }

    // 显示下一集模态框
    function showNextEpisodeModal(playbackInfo) {
        if (!playbackInfo?.next) {
            console.log('❌ 没有下一集信息');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'next-episode-modal';
        modal.style.zIndex = '99999999';
        modal.innerHTML = `
            <h3>🎬 即将播放下一集</h3>
            <div style="font-size: 18px; margin: 10px 0;">第${playbackInfo.next.episode}集</div>
            <div class="countdown-number" id="countdown">3</div>
            <div class="modal-buttons">
                <button class="player-optimized-btn" onclick="cancelNextEpisode()" style="background: rgba(244, 67, 54, 0.3);">取消</button>
                <button class="player-optimized-btn" onclick="playNextNow()" style="background: rgba(76, 175, 80, 0.3);">立即播放</button>
            </div>
        `;

        document.body.appendChild(modal);

        let countdown = 3;
        const countdownInterval = setInterval(() => {
            countdown--;
            const countdownEl = document.getElementById('countdown');
            if (countdownEl) {
                countdownEl.textContent = countdown;
            }

            // 当倒计时到1时，添加淡出效果
            if (countdown === 1) {
                modal.style.opacity = '0.7';
                modal.style.transition = 'opacity 0.5s';
            }

            if (countdown <= 0) {
                clearInterval(countdownInterval);
                // 淡出消失
                modal.style.opacity = '0';
                setTimeout(() => {
                    if (modal.parentNode) {
                        modal.parentNode.removeChild(modal);
                    }
                    goToNextEpisode(playbackInfo);
                }, 300);
            }
        }, 1000);

        // 3秒后如果用户没有操作，自动消失
        const autoHideTimeout = setTimeout(() => {
            if (modal.parentNode) {
                clearInterval(countdownInterval);
                modal.style.opacity = '0';
                setTimeout(() => {
                    if (modal.parentNode) {
                        modal.parentNode.removeChild(modal);
                    }
                    goToNextEpisode(playbackInfo);
                }, 300);
            }
        }, 3000);

        window.cancelNextEpisode = () => {
            clearInterval(countdownInterval);
            clearTimeout(autoHideTimeout);
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        };

        window.playNextNow = () => {
            clearInterval(countdownInterval);
            clearTimeout(autoHideTimeout);
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
            goToNextEpisode(playbackInfo);
        };

        // 点击模态框外部也可以关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                cancelNextEpisode();
            }
        });
    }

    // 跳转到下一集
    function goToNextEpisode(playbackInfo) {
        if (!playbackInfo?.next?.url) {
            console.log('❌ 没有下一集URL');
            return;
        }

        console.log('🔄 准备跳转到下一集:', playbackInfo.next.url);

        // 清理当前页面的播放信息
        clearPlaybackInfo();

        // 跳转到下一集
        window.location.href = playbackInfo.next.url;
    }

    // 主函数
    async function main() {
        try {
            console.log('🚀 播放器优化脚本主函数启动');

            // 读取播放信息
            const playbackInfo = readPlaybackInfoFromUrl();
            if (!playbackInfo) {
                console.log('❌ 没有播放信息，脚本退出');
                return;
            }

            console.log('📖 播放信息:', playbackInfo);

            // 等待视频就绪
            console.log('🔄 等待视频元素加载...');
            const video = await waitForVideoReady();

            if (!video) {
                console.log('❌ 没有找到有效的视频元素');
                showVideoNotFoundError();
                return;
            }

            console.log('✅ 视频元素已就绪，开始初始化功能');

            // 创建UI界面
            createStatusDisplay(playbackInfo);
            const controls = createControls();

            // 立即尝试自动播放
            tryAutoPlay(video);

            // 开始监控进度
            monitorProgress(video, playbackInfo, controls);

            console.log('🎉 播放器优化功能初始化完成');

        } catch (error) {
            console.error('❌ 脚本运行失败:', error);
        }
    }

    // 启动脚本
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }

})();