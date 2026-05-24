const { pluginManager } = require('./src/plugins/PluginManager');

(async () => {
    try {
        await pluginManager.initialize();
        const cycani = pluginManager.getPlugin('cycani');
        console.log("Trying to fetch home data through plugin...");
        const data = await cycani.getHomeData();
        console.log("Home data keys:", Object.keys(data));
    } catch (err) {
        console.log("Fetch home data error:", err.message);
    }
})();
