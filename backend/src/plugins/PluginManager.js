const fs = require('fs');
const path = require('path');
const { httpClient } = require('../httpClient');
const { browserPool } = require('../puppeteerPool');

class PluginManager {
    constructor() {
        this.plugins = new Map();
        this.defaultSourceId = 'cycani'; // Fallback
        
        // This will store user configurations for plugins
        // In a real implementation, this should be persisted to config/plugin-settings.json
        this.userConfigs = {};
    }

    async initialize() {
        console.log('🔌 初始化插件系统...');
        this.loadUserConfigs();
        await this.scanAndLoadPlugins();
    }

    loadUserConfigs() {
        const configPath = path.join(__dirname, '../../../config/plugin-settings.json');
        try {
            if (fs.existsSync(configPath)) {
                this.userConfigs = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
        } catch (error) {
            console.error('❌ 加载插件用户配置失败:', error.message);
            this.userConfigs = {};
        }
    }

    saveUserConfigs() {
        const configDir = path.join(__dirname, '../../../config');
        const configPath = path.join(configDir, 'plugin-settings.json');
        try {
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            fs.writeFileSync(configPath, JSON.stringify(this.userConfigs, null, 2));
        } catch (error) {
            console.error('❌ 保存插件用户配置失败:', error.message);
        }
    }

    async scanAndLoadPlugins() {
        const sourcesDir = path.join(__dirname, 'sources');
        if (!fs.existsSync(sourcesDir)) {
            fs.mkdirSync(sourcesDir, { recursive: true });
            return;
        }

        const sourceFolders = fs.readdirSync(sourcesDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const folder of sourceFolders) {
            try {
                const pluginPath = path.join(sourcesDir, folder, 'index.js');
                if (fs.existsSync(pluginPath)) {
                    const PluginClass = require(pluginPath);
                    const pluginId = folder;
                    
                    // Create context for the plugin
                    const context = {
                        httpClient: httpClient,
                        browserPool: browserPool,
                        config: this.userConfigs[pluginId] || {}
                    };

                    const instance = new PluginClass(context);
                    
                    if (instance.manifest && instance.manifest.id) {
                        this.plugins.set(instance.manifest.id, instance);
                        console.log(`✅ 已加载插件: ${instance.manifest.name} (${instance.manifest.id})`);
                    } else {
                        console.warn(`⚠️ 插件 ${folder} 缺少合法的 manifest`);
                    }
                }
            } catch (error) {
                console.error(`❌ 加载插件 ${folder} 失败:`, error.message);
            }
        }
    }

    getPlugin(sourceId) {
        const id = sourceId || this.defaultSourceId;
        const plugin = this.plugins.get(id);
        if (!plugin) {
            throw new Error(`Plugin not found: ${id}`);
        }
        return plugin;
    }

    listPlugins() {
        return Array.from(this.plugins.values()).map(p => p.manifest);
    }

    getDefaultSourceId() {
        return this.defaultSourceId;
    }

    getAllProxyDomains() {
        const domains = [];
        for (const plugin of this.plugins.values()) {
            if (plugin.manifest.network && plugin.manifest.network.proxyDomains) {
                domains.push(...plugin.manifest.network.proxyDomains);
            }
        }
        return [...new Set(domains)]; // unique
    }
}

// Export a singleton instance
const pluginManager = new PluginManager();
module.exports = { pluginManager, PluginManager };
