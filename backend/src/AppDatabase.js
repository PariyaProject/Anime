const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const CONFIG_DIR = path.join(__dirname, '..', '..', 'config');
const DATABASE_FILE = path.join(CONFIG_DIR, 'app-data.sqlite');

let databaseInstance = null;

function hasColumn(database, tableName, columnName) {
    const columns = database.prepare(`PRAGMA table_info(${tableName})`).all();
    return columns.some(column => column.name === columnName);
}

function ensureColumn(database, tableName, columnName, columnDefinition) {
    if (!hasColumn(database, tableName, columnName)) {
        database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`);
    }
}

function createSchema(database) {
    database.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL COLLATE NOCASE UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token_hash TEXT NOT NULL UNIQUE,
            user_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            last_seen_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            user_agent TEXT DEFAULT '',
            last_ip TEXT DEFAULT '',
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS watch_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            anime_id TEXT NOT NULL,
            anime_title TEXT NOT NULL DEFAULT '',
            anime_cover TEXT NOT NULL DEFAULT '',
            season INTEGER NOT NULL,
            episode INTEGER NOT NULL,
            episode_title TEXT NOT NULL DEFAULT '',
            position_seconds REAL NOT NULL DEFAULT 0,
            duration_seconds REAL NOT NULL DEFAULT 0,
            completed INTEGER NOT NULL DEFAULT 0,
            watch_date TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            source_device_id TEXT DEFAULT '',
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE (user_id, anime_id, season, episode)
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_watch_progress_user_watch_date
            ON watch_progress(user_id, watch_date DESC);
        CREATE INDEX IF NOT EXISTS idx_watch_progress_lookup
            ON watch_progress(user_id, anime_id, season, episode);

        CREATE TABLE IF NOT EXISTS invite_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL UNIQUE,
            created_by INTEGER NOT NULL,
            note TEXT NOT NULL DEFAULT '',
            expires_at TEXT,
            created_at TEXT NOT NULL,
            revoked_at TEXT,
            used_at TEXT,
            used_by INTEGER,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            updated_by INTEGER,
            FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS login_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            attempted_username TEXT NOT NULL DEFAULT '',
            success INTEGER NOT NULL DEFAULT 0,
            reason TEXT NOT NULL DEFAULT '',
            ip_address TEXT NOT NULL DEFAULT '',
            user_agent TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_invite_codes_created_by ON invite_codes(created_by);
        CREATE INDEX IF NOT EXISTS idx_invite_codes_used_by ON invite_codes(used_by);
        CREATE INDEX IF NOT EXISTS idx_login_events_user_id ON login_events(user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_login_events_attempted_username
            ON login_events(attempted_username, created_at DESC);
    `);

    ensureColumn(database, 'users', 'is_admin', 'is_admin INTEGER NOT NULL DEFAULT 0');
    ensureColumn(database, 'users', 'invited_by', 'invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL');
    ensureColumn(database, 'users', 'invite_accepted_at', 'invite_accepted_at TEXT');
    ensureColumn(database, 'users', 'last_login_at', 'last_login_at TEXT');
    ensureColumn(database, 'users', 'disabled_at', 'disabled_at TEXT');
    ensureColumn(database, 'users', 'disabled_reason', "disabled_reason TEXT NOT NULL DEFAULT ''");
    ensureColumn(database, 'users', 'disabled_by', 'disabled_by INTEGER REFERENCES users(id) ON DELETE SET NULL');
}

function ensureConfigDirectory() {
    try {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
        return true;
    } catch (error) {
        console.error(`⚠️ Failed to create config directory: ${error.message}`);
        return false;
    }
}

function getDatabase() {
    if (databaseInstance) {
        return databaseInstance;
    }

    ensureConfigDirectory();

    const database = new Database(DATABASE_FILE);
    database.pragma('journal_mode = WAL');
    database.pragma('foreign_keys = ON');
    database.pragma('busy_timeout = 5000');
    createSchema(database);

    databaseInstance = database;
    return databaseInstance;
}

function initializeDatabase() {
    return getDatabase();
}

function closeDatabase() {
    if (!databaseInstance) {
        return;
    }

    databaseInstance.close();
    databaseInstance = null;
}

module.exports = {
    DATABASE_FILE,
    closeDatabase,
    ensureConfigDirectory,
    getDatabase,
    initializeDatabase
};
