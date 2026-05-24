class BasePlugin {
    constructor(pluginContext) {
        this.context = pluginContext;
        this.manifest = this.getManifest();
        
        // Expose shared utilities from context
        this.http = this.context.httpClient;
        this.browserPool = this.context.browserPool;
        this.config = this.context.config || {};
    }

    /**
     * Return the plugin's manifest
     * @returns {Object} Manifest object
     */
    getManifest() {
        throw new Error('Plugin must implement getManifest()');
    }

    /**
     * Logger utility namespaced to this plugin
     */
    log(...args) {
        console.log(`[Plugin:${this.manifest.id}]`, ...args);
    }
    
    warn(...args) {
        console.warn(`[Plugin:${this.manifest.id}] ⚠️`, ...args);
    }
    
    error(...args) {
        console.error(`[Plugin:${this.manifest.id}] ❌`, ...args);
    }

    // ==========================================
    // Plugin Interface Methods (to be overridden)
    // ==========================================

    async getAnimeList(filters, page) {
        if (!this.manifest.capabilities.browse) {
            throw new Error('This plugin does not support browsing');
        }
        throw new Error('Not implemented');
    }

    async getEpisodeList(animeId) {
        throw new Error('Not implemented');
    }

    async getVideoUrl(animeId, season, episode) {
        throw new Error('Not implemented');
    }

    async searchAnime(keyword, page) {
        if (!this.manifest.capabilities.search) {
            throw new Error('This plugin does not support search');
        }
        throw new Error('Not implemented');
    }

    async getWeeklySchedule(day) {
        if (!this.manifest.capabilities.weeklySchedule) {
            throw new Error('This plugin does not support weekly schedule');
        }
        throw new Error('Not implemented');
    }

    async getAnimeDetail(animeId) {
        if (!this.manifest.capabilities.animeDetail) {
            throw new Error('This plugin does not support anime detail');
        }
        throw new Error('Not implemented');
    }
}

module.exports = BasePlugin;
