/**
 * URL Constructor for Cycani.org Anime Lists
 *
 * This utility constructs proper URLs for different filter combinations
 * based on the actual cycani.org website structure.
 */

class AnimeListUrlConstructor {
    constructor(baseUrl = 'https://www.cycani.org') {
        this.baseUrl = baseUrl;
        this.defaultChannel = 20; // TV番组
    }

    /**
     * Channel mapping for different content types
     */
    getChannelMap() {
        return {
            'tv': 20,      // TV番组
            'movie': 21,   // 剧场番组
            '4k': 26,      // 4K专区
            'guoman': 27,  // 国漫（外部源）
            'default': 20  // Default to TV番组
        };
    }

    /**
     * Construct anime list URL based on filters
     * @param {Object} filters - Filter parameters
     * @param {string} filters.search - Search keyword
     * @param {string} filters.genre - Genre filter
     * @param {string} filters.year - Year filter
     * @param {string} filters.letter - Letter filter
     * @param {string} filters.sort - Sort order (time, hits, score)
     * @param {string} filters.channel - Channel (tv, movie, 4k, guoman)
     * @param {number} filters.page - Page number
     * @returns {string} Constructed URL
     */
    construct(filters) {
        const { search, genre, year, letter, sort, channel = 'tv', page = 1 } = filters;

        // Search has completely different URL pattern
        if (search) {
            if (this.hasConflictingFilters(search, { genre, year, letter })) {
                throw new Error('Search cannot be combined with other filters');
            }
            return `${this.baseUrl}/search?wd=${encodeURIComponent(search)}`;
        }

        // Get channel ID
        const channelMap = this.getChannelMap();
        const channelId = channelMap[channel] || channelMap.default;
        const showPath = `/show/${channelId}`;

        // Base URL for filtered lists
        let url = `${this.baseUrl}${showPath}.html`;

        // Apply primary filter (only one can be primary)
        if (genre) {
            url = `${this.baseUrl}${showPath}/class/${encodeURIComponent(genre)}.html`;
        } else if (year) {
            url = `${this.baseUrl}${showPath}/year/${year}.html`;
        } else if (letter) {
            url = `${this.baseUrl}${showPath}/letter/${letter}.html`;
        }

        // Apply secondary filters (sort, pagination)
        if (sort && sort !== 'time') {
            url = url.replace('.html', `/by/${sort}.html`);
        }

        if (page > 1) {
            url = url.replace('.html', `/page/${page}.html`);
        }

        return url;
    }

    /**
     * Check if search conflicts with other filters
     * @param {string} search - Search keyword
     * @param {Object} otherFilters - Other filter parameters
     * @returns {boolean} True if conflicts exist
     */
    hasConflictingFilters(search, otherFilters) {
        return search && Object.values(otherFilters).some(filter => filter && filter !== '');
    }

    /**
     * Get channel name from channel ID
     * @param {number} channelId - Channel ID
     * @returns {string} Channel name
     */
    getChannelName(channelId) {
        const channelMap = this.getChannelMap();
        const entries = Object.entries(channelMap);
        const found = entries.find(([name, id]) => id === channelId);
        return found ? found[0] : 'tv';
    }
}

/**
 * Parameter Validator for Anime List API
 */
class ApiParameterValidator {
    /**
     * Validate anime list filter parameters
     * @param {Object} params - Parameters to validate
     * @returns {Array} Array of error messages
     */
    static validateAnimeListFilters(params) {
        const errors = [];
        const { search, genre, year, letter, sort, page, channel } = params;

        // Validate search conflicts
        if (search && (genre || year || letter)) {
            errors.push('Search cannot be combined with genre, year, or letter filters');
        }

        // Validate channel
        const validChannels = ['tv', 'movie', '4k', 'guoman'];
        if (channel && !validChannels.includes(channel)) {
            errors.push(`Invalid channel: ${channel}. Valid channels: ${validChannels.join(', ')}`);
        }

        // Validate sort options
        const validSorts = ['time', 'hits', 'score'];
        if (sort && !validSorts.includes(sort)) {
            errors.push(`Invalid sort option: ${sort}. Valid options: ${validSorts.join(', ')}`);
        }

        // Validate year format
        if (year && !/^\d{4}$/.test(year)) {
            errors.push('Year must be a 4-digit number (e.g., 2024)');
        }

        // Validate letter format
        if (letter && !/^[A-Z]$|^0-9$/.test(letter.toUpperCase())) {
            errors.push('Letter must be A-Z or 0-9');
        }

        // Validate page number
        if (page && (page < 1 || page > 1000)) {
            errors.push('Page must be between 1 and 1000');
        }

        return errors;
    }
}

module.exports = {
    AnimeListUrlConstructor,
    ApiParameterValidator
};