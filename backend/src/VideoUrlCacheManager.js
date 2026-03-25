const DEFAULT_REUSE_WINDOW_MS = 2 * 60 * 1000;
const DEFAULT_UNKNOWN_URL_TTL_MS = 10 * 60 * 1000;
const DEFAULT_STALE_RETENTION_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 1000;

class VideoUrlCacheManager {
    constructor({
        reuseWindowMs = DEFAULT_REUSE_WINDOW_MS,
        unknownUrlTtlMs = DEFAULT_UNKNOWN_URL_TTL_MS,
        staleRetentionMs = DEFAULT_STALE_RETENTION_MS,
        maxEntries = DEFAULT_MAX_ENTRIES
    } = {}) {
        this.reuseWindowMs = reuseWindowMs;
        this.unknownUrlTtlMs = unknownUrlTtlMs;
        this.staleRetentionMs = staleRetentionMs;
        this.maxEntries = maxEntries;
        this.entries = new Map();
        this.inFlight = new Map();
    }

    buildKey(bangumiId, season, episode) {
        return `${bangumiId}:${season}:${episode}`;
    }

    peek(key) {
        this.pruneStaleEntries();
        return this.entries.get(key) || null;
    }

    getReusableEntry(key, minRemainingMs = this.reuseWindowMs) {
        const entry = this.peek(key);
        if (!entry) {
            return null;
        }

        if (!this.isReusable(entry, minRemainingMs)) {
            return null;
        }

        return this.touchEntry(key, entry);
    }

    setEntry(key, entry) {
        const now = Date.now();
        const normalizedEntry = {
            ...entry,
            fetchedAt: Number.isFinite(entry.fetchedAt) ? entry.fetchedAt : now,
            expiresAt: Number.isFinite(entry.expiresAt) ? entry.expiresAt : null,
            lastAccessAt: now
        };

        this.entries.set(key, normalizedEntry);
        this.pruneStaleEntries();
        this.enforceMaxEntries();
        return normalizedEntry;
    }

    deleteEntry(key) {
        this.entries.delete(key);
    }

    async withInFlight(key, task) {
        const existingTask = this.inFlight.get(key);
        if (existingTask) {
            return existingTask;
        }

        const promise = Promise.resolve()
            .then(task)
            .finally(() => {
                this.inFlight.delete(key);
            });

        this.inFlight.set(key, promise);
        return promise;
    }

    getEffectiveExpiration(entry) {
        if (!entry) {
            return null;
        }

        if (Number.isFinite(entry.expiresAt)) {
            return entry.expiresAt;
        }

        return entry.fetchedAt + this.unknownUrlTtlMs;
    }

    isReusable(entry, minRemainingMs = this.reuseWindowMs) {
        const effectiveExpiration = this.getEffectiveExpiration(entry);
        if (!Number.isFinite(effectiveExpiration)) {
            return false;
        }

        return (effectiveExpiration - Date.now()) > minRemainingMs;
    }

    isStale(entry) {
        const effectiveExpiration = this.getEffectiveExpiration(entry);
        return (effectiveExpiration + this.staleRetentionMs) <= Date.now();
    }

    touchEntry(key, entry) {
        const touchedEntry = {
            ...entry,
            lastAccessAt: Date.now()
        };

        this.entries.set(key, touchedEntry);
        return touchedEntry;
    }

    pruneStaleEntries() {
        for (const [key, entry] of this.entries.entries()) {
            if (this.isStale(entry)) {
                this.entries.delete(key);
            }
        }
    }

    enforceMaxEntries() {
        if (this.entries.size <= this.maxEntries) {
            return;
        }

        const entriesByLastAccess = [...this.entries.entries()]
            .sort(([, leftEntry], [, rightEntry]) => leftEntry.lastAccessAt - rightEntry.lastAccessAt);

        while (this.entries.size > this.maxEntries && entriesByLastAccess.length > 0) {
            const [key] = entriesByLastAccess.shift();
            this.entries.delete(key);
        }
    }
}

const videoUrlCacheManager = new VideoUrlCacheManager();

module.exports = {
    VideoUrlCacheManager,
    videoUrlCacheManager
};
