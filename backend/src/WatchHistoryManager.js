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

function toFiniteNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function toPositiveInteger(value, fallback = 1) {
    const parsed = Number.parseInt(String(value), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeIsoTimestamp(value, fallback = nowIso()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
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

function mapExistingRowToRecord(row) {
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
        position: toFiniteNumber(row.position_seconds, 0),
        duration: toFiniteNumber(row.duration_seconds, 0),
        watchDate: normalizeIsoTimestamp(row.watch_date),
        updatedAt: normalizeIsoTimestamp(row.updated_at || row.watch_date),
        completed: Boolean(row.completed),
        sourceDeviceId: row.source_device_id || ''
    };
}

function pickPreferredRecord(current, incoming) {
    const currentWatchTime = new Date(current.watchDate).getTime();
    const incomingWatchTime = new Date(incoming.watchDate).getTime();
    const newerRecord = incomingWatchTime >= currentWatchTime ? incoming : current;

    const mergedPosition = Math.max(
        toFiniteNumber(current.position, 0),
        toFiniteNumber(incoming.position, 0)
    );
    const mergedDuration = Math.max(
        toFiniteNumber(current.duration, 0),
        toFiniteNumber(incoming.duration, 0)
    );
    const mergedCompleted = Boolean(current.completed || incoming.completed || toCompleted(mergedPosition, mergedDuration));
    const mergedWatchDate = incomingWatchTime >= currentWatchTime
        ? incoming.watchDate
        : current.watchDate;

    return {
        animeId: newerRecord.animeId || current.animeId || incoming.animeId,
        animeTitle: newerRecord.animeTitle || current.animeTitle || incoming.animeTitle || '未知动画',
        animeCover: newerRecord.animeCover || current.animeCover || incoming.animeCover || '',
        season: newerRecord.season,
        episode: newerRecord.episode,
        episodeTitle: newerRecord.episodeTitle || current.episodeTitle || incoming.episodeTitle || `第${newerRecord.episode}集`,
        position: mergedPosition,
        duration: mergedDuration,
        watchDate: mergedWatchDate,
        updatedAt: mergedWatchDate,
        completed: mergedCompleted,
        sourceDeviceId: newerRecord.sourceDeviceId || current.sourceDeviceId || incoming.sourceDeviceId || ''
    };
}

function normalizeImportedRecord(record) {
    if (!record || typeof record !== 'object') {
        return null;
    }

    const animeId = String(record.animeId || record.id || '').trim();
    if (!animeId) {
        return null;
    }

    const season = toPositiveInteger(record.season, 1);
    const episode = toPositiveInteger(record.episode, 1);
    const position = Math.max(0, toFiniteNumber(record.position, 0));
    const duration = Math.max(0, toFiniteNumber(record.duration, 0));
    const watchDate = normalizeIsoTimestamp(record.watchDate || record.lastUpdated || record.updatedAt || nowIso());

    return {
        animeId,
        animeTitle: String(record.animeTitle || record.title || '未知动画'),
        animeCover: String(record.animeCover || record.cover || ''),
        season,
        episode,
        episodeTitle: String(record.episodeTitle || record.title || `第${episode}集`),
        position,
        duration,
        watchDate,
        updatedAt: watchDate,
        completed: Boolean(record.completed || toCompleted(position, duration)),
        sourceDeviceId: String(record.sourceDeviceId || '')
    };
}

function collectImportedRecordCandidates(payload) {
    if (!payload) {
        return [];
    }

    if (Array.isArray(payload)) {
        return payload;
    }

    if (typeof payload !== 'object') {
        return [];
    }

    if (Array.isArray(payload.records)) {
        return payload.records;
    }

    if (Array.isArray(payload.watchHistory)) {
        return payload.watchHistory;
    }

    if (payload.data && typeof payload.data === 'object') {
        const nestedDataRecords = collectImportedRecordCandidates(payload.data);
        if (nestedDataRecords.length > 0) {
            return nestedDataRecords;
        }
    }

    const nestedCandidates = [];
    for (const value of Object.values(payload)) {
        if (value && typeof value === 'object' && Array.isArray(value.watchHistory)) {
            nestedCandidates.push(...value.watchHistory);
        }
    }

    return nestedCandidates;
}

function normalizeImportedRecords(payload) {
    const dedupedRecords = new Map();
    const candidates = collectImportedRecordCandidates(payload);

    for (const candidate of candidates) {
        const normalized = normalizeImportedRecord(candidate);
        if (!normalized) {
            continue;
        }

        const key = `${normalized.animeId}_${normalized.season}_${normalized.episode}`;
        const existing = dedupedRecords.get(key);
        dedupedRecords.set(key, existing ? pickPreferredRecord(existing, normalized) : normalized);
    }

    return Array.from(dedupedRecords.values())
        .sort((a, b) => new Date(a.watchDate).getTime() - new Date(b.watchDate).getTime());
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

    static async exportWatchHistory(userId, username = '') {
        if (!userId) {
            throw new Error('userId is required');
        }

        const database = getDatabase();
        const rows = database.prepare(`
            SELECT *
            FROM watch_progress
            WHERE user_id = ?
            ORDER BY datetime(watch_date) DESC
        `).all(Number(userId));
        const records = rows.map(mapProgressRow);

        return {
            format: 'anime-watch-history',
            version: 1,
            exportedAt: nowIso(),
            user: {
                username: username || ''
            },
            recordCount: records.length,
            records
        };
    }

    static async importWatchHistory(userId, payload, options = {}) {
        if (!userId) {
            throw new Error('userId is required');
        }

        const mode = options.mode === 'replace' ? 'replace' : 'merge';
        const normalizedRecords = normalizeImportedRecords(payload);

        if (normalizedRecords.length === 0) {
            throw new Error('导入文件中没有可用的观看历史记录');
        }

        const database = getDatabase();
        const selectExistingStatement = database.prepare(`
            SELECT *
            FROM watch_progress
            WHERE user_id = ? AND anime_id = ? AND season = ? AND episode = ?
        `);
        const deleteUserHistoryStatement = database.prepare(`
            DELETE FROM watch_progress
            WHERE user_id = ?
        `);
        const upsertStatement = database.prepare(`
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
        `);
        const countStatement = database.prepare(`
            SELECT COUNT(*) AS count
            FROM watch_progress
            WHERE user_id = ?
        `);

        const result = database.transaction((recordsToImport) => {
            if (mode === 'replace') {
                deleteUserHistoryStatement.run(Number(userId));
            }

            for (const importedRecord of recordsToImport) {
                const existingRow = mode === 'merge'
                    ? selectExistingStatement.get(
                        Number(userId),
                        importedRecord.animeId,
                        importedRecord.season,
                        importedRecord.episode
                    )
                    : null;

                const finalRecord = existingRow
                    ? pickPreferredRecord(mapExistingRowToRecord(existingRow), importedRecord)
                    : importedRecord;

                upsertStatement.run(
                    Number(userId),
                    finalRecord.animeId,
                    finalRecord.animeTitle,
                    finalRecord.animeCover,
                    finalRecord.season,
                    finalRecord.episode,
                    finalRecord.episodeTitle,
                    finalRecord.position,
                    finalRecord.duration,
                    finalRecord.completed ? 1 : 0,
                    finalRecord.watchDate,
                    finalRecord.updatedAt,
                    finalRecord.sourceDeviceId || ''
                );
            }

            const countRow = countStatement.get(Number(userId));
            return {
                importedCount: recordsToImport.length,
                totalCount: Number(countRow?.count || 0),
                mode
            };
        })(normalizedRecords);

        return result;
    }
}

module.exports = { WatchHistoryManager, migrateOldDataFile, ensureConfigDirectory };
