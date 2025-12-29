/**
 * Anime Index Manager
 * Manages local anime index for fast search without CAPTCHA requirements.
 * Uses category browsing to build and maintain the index.
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { httpClient } = require('./httpClient');

// Index file location
const INDEX_FILE = path.join(__dirname, '..', 'config', 'anime-index.json');

// Default empty index structure
const DEFAULT_INDEX = {
    version: '1.0',
    lastUpdated: null,
    totalAnime: 0,
    anime: {}
};

// Category combinations for initial index build
// NOTE: cycani.org URL structure only supports ONE filter at a time
// So we only scrape by year (which already includes all types: TV, 电影, OVA)
const CATEGORIES = {
    years: (() => {
        const currentYear = new Date().getFullYear()
        const startYear = 1980  // Website has data from 1980
        const years = []
        for (let year = currentYear; year >= startYear; year--) {
            years.push(year)
        }
        return years
    })(),
    maxPages: 10  // Maximum pages to scrape per year (safety limit)
    // Total: 46 years (1980-2025) × ~10 pages × ~48 anime = ~20,000+ anime expected
};

// Safety buffer for incremental updates
const SAFETY_BUFFER_SIZE = 10;

// Minimum time between build attempts (5 minutes)
const MIN_BUILD_INTERVAL = 5 * 60 * 1000;

/**
 * Anime Index Manager Class
 */
class AnimeIndexManager {
    constructor() {
        this.index = null;
        this.isBuilding = false;
        this.buildProgress = 0;
        this.totalBuildSteps = 0;
        this.lastBuildAttempt = null;
    }

    /**
     * Ensure config directory exists
     */
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

    /**
     * Load index from disk
     */
    async loadIndex() {
        try {
            // Check if file exists
            await fs.access(INDEX_FILE);

            const content = await fs.readFile(INDEX_FILE, 'utf8');
            const data = JSON.parse(content);

            // Validate structure
            if (!data || typeof data !== 'object' || !data.anime) {
                console.warn('⚠️ Invalid index structure, using default');
                return this.getEmptyIndex();
            }

            console.log(`✅ Loaded anime index: ${data.totalAnime || 0} entries`);
            return data;
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('📄 Index file not found, will create new index');
                return this.getEmptyIndex();
            }
            console.error('❌ Failed to load index:', error.message);
            return this.getEmptyIndex();
        }
    }

    /**
     * Save index to disk with atomic write
     */
    async saveIndex(indexData) {
        try {
            await this.ensureConfigDirectory();

            // Update timestamp and count
            indexData.lastUpdated = new Date().toISOString();
            indexData.totalAnime = Object.keys(indexData.anime).length;

            // Write to temporary file first, then rename (atomic operation)
            const tempFile = INDEX_FILE + '.tmp';
            const jsonString = JSON.stringify(indexData, null, 2);

            await fs.writeFile(tempFile, jsonString, 'utf8');
            await fs.rename(tempFile, INDEX_FILE);

            console.log(`💾 Saved index: ${indexData.totalAnime} entries to ${INDEX_FILE}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to save index:', error.message);
            return false;
        }
    }

    /**
     * Get empty index structure
     */
    getEmptyIndex() {
        return JSON.parse(JSON.stringify(DEFAULT_INDEX));
    }

    /**
     * Get index statistics
     */
    getIndexStats() {
        if (!this.index) {
            return {
                totalAnime: 0,
                lastUpdated: null,
                isBuilding: this.isBuilding
            };
        }

        return {
            totalAnime: Object.keys(this.index.anime).length,
            lastUpdated: this.index.lastUpdated,
            isBuilding: this.isBuilding
        };
    }

    /**
     * Initialize index (load from disk or create new)
     */
    async initialize() {
        // Load from disk first
        const loadedIndex = await this.loadIndex();

        // Check if loaded index has data
        const loadedCount = Object.keys(loadedIndex.anime || {}).length;

        if (loadedCount > 0) {
            // Index exists on disk
            console.log(`📊 Index loaded from disk: ${loadedCount} anime`);
            this.index = loadedIndex;
            // Don't reset isBuilding here - let the caller decide whether to build
        } else {
            // No index on disk
            console.log(`📋 No index found on disk, ready to build`);
            this.index = loadedIndex;
            // Reset isBuilding only if index is truly empty
            if (Object.keys(this.index.anime || {}).length === 0) {
                this.isBuilding = false;
            }
        }

        return this.index;
    }

    /**
     * Build initial index from category browsing
     * Scrapes all genre × year combinations
     */
    async buildInitialIndex() {
        if (this.isBuilding) {
            console.log('⚠️ Index build already in progress, skipping');
            return;
        }

        // Check minimum interval between builds
        if (this.lastBuildAttempt) {
            const timeSinceLastBuild = Date.now() - this.lastBuildAttempt;
            if (timeSinceLastBuild < MIN_BUILD_INTERVAL) {
                const waitTime = Math.ceil((MIN_BUILD_INTERVAL - timeSinceLastBuild) / 1000);
                console.log(`⚠️ Last build attempt was ${waitTime}s ago, please wait before rebuilding`);
                return;
            }
        }

        // Check if there's already data on disk (don't rebuild if exists)
        try {
            const existingData = await this.loadIndex();
            const existingCount = Object.keys(existingData.anime || {}).length;
            if (existingCount > 0) {
                console.log(`ℹ️ Index already exists with ${existingCount} entries, skipping build`);
                this.index = existingData;
                this.isBuilding = false;
                this.lastBuildAttempt = null; // Reset since we're not building
                return;
            }
        } catch (error) {
            console.log('ℹ️ No existing index found, starting fresh build');
        }

        this.isBuilding = true;
        this.lastBuildAttempt = Date.now();
        this.index = this.getEmptyIndex();

        console.log('🔨 Building initial anime index...');
        console.log(`📋 Years to scrape: ${CATEGORIES.years.length} years`);
        console.log(`📄 Max pages per year: ${CATEGORIES.maxPages}`);
        this.totalBuildSteps = CATEGORIES.years.length;
        this.buildProgress = 0;

        let totalScraped = 0;

        try {
            // Scrape each year
            for (const year of CATEGORIES.years) {
                this.buildProgress++;
                let yearScraped = 0;

                console.log(`📄 [${this.buildProgress}/${this.totalBuildSteps}] Scraping year ${year}...`);

                // Scrape multiple pages for each year
                for (let page = 1; page <= CATEGORIES.maxPages; page++) {
                    try {
                        const url = this.buildCategoryUrl('', year, page);

                        const animeList = await this.scrapeAnimeList(url);

                        // If no anime found, we've reached the end
                        if (animeList.length === 0) {
                            console.log(`   ⏹️ Page ${page}: No anime found, stopping pagination`);
                            break;
                        }

                        // Add to index
                        let pageNew = 0;
                        for (const anime of animeList) {
                            if (!this.index.anime[anime.id]) {
                                this.index.anime[anime.id] = {
                                    id: anime.id,
                                    title: anime.title,
                                    cover: anime.cover,
                                    year: String(year),
                                    type: anime.type || 'TV',
                                    status: anime.status || '未知',
                                    episodes: anime.episodes || '未知',
                                    score: anime.score || '0',
                                    url: anime.url,
                                    indexedAt: new Date().toISOString()
                                };
                                totalScraped++;
                                pageNew++;
                            }
                        }

                        const pageStatus = pageNew > 0 ? `(+${pageNew} new)` : `(all existing)`;
                        console.log(`   ✅ Page ${page}: ${animeList.length} anime ${pageStatus}`);
                        yearScraped += animeList.length;

                        // If all anime were duplicates, stop pagination
                        if (pageNew === 0 && page > 1) {
                            console.log(`   ⏹️ No new anime on page ${page}, stopping pagination`);
                            break;
                        }

                    } catch (error) {
                        // If 404 or other error, stop pagination for this year
                        if (error.response?.status === 404) {
                            console.log(`   ⏹️ Page ${page}: Not found (404), stopping pagination`);
                            break;
                        }
                        console.error(`   ❌ Failed to scrape year ${year} page ${page}:`, error.message);
                        // Continue to next page on other errors
                    }
                }

                console.log(`   📊 Year ${year}: ${yearScraped} total anime (${totalScraped} unique)`);
            }

            // Save to disk
            await this.saveIndex(this.index);

            console.log(`✅ Index build complete: ${totalScraped} anime indexed`);
        } catch (error) {
            console.error(`❌ Index build failed: ${error.message}`);
            // Save partial progress even if build failed
            try {
                await this.saveIndex(this.index);
                console.log(`💾 Partial index saved: ${totalScraped} entries`);
            } catch (saveError) {
                console.error(`❌ Failed to save partial index: ${saveError.message}`);
            }
        } finally {
            // Always reset isBuilding flag
            this.isBuilding = false;
        }
    }

    /**
     * Build category URL for scraping
     * Uses the correct cycani.org URL structure: /show/{channelId}/{filter}.html
     * Supports pagination: /show/{channelId}/year/{year}/page/{page}.html
     */
    buildCategoryUrl(genre, year, page = 1) {
        const baseUrl = 'https://www.cycani.org';
        const channelId = 20; // TV番组

        // Start with base channel URL
        let url = `${baseUrl}/show/${channelId}.html`;

        // Apply primary filter (only one at a time)
        if (genre) {
            url = `${baseUrl}/show/${channelId}/class/${encodeURIComponent(genre)}.html`;
            // Add pagination if needed
            if (page > 1) {
                url = url.replace('.html', `/page/${page}.html`);
            }
        } else if (year) {
            url = `${baseUrl}/show/${channelId}/year/${year}.html`;
            // Add pagination if needed
            if (page > 1) {
                url = url.replace('.html', `/page/${page}.html`);
            }
        }

        return url;
    }

    /**
     * Scrape anime list from URL
     */
    async scrapeAnimeList(url) {
        try {
            const response = await httpClient.get(url, {
                timeout: 15000
            });

            const $ = cheerio.load(response.data);
            const animeList = [];

            for (const element of $('.public-list-box').toArray()) {
                const $box = $(element);
                const $link = $box.find('a[href*="/bangumi/"]');
                const $img = $box.find('img');
                const $subtitle = $box.find('.public-list-subtitle');

                if ($link.length && $img.length) {
                    const href = $link.attr('href');
                    const animeId = href?.match(/\/bangumi\/(\d+)\.html/);

                    if (animeId && animeId[1]) {
                        const title = $img.attr('alt') || $link.attr('title') || '';
                        let imgSrc = $img.attr('data-src') || $img.attr('src') || '';

                        let subtitleText = $subtitle.text().trim();
                        let episodes = '未知';
                        let status = '连载中';

                        if (subtitleText) {
                            const episodeMatches = subtitleText.match(/(\d+)集/);
                            if (episodeMatches) {
                                episodes = episodeMatches[1];
                            }

                            if (subtitleText.includes('已完结') || subtitleText.includes('全')) {
                                status = '已完结';
                            }
                        }

                        // Parse score
                        let score = '7.5';
                        const scoreSelectors = ['.public-list-prb i', '.public-list-prb', '.rating i', '.rating'];
                        for (const selector of scoreSelectors) {
                            const $score = $box.find(selector);
                            if ($score.length) {
                                const scoreText = $score.text().trim();
                                const scoreMatch = scoreText.match(/(\d+\.?\d*)/);
                                if (scoreMatch) {
                                    score = scoreMatch[1];
                                    break;
                                }
                            }
                        }

                        if (title) {
                            animeList.push({
                                id: animeId[1],
                                title: title,
                                cover: imgSrc,
                                url: `https://www.cycani.org${href}`,
                                type: 'TV',
                                year: '',
                                episodes: episodes,
                                status: status,
                                score: score
                            });
                        }
                    }
                }
            }

            return animeList;
        } catch (error) {
            console.error(`Failed to scrape ${url}:`, error.message);
            return [];
        }
    }

    /**
     * Search anime in local index
     * Returns results sorted by relevance
     *
     * Matching strategy (progressive strictness):
     * - Query length < 2: return empty (too short)
     * - Query length 2-3: only exact match or starts-with
     * - Query length 4+: exact > starts-with > contains
     * - Maximum 50 results, sorted by relevance
     */
    search(query) {
        if (!this.index || !query || query.trim().length < 2) {
            return [];
        }

        const normalizedQuery = query.toLowerCase().trim();
        const queryLength = normalizedQuery.length;
        const results = [];

        // Progressive matching: longer queries allow more flexible matching
        const allowContainsMatch = queryLength >= 4;
        const allowStartsWithMatch = queryLength >= 2;

        for (const animeId in this.index.anime) {
            const anime = this.index.anime[animeId];
            const title = anime.title.toLowerCase();

            let score = 0;

            // Exact match (highest priority)
            if (title === normalizedQuery) {
                score = 100;
            }
            // Starts with query (medium priority)
            else if (allowStartsWithMatch && title.startsWith(normalizedQuery)) {
                score = 80;
            }
            // Contains query (lowest priority, only for longer queries)
            else if (allowContainsMatch && title.includes(normalizedQuery)) {
                score = 60;
            }

            if (score > 0) {
                results.push({ ...anime, _relevance: score });
            }
        }

        // Sort by relevance descending
        results.sort((a, b) => b._relevance - a._relevance);

        // Remove internal relevance score and limit results
        return results.slice(0, 50).map(({ _relevance, ...anime }) => anime);
    }

    /**
     * Incrementally update index with new anime
     * Checks all anime in the list against the index
     * Adds any anime that doesn't exist in the index
     *
     * This is called on EVERY /api/anime-list request to actively grow the index
     */
    async incrementalUpdate(animeList) {
        // Skip update if index is building or doesn't exist
        if (!this.index || this.isBuilding) {
            console.log(`⏭️ Incremental update skipped: index is ${!this.index ? 'not loaded' : 'building'}`);
            return { added: 0, skipped: true };
        }

        console.log(`🔄 Checking ${animeList.length} anime for incremental update...`);

        let newAnimeCount = 0;
        let existingAnimeCount = 0;

        // Check ALL anime in the list (no early termination)
        for (const anime of animeList) {
            const animeId = anime.id;

            if (!this.index.anime[animeId]) {
                // New anime - add to index
                this.index.anime[animeId] = {
                    id: animeId,
                    title: anime.title,
                    cover: anime.cover,
                    year: anime.year || '',
                    type: anime.type || 'TV',
                    status: anime.status || '未知',
                    episodes: anime.episodes || '未知',
                    score: anime.score || '0',
                    url: anime.url,
                    indexedAt: new Date().toISOString()
                };
                newAnimeCount++;
            } else {
                existingAnimeCount++;
            }
        }

        // Save if new anime were added
        if (newAnimeCount > 0) {
            console.log(`📈 Incremental update: +${newAnimeCount} new anime (${existingAnimeCount} existing)`);
            try {
                await this.saveIndex(this.index);
            } catch (error) {
                console.error(`⚠️ Failed to save incremental update: ${error.message}`);
            }
        } else {
            // Reduce log noise - only log when something interesting happened
            if (animeList.length > 20) {
                // Only log if it's a substantial list
                console.log(`✅ All ${animeList.length} anime already in index`);
            }
        }

        return { added: newAnimeCount, skipped: false };
    }

    /**
     * Add single anime to index
     */
    async addAnime(anime) {
        if (!this.index) {
            return false;
        }

        if (!this.index.anime[anime.id]) {
            this.index.anime[anime.id] = {
                id: anime.id,
                title: anime.title,
                cover: anime.cover || '',
                year: anime.year || '',
                type: anime.type || 'TV',
                status: anime.status || '未知',
                episodes: anime.episodes || '未知',
                score: anime.score || '0',
                url: anime.url || '',
                indexedAt: new Date().toISOString()
            };

            await this.saveIndex(this.index);
            return true;
        }

        return false;
    }

    /**
     * Check if anime exists in index
     */
    hasAnime(animeId) {
        return this.index && this.index.anime && !!this.index.anime[animeId];
    }

    /**
     * Get anime by ID
     */
    getAnime(animeId) {
        if (!this.index || !this.index.anime) {
            return null;
        }
        return this.index.anime[animeId] || null;
    }
}

// Singleton instance
let animeIndexManager = null;

/**
 * Get or create anime index manager singleton
 */
function getAnimeIndexManager() {
    if (!animeIndexManager) {
        animeIndexManager = new AnimeIndexManager();
    }
    return animeIndexManager;
}

module.exports = {
    AnimeIndexManager,
    getAnimeIndexManager
};
