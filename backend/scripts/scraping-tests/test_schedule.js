const CycaniPlugin = require('./src/plugins/sources/cycani/index');
const cycani = new CycaniPlugin();

(async () => {
    try {
        console.log("Fetching weekly schedule...");
        const schedule = await cycani.getWeeklySchedule();
        console.log("Schedule Data:", JSON.stringify(schedule, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
})();
