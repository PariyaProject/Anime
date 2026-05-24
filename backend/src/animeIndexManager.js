const fs = require('fs').promises;
const path = require('path');
const { pluginManager } = require('./plugins/PluginManager');

const INDEX_FILE = path.join(__dirname, '..', 'config', 'anime-index.json');

const DEFAULT_INDEX = {
    version: '2.0',
    lastUpdated: null,
    totalAnime: 0,
    anime: {}
};

class AnimeIndexManager {
    constructor() {
        this.index = null;
        this.isBuilding = false;
        this.buildProgress = 0;
        this.totalBuildSteps = 0;
        this.lastBuildAttempt = null;
    }

    async ensureConfigDirectory() {
        try {
            const configDir = path.dirname(INDEX_FILE);
            await fs.mkdir(configDir, { recursive: true });
            return true;
        } catch (error) {
            console.error(`⚠️ Failed to create config directory: ${error.message}`);
            return false;
        }
    }

    async loadIndex() {
        try {
            await fs.access(INDEX_FILE);
            const content = await fs.readFile(INDEX_FILE, 'utf8');
            const data = JSON.parse(content);

            if (!data || typeof data !== 'object' || !data.anime) {
                console.warn('⚠️ Invalid index structure, using default');
                return this.getEmptyIndex();
            }

            console.log(`✅ Loaded anime index: ${data.totalAnime || 0} entries`);
            return data;
        } catch (error) {
            return this.getEmptyIndex();
        }
    }

    async saveIndex(indexData) {
        try {
            await this.ensureConfigDirectory();
            indexData.lastUpdated = new Date().toISOString();
            indexData.totalAnime = Object.keys(indexData.anime).length;
            const tempFile = INDEX_FILE + '.tmp';
            await fs.writeFile(tempFile, JSON.stringify(indexData, null, 2), 'utf8');
            await fs.rename(tempFile, INDEX_FILE);
            return true;
        } catch (error) {
            console.error('❌ Failed to save index:', error.message);
            return false;
        }
    }

    getEmptyIndex() {
        return JSON.parse(JSON.stringify(DEFAULT_INDEX));
    }

    getIndexStats() {
        if (!this.index) {
            return { totalAnime: 0, lastUpdated: null, isBuilding: this.isBuilding };
        }
        return {
            totalAnime: Object.keys(this.index.anime).length,
            lastUpdated: this.index.lastUpdated,
            isBuilding: this.isBuilding
        };
    }

    async initialize() {
        const loadedIndex = await this.loadIndex();
        const loadedCount = Object.keys(loadedIndex.anime || {}).length;

        if (loadedCount > 0) {
            this.index = loadedIndex;
        } else {
            this.index = loadedIndex;
            if (Object.keys(this.index.anime || {}).length === 0) {
                this.isBuilding = false;
            }
        }
        return this.index;
    }

    async buildInitialIndex(sourceId = null) {
        if (this.isBuilding) return;

        const source = sourceId || pluginManager.getDefaultSourceId();
        const plugin = pluginManager.getPlugin(source);
        if (!plugin) {
            console.error(`❌ Plugin not found: ${source}`);
            return;
        }

        if (!this.index) await this.initialize();

        this.isBuilding = true;
        this.lastBuildAttempt = Date.now();
        console.log(`🔨 Building index from source: ${source}...`);

        let totalScraped = 0;
        const currentYear = new Date().getFullYear();
        const startYear = 1980;
        const years = [];
        for (let y = currentYear; y >= startYear; y--) years.push(y);

        this.totalBuildSteps = years.length;
        this.buildProgress = 0;

        try {
            for (const year of years) {
                this.buildProgress++;
                console.log(`📄 [${this.buildProgress}/${this.totalBuildSteps}] Scraping year ${year}...`);

                for (let page = 1; page <= 10; page++) {
                    try {
                        const result = await plugin.getAnimeList({ year: String(year) }, page);
                        const animeList = result.animeList || [];
                        if (animeList.length === 0) break;

                        let pageNew = 0;
                        for (const anime of animeList) {
                            const key = `${source}_${anime.id}`;
                            if (!this.index.anime[key]) {
                                this.index.anime[key] = {
                                    ...anime,
                                    sourceId: source,
                                    indexedAt: new Date().toISOString()
                                };
                                totalScraped++;
                                pageNew++;
                            }
                        }
                        if (pageNew === 0 && page > 1) break;
                    } catch (error) {
                        break;
                    }
                }
            }
            await this.saveIndex(this.index);
            console.log(`✅ Index build complete: ${totalScraped} new anime indexed`);
        } catch (error) {
            console.error(`❌ Index build failed: ${error.message}`);
        } finally {
            this.isBuilding = false;
        }
    }

    search(query) {
        if (!this.index || !query || query.trim().length < 2) return [];

        const normalizedQuery = query.toLowerCase().trim();
        const queryLength = normalizedQuery.length;
        const results = [];
        const allowContainsMatch = queryLength >= 2;
        const allowStartsWithMatch = queryLength >= 2;

        for (const key in this.index.anime) {
            const anime = this.index.anime[key];
            const title = (anime.title || '').toLowerCase();
            let score = 0;

            if (title === normalizedQuery) score = 100;
            else if (allowStartsWithMatch && title.startsWith(normalizedQuery)) score = 80;
            else if (allowContainsMatch && title.includes(normalizedQuery)) score = 60;

            if (score > 0) results.push({ ...anime, _relevance: score });
        }

        results.sort((a, b) => b._relevance - a._relevance);
        return results.slice(0, 50).map(({ _relevance, ...anime }) => anime);
    }

    async incrementalUpdate(animeList, sourceId = 'cycani') {
        if (!this.index || this.isBuilding) return { added: 0, skipped: true };

        let newAnimeCount = 0;
        for (const anime of animeList) {
            const key = `${sourceId}_${anime.id}`;
            if (!this.index.anime[key]) {
                this.index.anime[key] = {
                    ...anime,
                    sourceId,
                    indexedAt: new Date().toISOString()
                };
                newAnimeCount++;
            }
        }

        if (newAnimeCount > 0) {
            try {
                await this.saveIndex(this.index);
            } catch (error) {}
        }
        return { added: newAnimeCount, skipped: false };
    }
}

let animeIndexManager = null;
function getAnimeIndexManager() {
    if (!animeIndexManager) animeIndexManager = new AnimeIndexManager();
    return animeIndexManager;
}

module.exports = { AnimeIndexManager, getAnimeIndexManager };
