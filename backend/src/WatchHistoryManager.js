const path = require('path');
const { ensureConfigDirectory, getDatabase } = require('./AppDatabase');

const LEGACY_WATCH_HISTORY_FILE = path.join(__dirname, '..', '..', 'config', 'watch-history.json');

function nowIso() {
    return new Date().toISOString();
}

function toCompleted(position, duration) {
    if (!duration || duration <= 0) {
        return false;
    }

    return position > 0 && (position / duration) > 0.9;
}

function mapProgressRow(row) {
    if (!row) {
        return null;
    }

    return {
        animeId: String(row.anime_id),
        animeTitle: row.anime_title || '未知动画',
        animeCover: row.anime_cover || '',
        season: Number(row.season),
        episode: Number(row.episode),
        episodeTitle: row.episode_title || `第${row.episode}集`,
        position: Number(row.position_seconds || 0),
        duration: Number(row.duration_seconds || 0),
        watchDate: row.watch_date,
        completed: Boolean(row.completed)
    };
}

async function migrateOldDataFile() {
    const database = getDatabase();
    const legacyImportFlag = database
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='watch_progress'")
        .get();

    if (!legacyImportFlag) {
        return;
    }

    if (!require('fs').existsSync(LEGACY_WATCH_HISTORY_FILE)) {
        return;
    }

    const existingHistory = database
        .prepare('SELECT COUNT(*) AS count FROM watch_progress')
        .get();

    if (existingHistory?.count > 0) {
        return;
    }

    console.log(`ℹ️ Legacy watch history JSON detected at ${LEGACY_WATCH_HISTORY_FILE}.`);
    console.log('ℹ️ It is not auto-imported because watch history now belongs to signed-in users.');
}

class WatchHistoryManager {
    static async loadHistory() {
        getDatabase();
        return true;
    }

    static async saveHistory() {
        return true;
    }

    static async addToWatchHistory(userId, animeInfo, episodeInfo, position = 0, sourceDeviceId = '') {
        if (!userId) {
            throw new Error('userId is required');
        }

        if (!animeInfo || !animeInfo.id) {
            throw new Error('Invalid animeInfo: animeId is required');
        }

        if (!episodeInfo) {
            throw new Error('Invalid episodeInfo: episode info is required');
        }

        const database = getDatabase();
        const season = Number(episodeInfo.season || 1);
        const episode = Number(episodeInfo.episode || 1);
        const requestedPosition = Number(position || 0);
        const requestedDuration = Number(episodeInfo.duration || 0);
        const now = nowIso();
        const existingRow = database.prepare(`
            SELECT position_seconds, duration_seconds, completed
            FROM watch_progress
            WHERE user_id = ? AND anime_id = ? AND season = ? AND episode = ?
        `).get(Number(userId), String(animeInfo.id), season, episode);
        const existingPosition = Number(existingRow?.position_seconds || 0);
        const existingDuration = Number(existingRow?.duration_seconds || 0);
        const suspiciousEarlyOverwrite = requestedDuration <= 0
            && requestedPosition <= 5
            && existingPosition > 5;

        // Guard against accidental regressions to zero caused by early player events.
        const safePosition = (requestedPosition <= 1 && existingPosition > 1) || suspiciousEarlyOverwrite
            ? existingPosition
            : requestedPosition;

        // Duration is often unknown early in playback; never let an empty duration
        // wipe out a previously known one.
        const safeDuration = requestedDuration > 0
            ? requestedDuration
            : existingDuration;

        const completed = (
            toCompleted(safePosition, safeDuration) ||
            (Boolean(existingRow?.completed) && safePosition >= existingPosition)
        ) ? 1 : 0;

        database.prepare(`
            INSERT INTO watch_progress (
                user_id,
                anime_id,
                anime_title,
                anime_cover,
                season,
                episode,
                episode_title,
                position_seconds,
                duration_seconds,
                completed,
                watch_date,
                updated_at,
                source_device_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, anime_id, season, episode)
            DO UPDATE SET
                anime_title = excluded.anime_title,
                anime_cover = excluded.anime_cover,
                episode_title = excluded.episode_title,
                position_seconds = excluded.position_seconds,
                duration_seconds = excluded.duration_seconds,
                completed = excluded.completed,
                watch_date = excluded.watch_date,
                updated_at = excluded.updated_at,
                source_device_id = excluded.source_device_id
        `).run(
            Number(userId),
            String(animeInfo.id),
            animeInfo.title || '未知动画',
            animeInfo.cover || '',
            season,
            episode,
            episodeInfo.title || `第${episode}集`,
            safePosition,
            safeDuration,
            completed,
            now,
            now,
            sourceDeviceId || ''
        );

        const row = database.prepare(`
            SELECT *
            FROM watch_progress
            WHERE user_id = ? AND anime_id = ? AND season = ? AND episode = ?
        `).get(Number(userId), String(animeInfo.id), season, episode);

        return mapProgressRow(row);
    }

    static async getWatchHistory(userId, limit = 20) {
        if (!userId) {
            return [];
        }

        const database = getDatabase();
        const rows = database.prepare(`
            SELECT *
            FROM watch_progress
            WHERE user_id = ?
            ORDER BY datetime(watch_date) DESC
            LIMIT ?
        `).all(Number(userId), Number(limit || 20));

        return rows.map(mapProgressRow);
    }

    static async getLastPosition(userId, animeId, season, episode) {
        if (!userId) {
            return { position: 0 };
        }

        const database = getDatabase();
        const row = database.prepare(`
            SELECT position_seconds, updated_at
            FROM watch_progress
            WHERE user_id = ? AND anime_id = ? AND season = ? AND episode = ?
        `).get(Number(userId), String(animeId), Number(season), Number(episode));

        if (!row) {
            return { position: 0 };
        }

        return {
            position: Number(row.position_seconds || 0),
            lastUpdated: row.updated_at
        };
    }

    static async getContinueWatching(userId) {
        if (!userId) {
            return [];
        }

        const database = getDatabase();
        const rows = database.prepare(`
            SELECT *
            FROM watch_progress
            WHERE user_id = ?
            ORDER BY datetime(watch_date) DESC
            LIMIT 12
        `).all(Number(userId));

        return rows.map(mapProgressRow);
    }
}

module.exports = { WatchHistoryManager, migrateOldDataFile, ensureConfigDirectory };
