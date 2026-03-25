const express = require('express');
const fs = require('fs').promises;
const { requireAdmin, AuthManager } = require('../AuthManager');
const { AdminManager } = require('../AdminManager');

const router = express.Router();

router.use('/api/admin', requireAdmin);

router.get('/api/public/bootstrap', (_req, res) => {
    res.json({
        success: true,
        data: AdminManager.getPublicBootstrap()
    });
});

router.get('/api/admin/overview', (_req, res) => {
    res.json({
        success: true,
        data: {
            settings: AdminManager.getSettings(),
            invites: AdminManager.listInvites(),
            runtime: AdminManager.getRuntimeInfo()
        }
    });
});

router.get('/api/admin/settings', (_req, res) => {
    res.json({
        success: true,
        data: AdminManager.getSettings()
    });
});

router.put('/api/admin/settings', (req, res) => {
    const settings = AdminManager.updateSettings(req.body || {}, req.authUser.id);

    res.json({
        success: true,
        data: settings,
        message: '站点设置已更新'
    });
});

router.get('/api/admin/invites', (_req, res) => {
    res.json({
        success: true,
        data: AdminManager.listInvites()
    });
});

router.post('/api/admin/invites', (req, res) => {
    const { note = '', expiresInDays = 30 } = req.body || {};
    const invite = AdminManager.createInvite(req.authUser.id, { note, expiresInDays });

    res.status(201).json({
        success: true,
        data: invite,
        message: '邀请码已创建'
    });
});

router.post('/api/admin/invites/:inviteId/revoke', (req, res) => {
    AdminManager.revokeInvite(req.params.inviteId);

    res.json({
        success: true,
        data: true,
        message: '邀请码已撤销'
    });
});

router.get('/api/admin/backup/database', async (_req, res) => {
    try {
        const backup = await AdminManager.createDatabaseBackup();

        res.download(backup.filePath, backup.fileName, async error => {
            try {
                await fs.unlink(backup.filePath);
            } catch (_cleanupError) {
                // Ignore cleanup failures for temporary backup files.
            }

            if (error && !res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: '数据库备份下载失败'
                });
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || '数据库备份失败'
        });
    }
});

router.post(
    '/api/admin/restore/database',
    express.raw({ type: 'application/octet-stream', limit: '512mb' }),
    async (req, res) => {
        try {
            const result = await AdminManager.importDatabaseBackup(
                req.body,
                req.headers['x-backup-filename']
            );

            AdminManager.ensureDefaultSettings();
            await AuthManager.ensureSuperAdminFromEnv();

            res.json({
                success: true,
                data: result,
                message: '数据库备份已导入'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message || '数据库导入失败'
            });
        }
    }
);

router.get('/api/admin/users', (req, res) => {
    res.json({
        success: true,
        data: AdminManager.listUsers({
            page: req.query.page,
            pageSize: req.query.pageSize,
            keyword: req.query.keyword,
            role: req.query.role,
            status: req.query.status
        })
    });
});

router.get('/api/admin/users/:userId', (req, res) => {
    try {
        res.json({
            success: true,
            data: AdminManager.getUserDetails(req.params.userId, {
                loginPage: req.query.loginPage,
                loginPageSize: req.query.loginPageSize,
                watchPage: req.query.watchPage,
                watchPageSize: req.query.watchPageSize
            })
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            error: error.message || '用户不存在'
        });
    }
});

router.patch('/api/admin/users/:userId/access', (req, res) => {
    try {
        const user = AdminManager.updateUserAccess(
            req.params.userId,
            req.body || {},
            req.authUser.id
        );

        res.json({
            success: true,
            data: user,
            message: user.disabledAt ? '账号已禁用' : '账号已恢复'
        });
    } catch (error) {
        const statusCode = error.message?.includes('不存在') ? 404 : 400;
        res.status(statusCode).json({
            success: false,
            error: error.message || '更新账号状态失败'
        });
    }
});

router.patch('/api/admin/users/:userId/role', (req, res) => {
    try {
        const user = AdminManager.updateUserRole(
            req.params.userId,
            req.body || {},
            req.authUser.id
        );

        res.json({
            success: true,
            data: user,
            message: user.isAdmin ? '已提升为管理员' : '已降级为普通用户'
        });
    } catch (error) {
        const statusCode = error.message?.includes('不存在') ? 404 : 400;
        res.status(statusCode).json({
            success: false,
            error: error.message || '更新账号角色失败'
        });
    }
});

module.exports = router;
