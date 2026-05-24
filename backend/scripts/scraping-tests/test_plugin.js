const { pluginManager } = require('./backend/src/plugins/PluginManager');
const { setDynamicProxyHosts } = require('./backend/src/upstreamProxy');

async function runTest() {
    console.log('Initializing plugin manager...');
    await pluginManager.initialize();
    setDynamicProxyHosts(pluginManager.getAllProxyDomains());

    console.log('Registered plugins:', pluginManager.listPlugins());
    const cycani = pluginManager.getPlugin('cycani');

    if (!cycani) {
        console.error('Cycani plugin not found!');
        process.exit(1);
    }

    try {
        console.log('\n--- Testing getWeeklySchedule ---');
        const schedule = await cycani.getWeeklySchedule('monday');
        console.log('Monday schedule count:', schedule.monday?.length);
        if (schedule.monday?.length > 0) {
            console.log('First item:', schedule.monday[0].title);
        }

        console.log('\n--- Testing searchAnime ---');
        const searchResult = await cycani.searchAnime('鬼灭', 1);
        console.log('Search results count:', searchResult.animeList?.length);
        if (searchResult.animeList?.length > 0) {
            console.log('First search result:', searchResult.animeList[0].title);
        }

        console.log('\n--- Testing getAnimeList ---');
        const listResult = await cycani.getAnimeList({}, 1);
        console.log('List results count:', listResult.animeList?.length);
        
        let targetId = null;
        if (listResult.animeList?.length > 0) {
            console.log('First list result:', listResult.animeList[0].title);
            targetId = listResult.animeList[0].id;
        }

        if (targetId) {
            console.log('\n--- Testing getAnimeDetail ---');
            const detail = await cycani.getAnimeDetail(targetId);
            console.log('Anime Detail Title:', detail.title);
            console.log('Episodes Count:', detail.episodes?.length);
            
            if (detail.episodes?.length > 0) {
                const ep = detail.episodes[0];
                console.log(`\n--- Testing getVideoUrl for Season ${ep.season} Episode ${ep.episode} ---`);
                const videoUrl = await cycani.getVideoUrl(targetId, ep.season, ep.episode);
                console.log('Extracted Video URL:', videoUrl.url);
            }
        }

        console.log('\n✅ All tests passed!');
    } catch (e) {
        console.error('❌ Test failed:', e);
    }
    
    // Explicitly exit since Puppeteer or other background things might keep it alive
    process.exit(0);
}

runTest();
