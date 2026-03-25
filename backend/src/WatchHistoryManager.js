const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

// ============================================================
// Data Storage Configuration
// ============================================================

// New location for watch history data (inside application directory)
const WATCH_HISTORY_FILE = path.join(__dirname, '..', 'config', 'watch-history.json');
// Legacy location (for migration)
const LEGACY_WATCH_HISTORY_FILE = path.join(__dirname, '..', '..', 'data', 'proxy', 'watch-history.json');

// ============================================================
// Data Storage Resilience Helper Functions
// ============================================================

/**
 * Ensures the config directory exists for storing data files
 * Creates the directory if it's missing, never throws errors
 */
async function ensureConfigDirectory() {
    try {
        const configDir = path.dirname(WATCH_HISTORY_FILE);
        await fs.mkdir(configDir, { recursive: true });
        console.log(`✅ Config directory ensured: ${configDir}`);
        return true;
    } catch (error) {
        // Log but don't throw - server should continue even if directory creation fails
        console.error(`⚠️ Failed to create config directory: ${error.message}`);
        return false;
    }
}

/**
 * Creates a backup of the data file before any write operation
 * @param {string} filePath - Path to the file to backup
 */
async function createBackup(filePath) {
    try {
        // Check if file exists before backing up
        await fs.access(filePath);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${filePath}.backup.${timestamp}`;
        await fs.copyFile(filePath, backupPath);
        console.log(`📦 Backup created: ${backupPath}`);

        // Clean up old backups (keep only the 5 most recent)
        const dir = path.dirname(filePath);
        const files = await fs.readdir(dir);
        const backups = files
            .filter(f => f.startsWith(path.basename(filePath)) && f.includes('.backup.'))
            .sort()
            .reverse();

        if (backups.length > 5) {
            for (const oldBackup of backups.slice(5)) {
                try {
                    await fs.unlink(path.join(dir, oldBackup));
                    console.log(`🗑️ Cleaned up old backup: ${oldBackup}`);
                } catch (e) {
                    // Ignore cleanup errors
                }
            }
        }
    } catch (error) {
        if (error.code !== 'ENOENT') {
            // ENOENT means file doesn't exist, which is fine for new files
            console.warn(`⚠️ Backup creation failed: ${error.message}`);
        }
    }
}

/**
 * Validates and recovers corrupted data files
 * - Creates a backup of corrupted files
 * - Returns a default empty structure when recovery fails
 * - Logs all recovery actions for debugging
 * @param {string} filePath - Path to the data file
 * @param {object} defaultStructure - Default structure to return on failure
 * @returns {object} Parsed data or default structure
 */
async function validateAndRecoverDataFile(filePath, defaultStructure) {
    // Helper function to backup corrupted file
    const backupCorruptedFile = async () => {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const corruptedBackup = `${filePath}.corrupted.${timestamp}`;
            await fs.copyFile(filePath, corruptedBackup);
            console.log(`📦 Corrupted file backed up to: ${corruptedBackup}`);

            // Clean up old corrupted files (keep only 3 most recent)
            const dir = path.dirname(filePath);
            const files = await fs.readdir(dir);
            const corrupted = files
                .filter(f => f.startsWith(path.basename(filePath)) && f.includes('.corrupted.'))
                .sort()
                .reverse();

            if (corrupted.length > 3) {
                for (const oldFile of corrupted.slice(3)) {
                    try {
                        await fs.unlink(path.join(dir, oldFile));
                        console.log(`🗑️ Cleaned up old corrupted file: ${oldFile}`);
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                }
            }
        } catch (backupError) {
            console.warn(`⚠️ Failed to backup corrupted file: ${backupError.message}`);
        }
    };

    try {
        // Check if file exists
        await fs.access(filePath);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`📄 Data file not found, will use default structure: ${filePath}`);
            return defaultStructure;
        }
        console.error(`❌ Error accessing data file: ${error.message}`);
        return defaultStructure;
    }

    try {
        // Read file content
        const content = await fs.readFile(filePath, 'utf8');

        // Validate JSON structure
        let data;
        try {
            data = JSON.parse(content);
        } catch (parseError) {
            console.error(`❌ Invalid JSON in data file: ${filePath}`);
            await backupCorruptedFile();
            return defaultStructure;
        }

        // Minimal validation - only check if it's an object
        if (!data || typeof data !== 'object') {
            console.warn(`⚠️ Data is not a valid object, backing up and using default`);
            await backupCorruptedFile();
            return defaultStructure;
        }

        // Lenient validation: if default key is expected but missing, try to recover
        if (defaultStructure.default && !data.default) {
            // Check if data has the structure we need (watchHistory array)
            if (Array.isArray(data.watchHistory) || Array.isArray(data.history)) {
                // Data structure is close enough, wrap it in default structure
                console.log(`🔧 Recovering data with compatible structure`);
                return {
                    default: {
                        userId: 'default',
                        watchHistory: Array.isArray(data.watchHistory) ? data.watchHistory : (data.history || []),
                        lastPositions: data.lastPositions || {},
                        createdAt: data.createdAt || new Date().toISOString(),
                        updatedAt: data.updatedAt || new Date().toISOString()
                    }
                };
            }

            // Cannot recover, backup and return default
            console.warn(`⚠️ Missing default user data and cannot recover, backing up and using default`);
            await backupCorruptedFile();
            return defaultStructure;
        }

        // Validate default structure has required arrays
        if (data.default) {
            // Ensure watchHistory is an array
            if (!Array.isArray(data.default.watchHistory)) {
                console.warn(`⚠️ watchHistory is not an array, backing up and using default`);
                await backupCorruptedFile();
                return defaultStructure;
            }
            // Ensure lastPositions is an object
            if (!data.default.lastPositions || typeof data.default.lastPositions !== 'object') {
                console.warn(`⚠️ lastPositions is invalid, backing up and using default`);
                await backupCorruptedFile();
                return defaultStructure;
            }
        }

        console.log(`✅ Data file validated successfully: ${filePath}`);
        return data;
    } catch (error) {
        console.error(`❌ Data file validation failed: ${error.message}`);
        await backupCorruptedFile();
        return defaultStructure;
    }
}

/**
 * Migrates data from legacy location to new location
 * Called once during server startup if old data file exists
 */
async function migrateOldDataFile() {
    try {
        // Check if legacy file exists
        await fs.access(LEGACY_WATCH_HISTORY_FILE);

        // Check if new file already exists
        try {
            await fs.access(WATCH_HISTORY_FILE);
            console.log(`ℹ️ New data file already exists, skipping migration`);
            return;
        } catch (e) {
            // New file doesn't exist, proceed with migration
        }

        // Ensure config directory exists
        await ensureConfigDirectory();

        // Copy the file
        await fs.copyFile(LEGACY_WATCH_HISTORY_FILE, WATCH_HISTORY_FILE);
        console.log(`📦 Migrated watch history from legacy location:`);
        console.log(`   Old: ${LEGACY_WATCH_HISTORY_FILE}`);
        console.log(`   New: ${WATCH_HISTORY_FILE}`);

        // Create a backup of the old file before deleting
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const oldBackup = `${LEGACY_WATCH_HISTORY_FILE}.migrated.${timestamp}`;
        await fs.rename(LEGACY_WATCH_HISTORY_FILE, oldBackup);
        console.log(`📦 Old file backed up to: ${oldBackup}`);

    } catch (error) {
        if (error.code === 'ENOENT') {
            // No legacy file exists, no migration needed
            console.log(`ℹ️ No legacy data file found, no migration needed`);
        } else {
            console.error(`⚠️ Data migration failed: ${error.message}`);
        }
    }
}

// Default empty structure for watch history
const DEFAULT_WATCH_HISTORY = {
    default: {
        userId: 'default',
        watchHistory: [],
        lastPositions: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
};

// 观看历史记录管理
class WatchHistoryManager {
    /**
     * Loads watch history with automatic validation and recovery
     * Handles missing files, corrupted JSON, and invalid structures gracefully
     * Server will NEVER crash due to data file issues
     */
    static async loadHistory() {
        return await validateAndRecoverDataFile(WATCH_HISTORY_FILE, DEFAULT_WATCH_HISTORY);
    }

    /**
     * Saves watch history with automatic directory creation and backup
     * Ensures data is safely persisted with proper error handling
     * @param {object} historyData - The history data to save
     * @returns {boolean} Success status
     */
    static async saveHistory(historyData) {
        try {
            // Ensure directory exists before writing
            await ensureConfigDirectory();

            // Create backup before writing
            await createBackup(WATCH_HISTORY_FILE);

            // Update timestamp and write file
            historyData.updatedAt = new Date().toISOString();
            const jsonString = JSON.stringify(historyData, null, 2);
            console.log(`[DEBUG] saveHistory: Writing to ${WATCH_HISTORY_FILE}`);
            console.log(`[DEBUG] saveHistory: File size will be ${jsonString.length} bytes`);
            await fs.writeFile(WATCH_HISTORY_FILE, jsonString, 'utf8');
            console.log(`[DEBUG] saveHistory: File written successfully`);
            return true;
        } catch (error) {
            // Log error but don't throw - server should continue
            console.error('❌ 保存观看历史失败:', error.message);
            return false;
        }
    }

    static async addToWatchHistory(animeInfo, episodeInfo, position = 0) {
        const history = await this.loadHistory();
        const userHistory = history.default;

        // 验证必要参数
        if (!animeInfo || !animeInfo.id) {
            console.error('❌ Invalid animeInfo: missing animeId', animeInfo);
            throw new Error('Invalid animeInfo: animeId is required');
        }

        if (!episodeInfo) {
            console.error('❌ Invalid episodeInfo: missing episode info', episodeInfo);
            throw new Error('Invalid episodeInfo: episode info is required');
        }

        // 将 season 和 episode 转换为字符串以确保一致性
        const season = String(episodeInfo.season);
        const episode = String(episodeInfo.episode);

        // 添加到观看历史
        const watchRecord = {
            animeId: String(animeInfo.id),
            animeTitle: animeInfo.title || '未知动画',
            animeCover: animeInfo.cover || '',
            season: season,
            episode: episode,
            episodeTitle: episodeInfo.title || `第${episode}集`,
            position: position, // 播放位置（秒）
            duration: episodeInfo.duration || 0, // 总时长（秒）
            watchDate: new Date().toISOString(),
            completed: position > 0 && (position / (episodeInfo.duration || 1)) > 0.9 // 90%以上算看完
        };

        // 检查是否已存在相同的观看记录（使用字符串比较确保类型一致）
        const existingIndex = userHistory.watchHistory.findIndex(
            record => String(record.animeId) === String(animeInfo.id) &&
                     String(record.season) === season &&
                     String(record.episode) === episode
        );

        if (existingIndex >= 0) {
            // 更新现有记录
            console.log(`📝 Updating existing watch record: ${animeInfo.id} S${season}E${episode}`);
            userHistory.watchHistory[existingIndex] = watchRecord;
        } else {
            // 添加新记录
            console.log(`➕ Adding new watch record: ${animeInfo.id} S${season}E${episode}`);
            userHistory.watchHistory.unshift(watchRecord);

            // Log when history grows large (monitoring)
            const historyCount = userHistory.watchHistory.length;
            if (historyCount === 1000) {
                console.log(`📊 Watch history reached ${historyCount} entries`);
            } else if (historyCount > 0 && historyCount % 5000 === 0) {
                console.log(`📊 Watch history reached ${historyCount} entries`);
            }
        }

        // 保存播放位置（使用字符串键以确保一致性）
        const positionKey = `${animeInfo.id}_${season}_${episode}`;
        userHistory.lastPositions[positionKey] = {
            position: position,
            lastUpdated: new Date().toISOString()
        };
        console.log(`[DEBUG] Saving position for ${positionKey}: ${position}s`);

        // REMOVED: 100-record hard limit to prevent automatic data loss
        // History now grows indefinitely. Monitor size with the log below.

        const saved = await this.saveHistory(history);
        console.log(`[DEBUG] saveHistory returned:`, saved);
        return watchRecord;
    }

    static async getWatchHistory(limit = 20) {
        const history = await this.loadHistory();
        return history.default.watchHistory.slice(0, limit);
    }

    static async getLastPosition(animeId, season, episode) {
        const history = await this.loadHistory();

        // 将所有参数转换为字符串以确保一致性
        const positionKey = `${String(animeId)}_${String(season)}_${String(episode)}`;

        console.log(`[DEBUG] getLastPosition: ${positionKey}`);

        const positionData = history.default.lastPositions[positionKey];

        if (positionData) {
            console.log(`[DEBUG] Found position: ${positionData.position}s at ${positionData.lastUpdated}`);
            return positionData;
        } else {
            console.log(`[DEBUG] No position found for ${positionKey}, returning 0`);
            return { position: 0 };
        }
    }

    static async getContinueWatching() {
        const history = await this.loadHistory();
        const userHistory = history.default;

        // 返回完整的观看历史，包括已完成的内容
        const continueWatching = userHistory.watchHistory
            .sort((a, b) => new Date(b.watchDate) - new Date(a.watchDate))
            .slice(0, 12); // 最多显示12个

        return continueWatching;
    }
}


module.exports = { WatchHistoryManager, migrateOldDataFile, ensureConfigDirectory };
