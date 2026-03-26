const express = require('express');
const {
    AuthManager,
    clearSessionCookie,
    getClientIp,
    requireAuth,
    setSessionCookie
} = require('../AuthManager');
const { AdminManager } = require('../AdminManager');

const router = express.Router();

router.post('/api/auth/register', (_req, res) => {
    res.status(403).json({
        success: false,
        error: '站点当前仅支持管理员邀请注册'
    });
});

router.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body || {};
        const { user, sessionToken, expiresAt } = await AuthManager.login(username, password, {
            userAgent: req.headers['user-agent'] || '',
            ip: getClientIp(req)
        });

        setSessionCookie(req, res, sessionToken, expiresAt);

        res.json({
            success: true,
            data: user,
            message: '登录成功'
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            error: error.message || '登录失败'
        });
    }
});

router.get('/api/auth/invite/:code', (req, res) => {
    try {
        const invite = AdminManager.validateInvite(req.params.code);
        res.json({
            success: true,
            data: {
                invite,
                site: AdminManager.getPublicBootstrap()
            }
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            error: error.message || '邀请码不可用'
        });
    }
});

router.post('/api/auth/accept-invite', async (req, res) => {
    try {
        const { inviteCode, username, password } = req.body || {};
        const { user, sessionToken, expiresAt } = await AuthManager.acceptInvite(inviteCode, username, password, {
            userAgent: req.headers['user-agent'] || '',
            ip: getClientIp(req)
        });

        setSessionCookie(req, res, sessionToken, expiresAt);

        res.status(201).json({
            success: true,
            data: user,
            message: '账号已创建'
        });
    } catch (error) {
        const message = error.message || '接受邀请失败';
        const statusCode = message.includes('已') || message.includes('不存在') ? 400 : 422;
        res.status(statusCode).json({
            success: false,
            error: message
        });
    }
});

router.post('/api/auth/logout', (req, res) => {
    AuthManager.invalidateSession(req.sessionToken);
    clearSessionCookie(req, res);

    res.json({
        success: true,
        data: null,
        message: '已退出登录'
    });
});

router.get('/api/auth/me', (req, res) => {
    res.json({
        success: true,
        data: req.authUser || null
    });
});

router.post('/api/auth/change-password', requireAuth, async (req, res) => {
    try {
        const { currentPassword, nextPassword } = req.body || {};

        await AuthManager.changePassword(
            req.authUser.id,
            currentPassword,
            nextPassword,
            req.sessionToken
        );

        res.json({
            success: true,
            data: true,
            message: '密码已更新'
        });
    } catch (error) {
        const message = error.message || '修改密码失败';
        const statusCode = message.includes('不存在') ? 404 : 400;
        res.status(statusCode).json({
            success: false,
            error: message
        });
    }
});

module.exports = router;
