const crypto = require('crypto');
const { getDatabase } = require('./AppDatabase');
const { AdminManager } = require('./AdminManager');

const SESSION_COOKIE_NAME = 'anime_session';
const SESSION_TTL_MS = 400 * 24 * 60 * 60 * 1000;
const SESSION_REFRESH_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;
const USERNAME_PATTERN = /^[\p{L}\p{N}_-]{3,24}$/u;

function nowIso() {
    return new Date().toISOString();
}

function buildPasswordHash(password, salt) {
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, 64, (error, derivedKey) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(derivedKey.toString('hex'));
        });
    });
}

function createSessionToken() {
    return crypto.randomBytes(32).toString('base64url');
}

function hashSessionToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function normalizeUsername(username) {
    return typeof username === 'string' ? username.trim() : '';
}

function validateUsername(username) {
    if (!username) {
        throw new Error('用户名不能为空');
    }

    if (!USERNAME_PATTERN.test(username)) {
        throw new Error('用户名需为 3-24 位，可包含字母、数字、下划线和短横线');
    }
}

function validatePassword(password) {
    if (typeof password !== 'string' || password.length < 8) {
        throw new Error('密码至少需要 8 位');
    }

    if (password.length > 128) {
        throw new Error('密码过长');
    }
}

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
        return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || '';
}

function parseCookies(cookieHeader = '') {
    if (!cookieHeader) {
        return {};
    }

    return cookieHeader
        .split(';')
        .map(part => part.trim())
        .filter(Boolean)
        .reduce((cookies, part) => {
            const separatorIndex = part.indexOf('=');
            if (separatorIndex < 0) {
                return cookies;
            }

            const key = part.slice(0, separatorIndex);
            const value = part.slice(separatorIndex + 1);
            cookies[key] = decodeURIComponent(value);
            return cookies;
        }, {});
}

function serializeCookie(name, value, options = {}) {
    const segments = [`${name}=${encodeURIComponent(value)}`];

    if (options.maxAge !== undefined) {
        segments.push(`Max-Age=${options.maxAge}`);
    }
    if (options.expires) {
        segments.push(`Expires=${new Date(options.expires).toUTCString()}`);
    }

    segments.push(`Path=${options.path || '/'}`);

    if (options.httpOnly !== false) {
        segments.push('HttpOnly');
    }
    if (options.sameSite) {
        segments.push(`SameSite=${options.sameSite}`);
    }
    if (options.secure) {
        segments.push('Secure');
    }

    return segments.join('; ');
}

function shouldUseSecureCookies(req) {
    if (process.env.AUTH_COOKIE_INSECURE === '1') {
        return false;
    }

    const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '')
        .split(',')[0]
        .trim()
        .toLowerCase();

    return Boolean(req?.secure || forwardedProto === 'https');
}

async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await buildPasswordHash(password, salt);
    return `${salt}:${hashedPassword}`;
}

async function verifyPassword(password, storedHash) {
    const [salt, expectedHash] = String(storedHash).split(':');
    if (!salt || !expectedHash) {
        return false;
    }

    const actualHash = await buildPasswordHash(password, salt);
    return crypto.timingSafeEqual(
        Buffer.from(actualHash, 'hex'),
        Buffer.from(expectedHash, 'hex')
    );
}

function mapUserRow(row) {
    if (!row) {
        return null;
    }

    return {
        id: String(row.id),
        username: row.username,
        isAdmin: Boolean(row.is_admin),
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at || null,
        disabledAt: row.disabled_at || null,
        disabledReason: row.disabled_reason || '',
        invitedBy: row.invited_by ? String(row.invited_by) : null,
        inviteAcceptedAt: row.invite_accepted_at || null
    };
}

function recordLoginEvent({ userId = null, attemptedUsername = '', success = false, reason = '', ip = '', userAgent = '' }) {
    const database = getDatabase();
    database.prepare(`
        INSERT INTO login_events (
            user_id,
            attempted_username,
            success,
            reason,
            ip_address,
            user_agent,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
        userId ? Number(userId) : null,
        normalizeUsername(attemptedUsername),
        success ? 1 : 0,
        String(reason || ''),
        ip || '',
        userAgent || '',
        nowIso()
    );
}

class AuthManager {
    static async createUser({
        username,
        password,
        isAdmin = false,
        invitedBy = null,
        inviteAcceptedAt = null
    }) {
        const database = getDatabase();
        const normalizedUsername = normalizeUsername(username);

        validateUsername(normalizedUsername);
        validatePassword(password);

        const existingUser = database
            .prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE')
            .get(normalizedUsername);

        if (existingUser) {
            throw new Error('用户名已存在');
        }

        const passwordHash = await hashPassword(password);
        const createdAt = nowIso();

        const result = database.prepare(`
            INSERT INTO users (
                username,
                password_hash,
                is_admin,
                invited_by,
                invite_accepted_at,
                last_login_at,
                disabled_at,
                disabled_reason,
                disabled_by,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            normalizedUsername,
            passwordHash,
            isAdmin ? 1 : 0,
            invitedBy ? Number(invitedBy) : null,
            inviteAcceptedAt || null,
            null,
            null,
            '',
            null,
            createdAt,
            createdAt
        );

        const user = database
            .prepare(`
                SELECT
                    id,
                    username,
                    is_admin,
                    invited_by,
                    invite_accepted_at,
                    last_login_at,
                    disabled_at,
                    disabled_reason,
                    created_at
                FROM users
                WHERE id = ?
            `)
            .get(result.lastInsertRowid);

        return mapUserRow(user);
    }

    static async acceptInvite(inviteCode, username, password, metadata = {}) {
        const database = getDatabase();
        const invite = AdminManager.validateInvite(inviteCode);
        const user = await this.createUser({
            username,
            password,
            isAdmin: false,
            invitedBy: invite.createdBy.id,
            inviteAcceptedAt: nowIso()
        });

        AdminManager.consumeInvite(invite.code, user.id);

        const session = this.createSession(user.id, metadata);
        const loggedInAt = nowIso();
        database.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?')
            .run(loggedInAt, loggedInAt, Number(user.id));
        recordLoginEvent({
            userId: user.id,
            attemptedUsername: user.username,
            success: true,
            reason: 'invite_accept_success',
            ip: metadata.ip,
            userAgent: metadata.userAgent
        });

        return {
            user: {
                ...user,
                lastLoginAt: loggedInAt
            },
            sessionToken: session.token,
            expiresAt: session.expiresAt
        };
    }

    static async login(username, password, metadata = {}) {
        const database = getDatabase();
        const normalizedUsername = normalizeUsername(username);

        try {
            validateUsername(normalizedUsername);
            validatePassword(password);

            const userRow = database
                .prepare(`
                    SELECT
                        id,
                        username,
                        password_hash,
                        is_admin,
                        invited_by,
                        invite_accepted_at,
                        last_login_at,
                        disabled_at,
                        disabled_reason,
                        created_at
                    FROM users
                    WHERE username = ? COLLATE NOCASE
                `)
                .get(normalizedUsername);

            if (!userRow) {
                throw new Error('用户名或密码错误');
            }

            if (userRow.disabled_at) {
                throw new Error('该账号已被管理员禁用');
            }

            const passwordMatches = await verifyPassword(password, userRow.password_hash);
            if (!passwordMatches) {
                throw new Error('用户名或密码错误');
            }

            const session = this.createSession(userRow.id, metadata);
            const loggedInAt = nowIso();
            database.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?')
                .run(loggedInAt, loggedInAt, userRow.id);

            recordLoginEvent({
                userId: userRow.id,
                attemptedUsername: normalizedUsername,
                success: true,
                reason: 'login_success',
                ip: metadata.ip,
                userAgent: metadata.userAgent
            });

            return {
                user: mapUserRow({
                    ...userRow,
                    last_login_at: loggedInAt
                }),
                sessionToken: session.token,
                expiresAt: session.expiresAt
            };
        } catch (error) {
            const matchedUser = database
                .prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE')
                .get(normalizedUsername);

            recordLoginEvent({
                userId: matchedUser?.id || null,
                attemptedUsername: normalizedUsername,
                success: false,
                reason: error.message || 'login_failed',
                ip: metadata.ip,
                userAgent: metadata.userAgent
            });

            throw error;
        }
    }

    static createSession(userId, metadata = {}) {
        const database = getDatabase();
        const token = createSessionToken();
        const tokenHash = hashSessionToken(token);
        const createdAt = nowIso();
        const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

        database.prepare(`
            INSERT INTO sessions (
                token_hash,
                user_id,
                created_at,
                last_seen_at,
                expires_at,
                user_agent,
                last_ip
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            tokenHash,
            Number(userId),
            createdAt,
            createdAt,
            expiresAt,
            metadata.userAgent || '',
            metadata.ip || ''
        );

        return { token, expiresAt };
    }

    static getUserBySessionToken(token) {
        if (!token) {
            return null;
        }

        const database = getDatabase();
        const tokenHash = hashSessionToken(token);
        const row = database.prepare(`
            SELECT
                sessions.id AS session_id,
                sessions.expires_at,
                users.id AS user_id,
                users.username,
                users.is_admin,
                users.invited_by,
                users.invite_accepted_at,
                users.last_login_at,
                users.disabled_at,
                users.disabled_reason,
                users.created_at
            FROM sessions
            INNER JOIN users ON users.id = sessions.user_id
            WHERE sessions.token_hash = ?
        `).get(tokenHash);

        if (!row) {
            return null;
        }

        if (row.disabled_at) {
            database.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.user_id);
            return null;
        }

        if (new Date(row.expires_at).getTime() <= Date.now()) {
            database.prepare('DELETE FROM sessions WHERE id = ?').run(row.session_id);
            return null;
        }

        const now = Date.now();
        const currentExpiry = new Date(row.expires_at).getTime();
        const shouldRefresh = currentExpiry - now <= SESSION_REFRESH_THRESHOLD_MS;
        let refreshedExpiresAt = row.expires_at;

        if (shouldRefresh) {
            refreshedExpiresAt = new Date(now + SESSION_TTL_MS).toISOString();
            database.prepare(`
                UPDATE sessions
                SET last_seen_at = ?, expires_at = ?
                WHERE id = ?
            `).run(nowIso(), refreshedExpiresAt, row.session_id);
        } else {
            database.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?').run(nowIso(), row.session_id);
        }

        return {
            sessionId: row.session_id,
            refreshedExpiresAt,
            shouldRefreshCookie: shouldRefresh,
            user: mapUserRow({
                id: row.user_id,
                username: row.username,
                is_admin: row.is_admin,
                invited_by: row.invited_by,
                invite_accepted_at: row.invite_accepted_at,
                last_login_at: row.last_login_at,
                disabled_at: row.disabled_at,
                disabled_reason: row.disabled_reason,
                created_at: row.created_at
            })
        };
    }

    static invalidateSession(token) {
        if (!token) {
            return;
        }

        const database = getDatabase();
        database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashSessionToken(token));
    }

    static clearExpiredSessions() {
        const database = getDatabase();
        database.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(nowIso());
    }

    static async ensureSuperAdminFromEnv() {
        const username = process.env.SUPERADMIN_USERNAME;
        const password = process.env.SUPERADMIN_PASSWORD;

        if (!username || !password) {
            return null;
        }

        validateUsername(normalizeUsername(username));
        validatePassword(password);

        const database = getDatabase();
        const existingUser = database
            .prepare('SELECT id, username, is_admin FROM users WHERE username = ? COLLATE NOCASE')
            .get(normalizeUsername(username));

        const passwordHash = await hashPassword(password);
        const updatedAt = nowIso();

        if (!existingUser) {
            return this.createUser({
                username,
                password,
                isAdmin: true
            });
        }

        database.prepare(`
            UPDATE users
            SET
                password_hash = ?,
                is_admin = 1,
                disabled_at = NULL,
                disabled_reason = '',
                disabled_by = NULL,
                updated_at = ?
            WHERE id = ?
        `).run(passwordHash, updatedAt, existingUser.id);

        const refreshed = database
            .prepare(`
                SELECT
                    id,
                    username,
                    is_admin,
                    invited_by,
                    invite_accepted_at,
                    last_login_at,
                    disabled_at,
                    disabled_reason,
                    created_at
                FROM users
                WHERE id = ?
            `)
            .get(existingUser.id);

        return mapUserRow(refreshed);
    }
}

function setSessionCookie(req, res, token, expiresAt) {
    res.setHeader('Set-Cookie', serializeCookie(SESSION_COOKIE_NAME, token, {
        expires: expiresAt,
        maxAge: Math.floor(SESSION_TTL_MS / 1000),
        httpOnly: true,
        path: '/',
        sameSite: 'Lax',
        secure: shouldUseSecureCookies(req)
    }));
}

function clearSessionCookie(req, res) {
    res.setHeader('Set-Cookie', serializeCookie(SESSION_COOKIE_NAME, '', {
        expires: new Date(0).toISOString(),
        maxAge: 0,
        httpOnly: true,
        path: '/',
        sameSite: 'Lax',
        secure: shouldUseSecureCookies(req)
    }));
}

function attachAuthUser(req, res, next) {
    try {
        const cookies = parseCookies(req.headers.cookie || '');
        const token = cookies[SESSION_COOKIE_NAME];
        const authSession = AuthManager.getUserBySessionToken(token);

        req.sessionToken = token || null;
        req.authUser = authSession?.user || null;

        if (token && authSession?.shouldRefreshCookie) {
            setSessionCookie(req, res, token, authSession.refreshedExpiresAt);
        }

        next();
    } catch (error) {
        console.error('⚠️ Failed to load auth session:', error.message);
        req.sessionToken = null;
        req.authUser = null;
        next();
    }
}

function requireAuth(req, res, next) {
    if (!req.authUser) {
        res.status(401).json({
            success: false,
            error: '请先登录'
        });
        return;
    }

    next();
}

function requireAdmin(req, res, next) {
    if (!req.authUser) {
        res.status(401).json({
            success: false,
            error: '请先登录'
        });
        return;
    }

    if (!req.authUser.isAdmin) {
        res.status(403).json({
            success: false,
            error: '需要管理员权限'
        });
        return;
    }

    next();
}

module.exports = {
    AuthManager,
    SESSION_COOKIE_NAME,
    attachAuthUser,
    clearSessionCookie,
    getClientIp,
    requireAdmin,
    requireAuth,
    setSessionCookie
};
