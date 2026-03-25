/**
 * Enhanced HTTP Client for Web Scraping
 * Provides rate limiting, retry logic, and User-Agent rotation to bypass anti-bot protection.
 */

const axios = require('axios');

/**
 * Pool of realistic User-Agent strings
 * Updated periodically to remain current with modern browsers
 */
const USER_AGENTS = [
    // Chrome on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    // Firefox on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
    // Edge on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
    // Chrome on macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    // Firefox on macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0'
];

/**
 * Enhanced browser headers to mimic legitimate requests
 * Includes Sec-Ch-Ua and other modern browser headers
 */
function getEnhancedHeaders(url = '') {
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

    const headers = {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
    };

    // Add Referer if URL is provided
    if (url && url.includes('cycani.org')) {
        headers['Referer'] = 'https://www.cycani.org/';
        headers['Sec-Ch-Ua'] = '"Chromium";v="131", "Not_A Brand";v="24"';
        headers['Sec-Ch-Ua-Mobile'] = '?0';
        headers['Sec-Ch-Ua-Platform'] = '"Windows"';
    }

    return headers;
}

/**
 * Rate limiter to avoid triggering anti-bot detection
 * Tracks last request time per domain
 */
class RateLimiter {
    constructor(minDelay = 1000) {
        this.minDelay = minDelay; // Minimum delay between requests in ms
        this.lastRequestTime = new Map(); // domain -> timestamp
    }

    /**
     * Wait if necessary to respect rate limit
     * @param {string} url - Target URL
     */
    async throttle(url) {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            const now = Date.now();
            const lastTime = this.lastRequestTime.get(domain) || 0;
            const elapsed = now - lastTime;

            if (elapsed < this.minDelay) {
                const waitTime = this.minDelay - elapsed;
                console.log(`⏳ Rate limiting: waiting ${waitTime}ms before request to ${domain}`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }

            this.lastRequestTime.set(domain, Date.now());
        } catch (e) {
            // Invalid URL, proceed without rate limiting
        }
    }

    /**
     * Clear rate limit history (useful for testing)
     */
    clear() {
        this.lastRequestTime.clear();
    }
}

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableStatusCodes: [403, 429, 503, 504],
    retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED']
};

/**
 * Calculate delay with exponential backoff and jitter
 * @param {number} attempt - Attempt number (0-based)
 * @returns {number} Delay in milliseconds
 */
function calculateBackoff(attempt) {
    const exponentialDelay = Math.min(
        RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
        RETRY_CONFIG.maxDelay
    );
    // Add jitter (±25%)
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
    return Math.max(0, exponentialDelay + jitter);
}

/**
 * Create enhanced axios instance with retry logic
 * @param {Object} options - Configuration options
 * @returns {Object} Axios instance
 */
function createHttpClient(options = {}) {
    const {
        minDelay = 1000, // Rate limit delay in ms (from RATE_LIMIT_DELAY env var)
        timeout = 15000
    } = options;

    const rateLimiter = new RateLimiter(minDelay);

    // Create axios instance
    const client = axios.create({
        timeout
    });

    // Request interceptor for rate limiting and headers
    client.interceptors.request.use(
        async (config) => {
            // Apply rate limiting before request
            await rateLimiter.throttle(config.url);

            // Set enhanced headers
            config.headers = {
                ...getEnhancedHeaders(config.url),
                ...config.headers // Allow overriding specific headers
            };

            // Log the request (except for image proxy to reduce noise)
            if (!config.url.includes('/api/image-proxy')) {
                console.log(`🌐 ${config.method?.toUpperCase()} ${config.url}`);
            }

            return config;
        },
        (error) => Promise.reject(error)
    );

    // Response interceptor for retry logic
    client.interceptors.response.use(
        (response) => response,
        async (error) => {
            const config = error.config || {};

            // Don't retry if explicitly disabled
            if (config.skipRetry === true) {
                return Promise.reject(error);
            }

            // Check if we should retry
            const statusCode = error.response?.status;
            const isRetryableStatus = statusCode && RETRY_CONFIG.retryableStatusCodes.includes(statusCode);
            const isRetryableError = error.code && RETRY_CONFIG.retryableErrors.includes(error.code);
            const shouldRetry = isRetryableStatus || isRetryableError;

            if (!shouldRetry) {
                return Promise.reject(error);
            }

            // Initialize retry counter
            config.__retryCount = config.__retryCount || 0;

            if (config.__retryCount >= RETRY_CONFIG.maxRetries) {
                console.error(`❌ Max retries reached for ${config.url}`);
                return Promise.reject(error);
            }

            // Increment retry counter
            config.__retryCount++;

            // Calculate backoff delay
            const delay = calculateBackoff(config.__retryCount - 1);
            console.log(`🔄 Retrying ${config.url} (attempt ${config.__retryCount}/${RETRY_CONFIG.maxRetries}) after ${Math.round(delay)}ms - Status: ${statusCode || error.code}`);

            // Wait and retry
            await new Promise(resolve => setTimeout(resolve, delay));

            return client(config);
        }
    );

    return client;
}

/**
 * Global HTTP client instance
 */
const httpClient = createHttpClient({
    minDelay: parseInt(process.env.RATE_LIMIT_DELAY || '1000', 10),
    timeout: parseInt(process.env.REQUEST_TIMEOUT || '15000', 10)
});

module.exports = {
    httpClient,
    getEnhancedHeaders,
    USER_AGENTS,
    RateLimiter,
    createHttpClient,
    RETRY_CONFIG
};
