const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const { getDatabase, DATABASE_FILE, closeDatabase } = require('./AppDatabase');

const DEFAULT_SETTINGS = {
    siteName: 'ANIME',
    loginTitle: 'ANIME',
    loginSubtitle: '仅受邀用户可访问，请使用管理员发放的邀请码创建账号。',
    inviteWelcomeTitle: '创建受邀账号',
    inviteWelcomeMessage: '这是一份由管理员签发的访问邀请。设置你的用户名和密码后即可进入站点。',
    supportContact: '',
    allowInvites: '1'
};

const LEGACY_DEFAULT_SETTINGS = {
    siteName: 'Anime Private Theater',
    loginTitle: '私人放映室'
};

function nowIso() {
    return new Date().toISOString();
}

function settingKeyToValue(key, rawValue) {
    if (key === 'allowInvites') {
        return rawValue === '1' || rawValue === 1 || rawValue === true || rawValue === 'true';
    }
    return rawValue || '';
}

function serializeSettingValue(key, value) {
    if (key === 'allowInvites') {
        return value ? '1' : '0';
    }
    return String(value ?? '');
}

function normalizePage(value, fallback = 1) {
    const parsed = Number.parseInt(String(value || ''), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizePageSize(value, fallback = 20, max = 100) {
    const parsed = Number.parseInt(String(value || ''), 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return fallback;
    }
    return Math.min(parsed, max);
}

function buildPaginationMeta(total, page, pageSize) {
    return {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
    };
}

class AdminManager {
    static ensureDefaultSettings() {
        const database = getDatabase();
        const insertStatement = database.prepare(`
            INSERT INTO app_settings (key, value, updated_at, updated_by)
            VALUES (?, ?, ?, NULL)
            ON CONFLICT(key) DO NOTHING
        `);

        Object.entries(DEFAULT_SETTINGS).forEach(([key, value]) => {
            insertStatement.run(key, value, nowIso());
        });

        Object.entries(LEGACY_DEFAULT_SETTINGS).forEach(([key, legacyValue]) => {
            database.prepare(`
                UPDATE app_settings
                SET value = ?, updated_at = ?
                WHERE key = ? AND value = ?
            `).run(DEFAULT_SETTINGS[key], nowIso(), key, legacyValue);
        });
    }

    static getSettings() {
        this.ensureDefaultSettings();
        const database = getDatabase();
        const rows = database.prepare('SELECT key, value FROM app_settings').all();
        const result = {};

        for (const row of rows) {
            result[row.key] = settingKeyToValue(row.key, row.value);
        }

        return {
            ...DEFAULT_SETTINGS,
            ...result
        };
    }

    static getPublicBootstrap() {
        const settings = this.getSettings();
        return {
            siteName: settings.siteName,
            loginTitle: settings.loginTitle,
            loginSubtitle: settings.loginSubtitle,
            inviteWelcomeTitle: settings.inviteWelcomeTitle,
            inviteWelcomeMessage: settings.inviteWelcomeMessage,
            supportContact: settings.supportContact,
            authMode: 'invite-only',
            allowInvites: Boolean(settings.allowInvites)
        };
    }

    static updateSettings(updates, updatedBy) {
        const database = getDatabase();
        const now = nowIso();
        const statement = database.prepare(`
            INSERT INTO app_settings (key, value, updated_at, updated_by)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at,
                updated_by = excluded.updated_by
        `);

        Object.entries(updates).forEach(([key, value]) => {
            if (!(key in DEFAULT_SETTINGS)) {
                return;
            }
            statement.run(key, serializeSettingValue(key, value), now, Number(updatedBy));
        });

        return this.getSettings();
    }

    static createInvite(createdBy, { note = '', expiresInDays = 30 } = {}) {
        const database = getDatabase();
        const code = crypto.randomBytes(18).toString('base64url');
        const createdAt = nowIso();
        const expiresAt = expiresInDays > 0
            ? new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000).toISOString()
            : null;

        database.prepare(`
            INSERT INTO invite_codes (code, created_by, note, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(code, Number(createdBy), String(note || ''), expiresAt, createdAt);

        return this.getInviteByCode(code);
    }

    static listInvites() {
        const database = getDatabase();
        const rows = database.prepare(`
            SELECT
                invite_codes.*,
                creators.username AS created_by_username,
                used_by_user.username AS used_by_username
            FROM invite_codes
            INNER JOIN users AS creators ON creators.id = invite_codes.created_by
            LEFT JOIN users AS used_by_user ON used_by_user.id = invite_codes.used_by
            ORDER BY datetime(invite_codes.created_at) DESC
        `).all();

        return rows.map(row => this.mapInviteRow(row));
    }

    static mapInviteRow(row) {
        if (!row) {
            return null;
        }

        const isExpired = row.expires_at ? new Date(row.expires_at).getTime() <= Date.now() : false;
        const isUsed = Boolean(row.used_at);
        const isRevoked = Boolean(row.revoked_at);

        return {
            id: String(row.id),
            code: row.code,
            note: row.note || '',
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            revokedAt: row.revoked_at,
            usedAt: row.used_at,
            createdBy: {
                id: String(row.created_by),
                username: row.created_by_username || ''
            },
            usedBy: row.used_by ? {
                id: String(row.used_by),
                username: row.used_by_username || ''
            } : null,
            status: isRevoked ? 'revoked' : (isUsed ? 'used' : (isExpired ? 'expired' : 'active'))
        };
    }

    static getInviteByCode(code) {
        const database = getDatabase();
        const row = database.prepare(`
            SELECT
                invite_codes.*,
                creators.username AS created_by_username,
                used_by_user.username AS used_by_username
            FROM invite_codes
            INNER JOIN users AS creators ON creators.id = invite_codes.created_by
            LEFT JOIN users AS used_by_user ON used_by_user.id = invite_codes.used_by
            WHERE invite_codes.code = ?
        `).get(code);

        return this.mapInviteRow(row);
    }

    static validateInvite(code) {
        const invite = this.getInviteByCode(code);
        if (!invite) {
            throw new Error('邀请码不存在');
        }

        if (invite.status === 'revoked') {
            throw new Error('邀请码已撤销');
        }

        if (invite.status === 'used') {
            throw new Error('邀请码已被使用');
        }

        if (invite.status === 'expired') {
            throw new Error('邀请码已过期');
        }

        const settings = this.getSettings();
        if (!settings.allowInvites) {
            throw new Error('当前已暂停邀请注册');
        }

        return invite;
    }

    static consumeInvite(code, usedBy) {
        const database = getDatabase();
        database.prepare(`
            UPDATE invite_codes
            SET used_at = ?, used_by = ?
            WHERE code = ?
        `).run(nowIso(), Number(usedBy), code);
    }

    static revokeInvite(id) {
        const database = getDatabase();
        database.prepare(`
            UPDATE invite_codes
            SET revoked_at = ?
            WHERE id = ? AND revoked_at IS NULL AND used_at IS NULL
        `).run(nowIso(), Number(id));
        return true;
    }

    static getRuntimeInfo() {
        const database = getDatabase();
        const adminUser = database
            .prepare('SELECT id FROM users WHERE is_admin = 1 LIMIT 1')
            .get();
        const envConfigured = Boolean(process.env.SUPERADMIN_USERNAME && process.env.SUPERADMIN_PASSWORD);

        return {
            databaseFile: DATABASE_FILE,
            authMode: 'invite-only',
            sessionDays: 400,
            allowInvites: this.getSettings().allowInvites,
            superAdminConfigured: envConfigured || Boolean(adminUser),
            ports: {
                backend: process.env.BACKEND_PORT || process.env.PORT || '3006',
                frontend: process.env.FRONTEND_PORT || '3000'
            }
        };
    }

    static async createDatabaseBackup() {
        const database = getDatabase();
        const backupDir = path.join(path.dirname(DATABASE_FILE), 'backups');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `anime-backup-${timestamp}.sqlite`;
        const filePath = path.join(backupDir, fileName);

        await fs.mkdir(backupDir, { recursive: true });
        await database.backup(filePath);

        return {
            fileName,
            filePath
        };
    }

    static async importDatabaseBackup(fileBuffer, originalFileName = 'uploaded-backup.sqlite') {
        if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
            throw new Error('备份文件为空，无法导入');
        }

        let safeOriginalFileName = String(originalFileName || 'uploaded-backup.sqlite');
        try {
            safeOriginalFileName = decodeURIComponent(safeOriginalFileName);
        } catch (_error) {
            safeOriginalFileName = String(originalFileName || 'uploaded-backup.sqlite');
        }

        const database = getDatabase();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const workingDir = path.join(path.dirname(DATABASE_FILE), 'imports');
        const uploadPath = path.join(workingDir, `upload-${timestamp}.sqlite`);
        const previousPath = path.join(workingDir, `pre-import-${timestamp}.sqlite`);
        const walPath = `${DATABASE_FILE}-wal`;
        const shmPath = `${DATABASE_FILE}-shm`;

        await fs.mkdir(workingDir, { recursive: true });
        await fs.writeFile(uploadPath, fileBuffer);

        let validationDatabase = null;

        try {
            validationDatabase = new Database(uploadPath, { readonly: true, fileMustExist: true });
            const integrity = validationDatabase.pragma('integrity_check', { simple: true });
            if (String(integrity).toLowerCase() !== 'ok') {
                throw new Error('导入文件校验失败，SQLite 数据损坏');
            }

            const tables = validationDatabase.prepare(`
                SELECT name
                FROM sqlite_master
                WHERE type = 'table'
            `).all().map(row => String(row.name));
            const requiredTables = ['users', 'sessions', 'watch_progress'];
            const missingTables = requiredTables.filter(name => !tables.includes(name));

            if (missingTables.length > 0) {
                throw new Error(`导入文件不是有效的 ANIME 数据库，缺少表: ${missingTables.join(', ')}`);
            }
        } finally {
            if (validationDatabase) {
                validationDatabase.close();
            }
        }

        await database.backup(previousPath);
        closeDatabase();

        try {
            await fs.copyFile(uploadPath, DATABASE_FILE);
            await fs.rm(walPath, { force: true });
            await fs.rm(shmPath, { force: true });
        } catch (error) {
            try {
                await fs.copyFile(previousPath, DATABASE_FILE);
                await fs.rm(walPath, { force: true });
                await fs.rm(shmPath, { force: true });
            } catch (_restoreError) {
                // Ignore restore cleanup failure and surface original error below.
            }
            throw error;
        } finally {
            await fs.rm(uploadPath, { force: true });
        }

        getDatabase();

        return {
            restoredAt: nowIso(),
            importedFileName: path.basename(safeOriginalFileName),
            preImportBackupFileName: path.basename(previousPath),
            requiresReload: true
        };
    }

    static mapManagedUserRow(row) {
        if (!row) {
            return null;
        }

        const envSuperAdminUsername = String(process.env.SUPERADMIN_USERNAME || '').trim().toLowerCase();
        const isEnvSuperAdmin = Boolean(
            envSuperAdminUsername &&
            String(row.username || '').trim().toLowerCase() === envSuperAdminUsername
        );

        return {
            id: String(row.id),
            username: row.username,
            isAdmin: Boolean(row.is_admin),
            isEnvSuperAdmin,
            createdAt: row.created_at,
            lastLoginAt: row.last_login_at || row.last_login_event_at || null,
            disabledAt: row.disabled_at || null,
            disabledReason: row.disabled_reason || '',
            invitedBy: row.invited_by ? {
                id: String(row.invited_by),
                username: row.invited_by_username || ''
            } : null,
            inviteAcceptedAt: row.invite_accepted_at || null,
            activeSessionCount: Number(row.active_session_count || 0),
            watchProgressCount: Number(row.watch_progress_count || 0),
            lastWatchedAt: row.last_watched_at || null,
            status: row.disabled_at ? 'disabled' : 'active'
        };
    }

    static listUsers({ page = 1, pageSize = 20, keyword = '', role = 'all', status = 'all' } = {}) {
        const database = getDatabase();
        const normalizedPage = normalizePage(page);
        const normalizedPageSize = normalizePageSize(pageSize, 20, 100);
        const normalizedKeyword = String(keyword || '').trim();
        const normalizedRole = ['all', 'admin', 'user'].includes(String(role)) ? String(role) : 'all';
        const normalizedStatus = ['all', 'active', 'disabled'].includes(String(status)) ? String(status) : 'all';
        const conditions = [];
        const queryArgs = [];

        if (normalizedKeyword) {
            conditions.push('users.username LIKE ? COLLATE NOCASE');
            queryArgs.push(`%${normalizedKeyword}%`);
        }

        if (normalizedRole === 'admin') {
            conditions.push('users.is_admin = 1');
        } else if (normalizedRole === 'user') {
            conditions.push('users.is_admin = 0');
        }

        if (normalizedStatus === 'active') {
            conditions.push('users.disabled_at IS NULL');
        } else if (normalizedStatus === 'disabled') {
            conditions.push('users.disabled_at IS NOT NULL');
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const overallStats = database.prepare(`
            SELECT
                COUNT(*) AS overall_total,
                SUM(CASE WHEN is_admin = 1 THEN 1 ELSE 0 END) AS admin_total,
                SUM(CASE WHEN is_admin = 0 THEN 1 ELSE 0 END) AS user_total,
                SUM(CASE WHEN disabled_at IS NOT NULL THEN 1 ELSE 0 END) AS disabled_total
            FROM users
        `).get();

        const totalRow = database.prepare(`
            SELECT COUNT(*) AS count
            FROM users
            ${whereClause}
        `).get(...queryArgs);

        const rows = database.prepare(`
            SELECT
                users.id,
                users.username,
                users.is_admin,
                users.created_at,
                users.last_login_at,
                users.disabled_at,
                users.disabled_reason,
                users.invited_by,
                users.invite_accepted_at,
                inviters.username AS invited_by_username,
                (
                    SELECT COUNT(*)
                    FROM sessions
                    WHERE sessions.user_id = users.id
                      AND datetime(sessions.expires_at) > datetime('now')
                ) AS active_session_count,
                (
                    SELECT COUNT(*)
                    FROM watch_progress
                    WHERE watch_progress.user_id = users.id
                ) AS watch_progress_count,
                (
                    SELECT MAX(watch_date)
                    FROM watch_progress
                    WHERE watch_progress.user_id = users.id
                ) AS last_watched_at,
                (
                    SELECT MAX(created_at)
                    FROM login_events
                    WHERE login_events.user_id = users.id
                      AND login_events.success = 1
                ) AS last_login_event_at
            FROM users
            LEFT JOIN users AS inviters ON inviters.id = users.invited_by
            ${whereClause}
            ORDER BY users.is_admin DESC, datetime(COALESCE(users.last_login_at, users.created_at)) DESC
            LIMIT ? OFFSET ?
        `).all(
            ...queryArgs,
            normalizedPageSize,
            (normalizedPage - 1) * normalizedPageSize
        );

        return {
            items: rows.map(row => this.mapManagedUserRow(row)),
            pagination: {
                ...buildPaginationMeta(totalRow?.count || 0, normalizedPage, normalizedPageSize),
                overallTotal: overallStats?.overall_total || 0,
                adminTotal: overallStats?.admin_total || 0,
                userTotal: overallStats?.user_total || 0,
                disabledTotal: overallStats?.disabled_total || 0
            }
        };
    }

    static getUserDetails(userId, options = {}) {
        const database = getDatabase();
        const loginPage = normalizePage(options.loginPage);
        const loginPageSize = normalizePageSize(options.loginPageSize, 10, 50);
        const watchPage = normalizePage(options.watchPage);
        const watchPageSize = normalizePageSize(options.watchPageSize, 10, 50);
        const userRow = database.prepare(`
            SELECT
                users.id,
                users.username,
                users.is_admin,
                users.created_at,
                users.last_login_at,
                users.disabled_at,
                users.disabled_reason,
                users.invited_by,
                users.invite_accepted_at,
                inviters.username AS invited_by_username,
                (
                    SELECT COUNT(*)
                    FROM sessions
                    WHERE sessions.user_id = users.id
                      AND datetime(sessions.expires_at) > datetime('now')
                ) AS active_session_count,
                (
                    SELECT COUNT(*)
                    FROM watch_progress
                    WHERE watch_progress.user_id = users.id
                ) AS watch_progress_count,
                (
                    SELECT MAX(watch_date)
                    FROM watch_progress
                    WHERE watch_progress.user_id = users.id
                ) AS last_watched_at,
                (
                    SELECT MAX(created_at)
                    FROM login_events
                    WHERE login_events.user_id = users.id
                      AND login_events.success = 1
                ) AS last_login_event_at
            FROM users
            LEFT JOIN users AS inviters ON inviters.id = users.invited_by
            WHERE users.id = ?
        `).get(Number(userId));

        if (!userRow) {
            throw new Error('用户不存在');
        }

        const sessions = database.prepare(`
            SELECT id, created_at, last_seen_at, expires_at, user_agent, last_ip
            FROM sessions
            WHERE user_id = ?
              AND datetime(expires_at) > datetime('now')
            ORDER BY datetime(last_seen_at) DESC
            LIMIT 20
        `).all(Number(userId)).map(row => ({
            id: String(row.id),
            createdAt: row.created_at,
            lastSeenAt: row.last_seen_at,
            expiresAt: row.expires_at,
            userAgent: row.user_agent || '',
            ipAddress: row.last_ip || ''
        }));

        const loginEventsTotal = database.prepare(`
            SELECT COUNT(*) AS count
            FROM login_events
            WHERE user_id = ?
        `).get(Number(userId));

        const loginEvents = database.prepare(`
            SELECT id, attempted_username, success, reason, ip_address, user_agent, created_at
            FROM login_events
            WHERE user_id = ?
            ORDER BY datetime(created_at) DESC
            LIMIT ? OFFSET ?
        `).all(
            Number(userId),
            loginPageSize,
            (loginPage - 1) * loginPageSize
        ).map(row => ({
            id: String(row.id),
            attemptedUsername: row.attempted_username,
            success: Boolean(row.success),
            reason: row.reason || '',
            ipAddress: row.ip_address || '',
            userAgent: row.user_agent || '',
            createdAt: row.created_at
        }));

        const watchProgressTotal = database.prepare(`
            SELECT COUNT(*) AS count
            FROM watch_progress
            WHERE user_id = ?
        `).get(Number(userId));

        const watchProgress = database.prepare(`
            SELECT
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
            FROM watch_progress
            WHERE user_id = ?
            ORDER BY datetime(watch_date) DESC
            LIMIT ? OFFSET ?
        `).all(
            Number(userId),
            watchPageSize,
            (watchPage - 1) * watchPageSize
        ).map(row => ({
            animeId: String(row.anime_id),
            animeTitle: row.anime_title || '未知动画',
            animeCover: row.anime_cover || '',
            season: Number(row.season),
            episode: Number(row.episode),
            episodeTitle: row.episode_title || `第${row.episode}集`,
            position: Number(row.position_seconds || 0),
            duration: Number(row.duration_seconds || 0),
            completed: Boolean(row.completed),
            watchDate: row.watch_date,
            updatedAt: row.updated_at,
            sourceDeviceId: row.source_device_id || ''
        }));

        return {
            user: this.mapManagedUserRow(userRow),
            activeSessions: sessions,
            loginEvents,
            watchProgress,
            loginPagination: buildPaginationMeta(loginEventsTotal?.count || 0, loginPage, loginPageSize),
            watchPagination: buildPaginationMeta(watchProgressTotal?.count || 0, watchPage, watchPageSize)
        };
    }

    static updateUserAccess(userId, { disabled, disabledReason = '' } = {}, actedBy) {
        const database = getDatabase();
        const targetUser = database.prepare(`
            SELECT id, username, is_admin, disabled_at
            FROM users
            WHERE id = ?
        `).get(Number(userId));

        if (!targetUser) {
            throw new Error('用户不存在');
        }

        if (Number(targetUser.id) === Number(actedBy)) {
            throw new Error('不能修改当前登录管理员自己的可用状态');
        }

        if (Boolean(targetUser.is_admin) && disabled) {
            throw new Error('管理员账号不可被禁用');
        }

        if (disabled) {
            database.prepare(`
                UPDATE users
                SET disabled_at = ?, disabled_reason = ?, disabled_by = ?, updated_at = ?
                WHERE id = ?
            `).run(nowIso(), String(disabledReason || ''), Number(actedBy), nowIso(), Number(userId));

            database.prepare('DELETE FROM sessions WHERE user_id = ?').run(Number(userId));
        } else {
            database.prepare(`
                UPDATE users
                SET disabled_at = NULL, disabled_reason = '', disabled_by = NULL, updated_at = ?
                WHERE id = ?
            `).run(nowIso(), Number(userId));
        }

        return this.getUserDetails(userId).user;
    }

    static updateUserRole(userId, { isAdmin } = {}, actedBy) {
        const database = getDatabase();
        const targetUser = database.prepare(`
            SELECT id, username, is_admin
            FROM users
            WHERE id = ?
        `).get(Number(userId));

        if (!targetUser) {
            throw new Error('用户不存在');
        }

        const nextIsAdmin = Boolean(isAdmin);
        const envSuperAdminUsername = String(process.env.SUPERADMIN_USERNAME || '').trim().toLowerCase();
        const isEnvSuperAdmin = Boolean(
            envSuperAdminUsername &&
            String(targetUser.username || '').trim().toLowerCase() === envSuperAdminUsername
        );

        if (Boolean(targetUser.is_admin) === nextIsAdmin) {
            return this.getUserDetails(userId).user;
        }

        if (Number(targetUser.id) === Number(actedBy) && !nextIsAdmin) {
            throw new Error('不能降级当前登录管理员自己的权限');
        }

        if (!nextIsAdmin && isEnvSuperAdmin) {
            throw new Error('环境变量超级管理员不可降级');
        }

        if (!nextIsAdmin && Boolean(targetUser.is_admin)) {
            const adminCountRow = database.prepare(`
                SELECT COUNT(*) AS count
                FROM users
                WHERE is_admin = 1
            `).get();

            if ((adminCountRow?.count || 0) <= 1) {
                throw new Error('系统至少需要保留一个管理员账号');
            }
        }

        database.prepare(`
            UPDATE users
            SET is_admin = ?, updated_at = ?
            WHERE id = ?
        `).run(nextIsAdmin ? 1 : 0, nowIso(), Number(userId));

        return this.getUserDetails(userId).user;
    }
}

module.exports = { AdminManager };
