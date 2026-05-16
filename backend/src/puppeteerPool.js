// 尝试引入Puppeteer
const { getPuppeteerLaunchArgs } = require('./upstreamProxy');

let puppeteer;
try {
    puppeteer = require('puppeteer');
    console.log('✅ Puppeteer已加载');
} catch (e) {
    console.log('⚠️ Puppeteer未安装，使用备用方案');
    console.log('安装方法: npm install puppeteer');
}

// 浏览器实例池管理
class BrowserPool {
    constructor() {
        this.browsers = new Map();
        this.launchStates = new Map();
    }

    getKey(useProxy = false) {
        return useProxy ? 'proxy' : 'direct';
    }

    async getBrowser(options = {}) {
        const { useProxy = false } = options;
        const key = this.getKey(useProxy);

        // 如果浏览器已经存在，直接返回
        if (this.browsers.has(key)) {
            return this.browsers.get(key);
        }

        // 如果正在启动，等待启动完成
        const launchingState = this.launchStates.get(key);
        if (launchingState?.isLaunching) {
            return launchingState.launchPromise;
        }

        // 启动新浏览器
        const launchPromise = this._launchBrowser({ useProxy });
        this.launchStates.set(key, {
            isLaunching: true,
            launchPromise
        });

        try {
            const browser = await launchPromise;
            this.browsers.set(key, browser);
            return browser;
        } finally {
            this.launchStates.set(key, {
                isLaunching: false,
                launchPromise: null
            });
        }
    }

    async _launchBrowser(options = {}) {
        const { useProxy = false } = options;
        const key = this.getKey(useProxy);

        try {
            console.log(`🚀 启动浏览器实例 (${key})...`);
            const launchArgs = [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                ...getPuppeteerLaunchArgs(useProxy)
            ];
            const browser = await puppeteer.launch({
                headless: "new",
                args: launchArgs
            });

            // 监听浏览器关闭事件
            browser.on('disconnected', () => {
                console.log(`🔌 浏览器已断开连接 (${key})`);
                this.browsers.delete(key);
            });

            console.log(`✅ 浏览器实例已启动 (${key})`);
            return browser;
        } catch (error) {
            console.error('❌ 启动浏览器失败:', error.message);
            throw error;
        }
    }

    async close() {
        for (const [key, browser] of this.browsers.entries()) {
            try {
                await browser.close();
                console.log(`✅ 浏览器实例已关闭 (${key})`);
            } catch (error) {
                console.error('❌ 关闭浏览器失败:', error.message);
            }
        }
        this.browsers.clear();
    }
}

// 创建全局浏览器池
const browserPool = puppeteer ? new BrowserPool() : null;


module.exports = { browserPool, puppeteer };
