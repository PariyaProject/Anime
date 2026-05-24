const express = require('express');
const router = express.Router();
const { requireAuth } = require('../AuthManager');
const { pluginManager } = require('../plugins/PluginManager');

router.get('/api/plugins', requireAuth, (req, res) => {
    try {
        const plugins = pluginManager.listPlugins();
        res.json({
            success: true,
            data: {
                activePlugin: pluginManager.getDefaultSourceId(),
                plugins
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/api/plugins/:id/config-schema', requireAuth, (req, res) => {
    try {
        const plugin = pluginManager.getPlugin(req.params.id);
        res.json({
            success: true,
            data: plugin.manifest.userConfig || []
        });
    } catch (error) {
        res.status(404).json({ success: false, error: error.message });
    }
});

router.put('/api/plugins/active', requireAuth, (req, res) => {
    try {
        const { sourceId } = req.body;
        if (!sourceId) {
            return res.status(400).json({ success: false, error: 'Missing sourceId' });
        }
        // In this phase we just return success. Persistence of active source
        // will be implemented in the frontend's local storage or a user profile.
        res.json({ success: true, message: 'Active plugin set locally' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
