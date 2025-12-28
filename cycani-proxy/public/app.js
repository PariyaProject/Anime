// 全局变量
let player = null;
let currentEpisodeData = null;
let autoPlay = true; // 默认开启自动播放
let currentAnimeData = null;
let searchTimeout = null;
let allAnimeList = [];
let currentPage = 1;
let totalPages = 1;
let watchHistory = [];
let continueWatching = [];
let currentLastPosition = 0;
let positionSaveInterval = null;

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // 检查服务器连接
    checkServerConnection();

    // 初始化事件监听器
    initializeEventListeners();

    // 初始化播放器
    initializePlayer();

    // 加载动画列表
    loadAnimeList();
}

// 检查服务器连接
async function checkServerConnection() {
    try {
        const response = await fetch('/');
        if (response.ok) {
            updateServerStatus('✅ 服务器连接正常', 'success');
                    } else {
            throw new Error('服务器响应异常');
        }
    } catch (error) {
        updateServerStatus('❌ 服务器连接失败', 'danger');
            }
}

// 初始化事件监听器
function initializeEventListeners() {
    // 主页链接
    document.getElementById('home-link').addEventListener('click', backToList);

    // 筛选按钮
    document.getElementById('filter-btn').addEventListener('click', applyFilters);

    // 搜索框实时搜索（防抖）
    document.getElementById('anime-search').addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1;
            loadAnimeList();
        }, 500);
    });

    // 筛选条件变化
    ['genre-filter', 'year-filter', 'month-filter', 'sort-filter'].forEach(id => {
        document.getElementById(id).addEventListener('change', function() {
            currentPage = 1;
            loadAnimeList();
        });
    });

    // 自动播放按钮
    document.getElementById('auto-play-btn').addEventListener('click', toggleAutoPlay);

    // 下一集按钮
    document.getElementById('next-episode-btn').addEventListener('click', loadNextEpisode);

    
    // 返回列表按钮
    document.getElementById('back-to-list-btn').addEventListener('click', backToList);

    // 跳转按钮（播放页面）
    document.getElementById('jump-btn').addEventListener('click', handleJumpToEpisode);

    // 动画ID跳转按钮（主页）
    document.getElementById('anime-id-jump-btn').addEventListener('click', handleAnimeIdJump);

  
    // 夜间模式切换
    const darkModeToggle = document.getElementById('darkmode-toggle');
    darkModeToggle.addEventListener('change', toggleDarkMode);

    // 初始化夜间模式状态
    initDarkMode();

    // 加载继续观看和观看历史
    loadContinueWatching();

    // 加载播放历史下拉菜单
    loadHistoryDropdown();
}

// 加载动画列表
async function loadAnimeList() {
    try {
        showLoadingState();

        const params = getFilterParams();
        const response = await fetch(`/api/anime-list?page=${currentPage}&limit=20&${new URLSearchParams(params)}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success) {
            allAnimeList = result.data.animeList;
            totalPages = result.data.totalPages;

            renderAnimeGrid(allAnimeList);
            updatePagination();
            updateAnimeCount(result.data.totalCount);

                    } else {
            throw new Error(result.error || '获取动画列表失败');
        }

    } catch (error) {
        showErrorMessage('加载动画列表失败: ' + error.message);
        renderEmptyState();
    } finally {
        hideLoadingState();
    }
}

// 获取筛选参数
function getFilterParams() {
    return {
        search: document.getElementById('anime-search').value.trim(),
        genre: document.getElementById('genre-filter').value,
        year: document.getElementById('year-filter').value,
        month: document.getElementById('month-filter').value,
        sort: document.getElementById('sort-filter').value
    };
}

// 渲染动画网格
function renderAnimeGrid(animeList) {
    const grid = document.getElementById('anime-grid');

    if (!animeList || animeList.length === 0) {
        renderEmptyState();
        return;
    }

    grid.innerHTML = animeList.map(anime => createAnimeCard(anime)).join('');

    // 添加卡片事件监听器
    animeList.forEach(anime => {
        const selectBtn = document.getElementById(`select-${anime.id}`);
        const detailsBtn = document.getElementById(`details-${anime.id}`);

        if (selectBtn) {
            selectBtn.addEventListener('click', () => selectAnime(anime));
        }

        if (detailsBtn) {
            detailsBtn.addEventListener('click', () => showAnimeDetails(anime));
        }
    });
}

// 创建动画卡片HTML
function createAnimeCard(anime) {
    return `
        <div class="col-lg-3 col-md-4 col-sm-6">
            <div class="anime-card">
                <div class="anime-cover" style="cursor: pointer;" onclick="selectAnimeById(${anime.id})">
                    <img src="${anime.cover || 'https://via.placeholder.com/200x280/f8f9fa/6c757d?text=无封面'}"
                         alt="${anime.title}"
                         loading="lazy"
                         onerror="this.src='https://via.placeholder.com/200x280/f8f9fa/6c757d?text=加载失败'">
                    <div class="anime-overlay">
                        <div class="anime-rating">⭐ ${anime.score || 'N/A'}</div>
                        <div class="anime-status">${anime.status || '连载中'}</div>
                    </div>
                </div>
                <div class="anime-info">
                    <h6 class="anime-title" title="${anime.title}">${anime.title}</h6>
                    <div class="anime-meta">
                        <span class="badge bg-secondary me-1">${anime.type || 'TV'}</span>
                        <span class="badge bg-info me-1">${anime.year || '未知'}</span>
                        <span class="badge bg-warning text-dark">${anime.episodes || '?'}集</span>
                    </div>
                    <div class="anime-actions">
                        <button class="btn btn-success anime-btn anime-btn-select" id="select-${anime.id}">
                            选择播放
                        </button>
                        <button class="btn btn-secondary anime-btn anime-btn-details" id="details-${anime.id}">
                            查看详情
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 渲染空状态
function renderEmptyState() {
    const grid = document.getElementById('anime-grid');
    grid.innerHTML = `
        <div class="col-md-12 text-center py-5">
            <div class="empty-state">
                <div class="mb-3">
                    <i class="bi bi-search display-1 text-muted"></i>
                </div>
                <h5 class="text-muted">暂无动画数据</h5>
                <p class="text-muted">请尝试调整筛选条件或刷新页面</p>
            </div>
        </div>
    `;
}

// 通过ID选择动画（用于图片点击）
async function selectAnimeById(animeId) {
    try {
        // 从allAnimeList中找到对应的动画数据
        const anime = allAnimeList.find(a => a.id == animeId);
        if (!anime) {
            throw new Error(`未找到ID为 ${animeId} 的动画`);
        }

        await selectAnime(anime);
    } catch (error) {
        showErrorMessage('选择动画失败: ' + error.message);
    }
}

// 选择动画
async function selectAnime(anime) {
    try {
        currentAnimeData = anime;

        // 显示视频加载状态
        showLoadingState('video');

        // 获取动画详情和集数信息
        const response = await fetch(`/api/anime/${anime.id}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success && result.data.episodes && result.data.episodes.length > 0) {
            // 默认选择第一集
            const firstEpisode = result.data.episodes[0];

            // 加载第一集视频
            await loadEpisodeForAnime(anime.id, firstEpisode.season, firstEpisode.episode);

        } else {
            // 如果没有集数信息，尝试使用默认参数
            await loadEpisodeForAnime(anime.id, 1, 1);
        }

    } catch (error) {
        showErrorMessage('选择动画失败: ' + error.message);
    } finally {
        hideLoadingState();
    }
}

// 加载指定动画的集数
async function loadEpisodeForAnime(bangumiId, season, episode) {
    try {

        const response = await fetch(`/api/episode/${bangumiId}/${season}/${episode}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success) {
            await handleEpisodeData(result.data);
        } else {
            throw new Error(result.error || '获取剧集数据失败');
        }

    } catch (error) {
        showErrorMessage('加载失败: ' + error.message);
    }
}

// 显示动画详情
function showAnimeDetails(anime) {
    // 这里可以显示一个模态框显示详细信息

    // 暂时用一个简单的alert替代，后续可以改为模态框
    const details = `
        动画名称: ${anime.title}
        类型: ${anime.type || '未知'}
        年份: ${anime.year || '未知'}
        集数: ${anime.episodes || '未知'}
        评分: ${anime.score || '未知'}
        状态: ${anime.status || '未知'}
        简介: ${anime.description || '暂无简介'}
    `;

    alert(details);
}

// 应用筛选
function applyFilters() {
    currentPage = 1;
    loadAnimeList();
}

// 更新分页
function updatePagination() {
    const pagination = document.getElementById('pagination');

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let paginationHTML = '<nav aria-label="动画列表分页"><ul class="pagination">';

    // 上一页
    if (currentPage > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">上一页</a>
            </li>
        `;
    }

    // 页码
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        paginationHTML += `
            <li class="page-item ${activeClass}">
                <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
            </li>
        `;
    }

    // 下一页
    if (currentPage < totalPages) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">下一页</a>
            </li>
        `;
    }

    paginationHTML += '</ul></nav>';
    pagination.innerHTML = paginationHTML;
}

// 切换页面
function changePage(page) {
    currentPage = page;
    loadAnimeList();
}

// 更新动画数量
function updateAnimeCount(count) {
    document.getElementById('anime-count').textContent = `共 ${count} 部动画`;
}

// 显示加载状态
function showLoadingState(type = 'anime') {
    const grid = document.getElementById('anime-grid');
    const loadingText = type === 'video' ? '正在加载视频...' : '正在加载动画列表...';

    grid.innerHTML = `
        <div class="col-md-12 text-center py-5">
            <div class="loading-spinner">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">加载中...</span>
                </div>
                <div class="mt-3">${loadingText}</div>
            </div>
        </div>
    `;

    // 更新筛选按钮状态
    const filterBtn = document.getElementById('filter-btn');
    const filterBtnText = document.getElementById('filter-btn-text');
    const filterSpinner = document.getElementById('filter-spinner');

    if (filterBtn && filterBtnText && filterSpinner) {
        filterBtnText.textContent = '筛选中...';
        filterSpinner.classList.remove('d-none');
        filterBtn.disabled = true;
    }
}

// 隐藏加载状态
function hideLoadingState() {
    const filterBtn = document.getElementById('filter-btn');
    const filterBtnText = document.getElementById('filter-btn-text');
    const filterSpinner = document.getElementById('filter-spinner');

    if (filterBtn && filterBtnText && filterSpinner) {
        filterBtnText.textContent = '筛选';
        filterSpinner.classList.add('d-none');
        filterBtn.disabled = false;
    }
}

// 初始化播放器
function initializePlayer() {
    try {
        player = new Plyr('#video-player', {
            controls: [
                'play-large',
                'play',
                'progress',
                'current-time',
                'duration',
                'mute',
                'volume',
                'captions',
                'settings',
                'pip',
                'airplay',
                'fullscreen'
            ],
            autoplay: false,
            autopause: true,
            captions: { active: false, update: false, language: 'auto' },
            clickToPlay: true,
            hideControls: true,
            resetOnEnd: false,
            tooltips: { controls: true, seek: true },
            keyboard: { focused: true, global: true }
        });

        // 播放器事件监听
        player.on('ready', () => {
        });

        player.on('play', () => {
        });

        player.on('pause', () => {
        });

        player.on('ended', () => {
            stopPositionSaving();

            // 最终保存位置
            saveWatchPosition();

            if (autoPlay) {
                setTimeout(loadNextEpisode, 2000);
            }
        });

        player.on('pause', () => {
            // 暂停时保存位置
            saveWatchPosition();
        });

        player.on('error', (error) => {
        });

    } catch (error) {
    }
}


// 处理剧集数据
async function handleEpisodeData(data) {

    currentEpisodeData = data;

    // 更新UI
    updateVideoInfo(data);

    // 隐藏主页区域，进入播放模式
    hideMainSections();

    // 显示视频区域
    const videoSection = document.getElementById('video-section');
    videoSection.style.display = 'block';
    videoSection.classList.add('fade-in');

    // 加载并显示选集列表
    await loadEpisodeList(data.bangumiId || data.animeId);

    // 设置自动播放按钮状态
    updateAutoPlayButton();

    // 尝试加载视频 - 优先使用realVideoUrl
    const videoUrl = data.realVideoUrl || data.videoUrl;
    if (videoUrl) {
        await loadVideo(videoUrl);
    } else {
        showWarningMessage('未找到视频URL，可能需要进一步解析');

        // 如果有原始页面URL，尝试在iframe中加载
        if (data.originalUrl) {
            loadVideoInIframe(data.originalUrl);
        }
    }
}

// 加载视频
async function loadVideo(videoUrl) {
    try {

        // 如果是外部视频URL，使用代理
        if (videoUrl.includes('cycanime.com') || videoUrl.includes('cycani.org')) {
            const proxyResponse = await fetch(`/api/video-proxy?url=${encodeURIComponent(videoUrl)}`);
            const proxyData = await proxyResponse.json();

            if (proxyData.success) {
                videoUrl = proxyData.videoUrl;
            }
        }

        // 更新播放器源
        player.source = {
            type: 'video',
            sources: [
                {
                    src: videoUrl,
                    type: 'video/mp4'
                }
            ]
        };

        // 更新视频源显示
        document.getElementById('video-source').textContent = new URL(videoUrl).hostname;


        // 如果有上次播放位置，跳转到该位置
        if (currentLastPosition > 0) {
            setTimeout(() => {
                player.currentTime = currentLastPosition;
                currentLastPosition = 0; // 重置位置
            }, 2000);
        }

        // 如果开启自动播放
        if (autoPlay) {
            setTimeout(() => player.play(), 1000);
        }

        // 启动位置保存定时器
        startPositionSaving();

    } catch (error) {
        showErrorMessage('视频加载失败: ' + error.message);
    }
}

// 在iframe中加载视频
function loadVideoInIframe(originalUrl) {

    // 创建iframe容器
    const videoContainer = document.querySelector('.video-container');
    const existingIframe = videoContainer.querySelector('iframe');

    if (existingIframe) {
        existingIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.src = originalUrl;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.allowFullscreen = true;

    videoContainer.appendChild(iframe);

    // 隐藏原生播放器
    document.getElementById('video-player').style.display = 'none';

    showWarningMessage('正在iframe中加载原始页面，请手动点击播放');
}

// 更新视频信息
function updateVideoInfo(data) {
    document.getElementById('video-title').textContent = data.title || '未知剧集';
    document.getElementById('current-episode').textContent = `S${data.season}E${data.episode}`;
    document.getElementById('video-source').textContent = '解析中...';
}

// 加载下一集
async function loadNextEpisode() {
    if (!currentEpisodeData) {
        return;
    }

    const currentSeason = currentEpisodeData.season || 1;
    const nextEpisode = (currentEpisodeData.episode || 1) + 1;


    // 如果有当前动画数据，使用当前动画ID
    if (currentAnimeData) {
        await loadEpisodeForAnime(currentAnimeData.id, currentSeason, nextEpisode);
    } else {
        // 否则使用当前剧集数据的bangumiId
        const bangumiId = currentEpisodeData.bangumiId;
        if (bangumiId) {
            await loadEpisodeForAnime(bangumiId, currentSeason, nextEpisode);
        } else {
        }
    }
}

// 切换自动播放
function toggleAutoPlay() {
    autoPlay = !autoPlay;
    const btn = document.getElementById('auto-play-btn');
    const status = document.getElementById('auto-play-status');

    if (autoPlay) {
        btn.classList.add('active');
        status.textContent = '开';
    } else {
        btn.classList.remove('active');
        status.textContent = '关';
    }
}

// 加载选集列表
async function loadEpisodeList(animeId) {
    try {

        const response = await fetch(`/api/anime/${animeId}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success && result.data.episodes) {
            renderEpisodeList(result.data.episodes, result.data);
        } else {
            // 如果API不支持，生成默认集数列表
            const defaultEpisodes = Array.from({length: 12}, (_, i) => ({
                season: 1,
                episode: i + 1,
                title: `第${i + 1}集`
            }));
            renderEpisodeList(defaultEpisodes, {title: currentEpisodeData?.title || '未知动画'});
        }
    } catch (error) {
        // 显示错误提示
        const episodeList = document.getElementById('episode-list');
        episodeList.innerHTML = `
            <div class="text-center text-danger py-4">
                <div>加载选集列表失败</div>
                <small>${error.message}</small>
            </div>
        `;
    }
}

// 渲染选集列表
function renderEpisodeList(episodes, animeData) {
    const episodeList = document.getElementById('episode-list');
    const episodeCount = document.getElementById('episode-count');

    episodeCount.textContent = `共${episodes.length}集`;

    episodeList.innerHTML = episodes.map(ep => {
        const isCurrentEpisode = currentEpisodeData &&
            ep.season === currentEpisodeData.season &&
            ep.episode === currentEpisodeData.episode;

        const isCompleted = checkEpisodeCompleted(animeData.id || currentEpisodeData?.bangumiId, ep.season, ep.episode);

        let statusClass = 'episode-default';
        let statusIcon = '';

        if (isCurrentEpisode) {
            statusClass = 'episode-current';
            statusIcon = '<span class="episode-status">▶️</span>';
        } else if (isCompleted) {
            statusClass = 'episode-completed';
            statusIcon = '<span class="episode-status">✅</span>';
        }

        return `
            <div class="episode-item ${statusClass}"
                 onclick="playEpisode(${animeData.id || currentEpisodeData?.bangumiId}, ${ep.season}, ${ep.episode})"
                 title="${ep.title || `S${ep.season}E${ep.episode}`}">
                <div class="episode-number">S${ep.season}E${ep.episode}</div>
                <div class="episode-title">${ep.title || `第${ep.episode}集`}</div>
                ${statusIcon}
            </div>
        `;
    }).join('');
}

// 检查剧集是否已完成
function checkEpisodeCompleted(animeId, season, episode) {
    const historyKey = `${animeId}_${season}_${episode}`;
    return watchHistory.some(item =>
        item.animeId == animeId &&
        item.season == season &&
        item.episode == episode &&
        item.completed
    );
}

// 播放指定剧集
async function playEpisode(animeId, season, episode) {
    try {
        await loadEpisodeForAnime(animeId, season, episode);
    } catch (error) {
        showErrorMessage('播放失败: ' + error.message);
    }
}

// 更新自动播放按钮状态
function updateAutoPlayButton() {
    const btn = document.getElementById('auto-play-btn');
    const status = document.getElementById('auto-play-status');

    if (autoPlay) {
        btn.classList.add('active');
        status.textContent = '开';
    } else {
        btn.classList.remove('active');
        status.textContent = '关';
    }
}

// 返回列表
function backToList(event) {
    if (event) {
        event.preventDefault();
    }

    // 隐藏视频区域
    const videoSection = document.getElementById('video-section');
    videoSection.style.display = 'none';

    // 显示主页区域
    showMainSections();

    // 停止位置保存
    stopPositionSaving();

    // 重置播放器
    if (player) {
        player.stop();
    }

}

// 隐藏主页区域
function hideMainSections() {
    try {

        // 隐藏继续观看区域
        const continueSection = document.getElementById('continue-watching-section');
        if (continueSection) {
            continueSection.style.display = 'none';
        }

        // 隐藏筛选和搜索区域 - 使用更精确的方法
        const filterRows = document.querySelectorAll('.row');
        filterRows.forEach((row, index) => {
            const hasFilterCard = Array.from(row.querySelectorAll('.card')).some(card => {
                const cardText = card.textContent || '';
                return cardText.includes('筛选与搜索') || card.querySelector('#filter-btn') ||
                       card.querySelector('#anime-search') || card.querySelector('#genre-filter');
            });

            if (hasFilterCard) {
                row.style.display = 'none';
            }
        });

        // 隐藏动画列表区域 - 查找包含"动画列表"的行
        const animeRows = document.querySelectorAll('.row');
        animeRows.forEach((row, index) => {
            const hasAnimeList = Array.from(row.querySelectorAll('.card')).some(card => {
                const cardText = card.textContent || '';
                return cardText.includes('动画列表') || card.querySelector('#anime-grid');
            });

            if (hasAnimeList) {
                row.style.display = 'none';
            }
        });

        // 隐藏分页区域
        const paginationRows = document.querySelectorAll('.row');
        paginationRows.forEach((row, index) => {
            const hasPagination = row.querySelector('#pagination') ||
                                 row.textContent.includes('动画列表分页');

            if (hasPagination) {
                row.style.display = 'none';
            }
        });

        
  

    } catch (error) {
    }
}

// 显示主页区域
function showMainSections() {

    try {
        // 显示继续观看区域
        const continueSection = document.getElementById('continue-watching-section');
        if (continueSection && continueWatching && continueWatching.length > 0) {
            continueSection.style.display = 'block';
        }

        // 重新加载动画列表以清除加载状态
        loadAnimeList();

        // 显示筛选和搜索区域
        const filterBtn = document.getElementById('filter-btn');
        if (filterBtn) {
            const filterRow = filterBtn.closest('.row');
            if (filterRow) {
                filterRow.style.display = '';
            }
        } else {
            // 备用方法：查找包含筛选相关内容的行
            const filterRows = document.querySelectorAll('.row');
            filterRows.forEach((row, index) => {
                const hasFilterCard = Array.from(row.querySelectorAll('.card')).some(card => {
                    const cardText = card.textContent || '';
                    return cardText.includes('筛选与搜索') || card.querySelector('#filter-btn') ||
                           card.querySelector('#anime-search') || card.querySelector('#genre-filter');
                });

                if (hasFilterCard) {
                    row.style.display = '';
                }
            });
        }

        // 显示动画列表区域
        const animeGrid = document.getElementById('anime-grid');
        if (animeGrid) {
            const animeRow = animeGrid.closest('.row');
            if (animeRow) {
                animeRow.style.display = '';
            }
        } else {
            // 备用方法：查找包含动画列表的行
            const animeRows = document.querySelectorAll('.row');
            animeRows.forEach((row, index) => {
                const hasAnimeList = Array.from(row.querySelectorAll('.card')).some(card => {
                    const cardText = card.textContent || '';
                    return cardText.includes('动画列表') || card.querySelector('#anime-grid');
                });

                if (hasAnimeList) {
                    row.style.display = '';
                }
            });
        }

        // 显示分页区域
        const pagination = document.getElementById('pagination');
        if (pagination) {
            const paginationRow = pagination.closest('.row');
            if (paginationRow) {
                paginationRow.style.display = '';
            }
        }

        
      

    } catch (error) {
    }
}

// 处理跳转到剧集（播放页面）
function handleJumpToEpisode() {
    const animeId = currentEpisodeData?.bangumiId;
    if (!animeId) {
        showErrorMessage('缺少动画ID信息');
        return;
    }

    const season = parseInt(document.getElementById('jump-season')?.value) || 1;
    const episode = parseInt(document.getElementById('jump-episode')?.value) || 1;

    if (season < 1 || episode < 1) {
        showErrorMessage('季度和集数必须大于0');
        return;
    }

    playEpisode(animeId, season, episode);
}

// 处理动画ID跳转（主页）
function handleAnimeIdJump() {
    const animeId = document.getElementById('modal-anime-id')?.value.trim();
    const season = parseInt(document.getElementById('modal-season')?.value) || 1;
    const episode = parseInt(document.getElementById('modal-episode')?.value) || 1;

    if (!animeId) {
        showErrorMessage('请输入动画ID');
        return;
    }

    if (season < 1 || episode < 1) {
        showErrorMessage('季度和集数必须大于0');
        return;
    }

    // 关闭模态框
    const modal = bootstrap.Modal.getInstance(document.getElementById('animeIdJumpModal'));
    if (modal) {
        modal.hide();
    }

    playEpisode(animeId, season, episode);
}


// 加载播放历史下拉菜单
async function loadHistoryDropdown() {
    try {
        const response = await fetch('/api/watch-history');
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            renderHistoryDropdown(result.data);
        } else {
            renderEmptyHistoryDropdown();
        }
    } catch (error) {
        renderEmptyHistoryDropdown();
    }
}

// 渲染播放历史下拉菜单
function renderHistoryDropdown(history) {
    const dropdownMenu = document.getElementById('history-dropdown-menu');

    const historyHtml = history.slice(0, 8).map(item => `
        <li class="history-item-dropdown">
            <div class="dropdown-item p-2">
                <div class="d-flex align-items-start">
                    <img src="${item.animeCover || '/api/placeholder-image'}"
                         alt="${item.animeTitle}"
                         class="me-3"
                         style="width: 60px; height: 80px; object-fit: cover; border-radius: 4px;"
                         onerror="this.src='/api/placeholder-image'">
                    <div class="flex-grow-1">
                        <h6 class="mb-1 small fw-bold">${item.animeTitle}</h6>
                        <p class="mb-1 small text-muted">S${item.season}E${item.episode} - ${formatDuration(item.position || 0)}/${formatDuration(item.duration || 0)}</p>
                        <div class="mb-1">
                            <div class="progress" style="height: 4px;">
                                <div class="progress-bar" role="progressbar"
                                     style="width: ${getProgressPercentage(item.position || 0, item.duration || 0)}%"
                                     aria-valuenow="${getProgressPercentage(item.position || 0, item.duration || 0)}"
                                     aria-valuemin="0" aria-valuemax="100"></div>
                            </div>
                        </div>
                        <button class="btn btn-primary btn-sm btn-resume"
                                onclick="resumePlayback('${item.animeId}', '${item.season}', '${item.episode}')">
                            继续观看
                        </button>
                    </div>
                </div>
            </div>
        </li>
    `).join('');

    dropdownMenu.innerHTML = `
        <li><h6 class="dropdown-header">📜 播放历史</h6></li>
        <li><hr class="dropdown-divider"></li>
        ${historyHtml}
          `;
}

// 渲染空历史下拉菜单
function renderEmptyHistoryDropdown() {
    const dropdownMenu = document.getElementById('history-dropdown-menu');
    dropdownMenu.innerHTML = `
        <li><h6 class="dropdown-header">📜 播放历史</h6></li>
        <li><hr class="dropdown-divider"></li>
        <li><div class="text-center text-muted p-3">暂无播放历史</div></li>
    `;
}

// 格式化时间
function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// 计算进度百分比
function getProgressPercentage(position, duration) {
    if (!duration || duration === 0) return 0;
    return Math.min(Math.round((position / duration) * 100), 100);
}

// 更新服务器状态
function updateServerStatus(text, status) {
    const statusElement = document.getElementById('server-status');
    statusElement.textContent = text;
    statusElement.className = `badge bg-${status}`;
}

// 显示错误消息
function showErrorMessage(message) {
    const alertHtml = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            <strong>错误:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

    // 在视频区域前显示错误消息
    const videoSection = document.getElementById('video-section');
    videoSection.insertAdjacentHTML('beforebegin', alertHtml);

    // 5秒后自动消失
    setTimeout(() => {
        const alert = document.querySelector('.alert-danger');
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

// 显示警告消息
function showWarningMessage(message) {
    const alertHtml = `
        <div class="alert alert-warning alert-dismissible fade show" role="alert">
            <strong>提示:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

    const videoSection = document.getElementById('video-section');
    videoSection.insertAdjacentHTML('beforebegin', alertHtml);

    // 8秒后自动消失
    setTimeout(() => {
        const alert = document.querySelector('.alert-warning');
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 8000);
}


// 键盘快捷键
document.addEventListener('keydown', function(event) {
    // 空格键播放/暂停
    if (event.code === 'Space' && event.target.tagName !== 'INPUT') {
        event.preventDefault();
        if (player) {
            player.togglePlay();
        }
    }

    // 右箭头下一集
    if (event.code === 'ArrowRight' && event.ctrlKey) {
        event.preventDefault();
        loadNextEpisode();
    }

    // Ctrl+Enter 加载当前输入的剧集
    if (event.code === 'Enter' && event.ctrlKey) {
        event.preventDefault();
        document.getElementById('episode-form').dispatchEvent(new Event('submit'));
    }
});

// 观看历史相关函数
async function loadContinueWatching() {
    try {
        const response = await fetch('/api/continue-watching');
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            continueWatching = result.data;
            renderContinueWatching();
            document.getElementById('continue-watching-section').style.display = 'block';
        } else {
            document.getElementById('continue-watching-section').style.display = 'none';
        }
    } catch (error) {
        document.getElementById('continue-watching-section').style.display = 'none';
    }
}

function renderContinueWatching() {
    const grid = document.getElementById('continue-watching-grid');

    if (!continueWatching || continueWatching.length === 0) {
        grid.innerHTML = `
            <div class="col-md-12 text-center py-3">
                <p class="text-muted">暂无观看历史</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = continueWatching.slice(0, 8).map(item => createHistoryCard(item, true)).join('');

    // 添加事件监听器
    continueWatching.slice(0, 8).forEach(item => {
        const resumeBtn = document.getElementById(`resume-${item.animeId}-${item.season}-${item.episode}`);
        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => resumePlayback(item));
        }
    });
}


function createHistoryCard(item, isContinueWatching) {
    const progress = item.duration > 0 ? (item.position / item.duration * 100).toFixed(1) : 0;
    const isCompleted = item.completed;

    // 状态文本和颜色
    let statusText, statusColor, buttonText, progressColor;

    if (isCompleted) {
        statusText = '✅ 已完成';
        statusColor = 'text-success';
        buttonText = '重新播放';
        progressColor = 'bg-success';
    } else {
        statusText = `${Math.floor(item.position / 60)}:${String(Math.floor(item.position % 60)).padStart(2, '0')} / ${Math.floor(item.duration / 60)}:${String(Math.floor(item.duration % 60)).padStart(2, '0')}`;
        statusColor = 'text-muted';
        buttonText = '继续观看';
        progressColor = progress > 80 ? 'bg-warning' : 'bg-info';
    }

    return `
        <div class="col-lg-2 col-md-3 col-sm-4 col-6 mb-3">
            <div class="history-card card h-100 ${isCompleted ? 'border-success' : ''}">
                <div class="position-relative">
                    <img src="${item.animeCover || '/api/placeholder-image'}"
                         class="card-img-top history-cover ${isCompleted ? 'opacity-75' : ''}"
                         alt="${item.animeTitle}"
                         loading="lazy">
                    <div class="history-progress">
                        <div class="progress" style="height: 4px;">
                            <div class="progress-bar ${progressColor}" style="width: ${progress}%"></div>
                        </div>
                    </div>
                    ${isCompleted ? '<div class="position-absolute top-0 end-0 m-1"><span class="badge bg-success">✓</span></div>' : ''}
                </div>
                <div class="card-body p-2">
                    <h6 class="card-title small mb-1" title="${item.animeTitle}">${item.animeTitle}</h6>
                    <p class="card-text small text-muted mb-1">${item.episodeTitle}</p>
                    <p class="card-text small ${statusColor} mb-2">${statusText}</p>
                    <button class="btn ${isCompleted ? 'btn-outline-success' : 'btn-primary'} btn-sm w-100"
                            id="resume-${item.animeId}-${item.season}-${item.episode}">
                        ${buttonText}
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function resumePlayback(item) {
    try {

        // 创建临时的动画数据
        const animeInfo = {
            id: item.animeId,
            title: item.animeTitle,
            cover: item.animeCover
        };

        currentAnimeData = animeInfo;

        // 加载指定集数
        await loadEpisodeForAnime(item.animeId, item.season, item.episode);

        // 记录上次播放位置
        currentLastPosition = item.position;

        // 播放器加载后跳转到上次位置
        if (player && item.position > 0) {
            setTimeout(() => {
                player.currentTime = item.position;
            }, 2000);
        }

    } catch (error) {
        showErrorMessage('恢复播放失败: ' + error.message);
    }
}


// 保存观看位置到历史记录
async function saveWatchPosition() {
    if (!currentEpisodeData || !currentAnimeData || !player) return;

    try {
        const currentTime = player.currentTime;
        const duration = player.duration;

        if (currentTime > 5 && duration > 0) { // 至少播放5秒才记录
            const positionData = {
                animeInfo: currentAnimeData,
                episodeInfo: {
                    season: currentEpisodeData.season,
                    episode: currentEpisodeData.episode,
                    title: currentEpisodeData.title,
                    duration: Math.floor(duration)
                },
                position: Math.floor(currentTime)
            };

            await fetch('/api/watch-history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(positionData)
            });

        }
    } catch (error) {
    }
}

// 启动位置保存定时器
function startPositionSaving() {
    // 清除现有定时器
    if (positionSaveInterval) {
        clearInterval(positionSaveInterval);
    }

    // 每30秒保存一次位置
    positionSaveInterval = setInterval(saveWatchPosition, 30000);
}

// 停止位置保存定时器
function stopPositionSaving() {
    if (positionSaveInterval) {
        clearInterval(positionSaveInterval);
        positionSaveInterval = null;
    }
}

// 显示成功消息
function showSuccessMessage(message) {
    const alertHtml = `
        <div class="alert alert-success alert-dismissible fade show" role="alert">
            <strong>成功:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

    const videoSection = document.getElementById('video-section');
    videoSection.insertAdjacentHTML('beforebegin', alertHtml);

    setTimeout(() => {
        const alert = document.querySelector('.alert-success');
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 3000);
}

// 夜间模式切换功能
function toggleDarkMode() {
    const body = document.body;
    const isDarkMode = body.classList.toggle('dark-mode');

    // 保存用户偏好到 localStorage
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');

    // 更新调试信息
}

// 初始化夜间模式状态
function initDarkMode() {
    const darkModePreference = localStorage.getItem('darkMode');
    const darkModeToggle = document.getElementById('darkmode-toggle');

    if (darkModePreference === 'enabled' ||
        (darkModePreference === null && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-mode');
        if (darkModeToggle) {
            darkModeToggle.checked = true;
        }
    }

}

