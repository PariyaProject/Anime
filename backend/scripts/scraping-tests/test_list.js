const { pluginManager } = require('./src/plugins/PluginManager');

(async () => {
    try {
        await pluginManager.initialize();
        const cycani = pluginManager.getPlugin('cycani');
        console.log("Trying to fetch anime list through plugin...");
        const data = await cycani.getAnimeList({ channel: 'tv', sort: 'time' }, 1);
        console.log("List data items:", data.animeList.length);
    } catch (err) {
        console.log("Fetch list error:", err.message);
    }
})();
