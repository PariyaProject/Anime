const fs = require('fs');
if (fs.existsSync('.env')) {
    const envConfig = require('dotenv').parse(fs.readFileSync('.env'));
    for (const k in envConfig) process.env[k] = envConfig[k];
}
const { pluginManager } = require('./src/plugins/PluginManager');

(async () => {
    try {
        await pluginManager.initialize();
        const cycani = pluginManager.getPlugin('cycani');
        console.log("Fetching weekly schedule via cycani plugin with proxy:", process.env.UPSTREAM_PROXY_URL || 'NONE');
        const schedule = await cycani.getWeeklySchedule();
        let count = 0;
        for (const day in schedule) {
           console.log(day, (schedule[day] || []).length);
           count += (schedule[day] || []).length;
        }
        console.log("Total scraped items:", count);
    } catch (e) {
        console.error("Error:", e.message);
    }
})();
