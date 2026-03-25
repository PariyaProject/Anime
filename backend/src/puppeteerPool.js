// 尝试引入Puppeteer
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
        this.browser = null;
        this.isLaunching = false;
        this.launchPromise = null;
    }

    async getBrowser() {
        // 如果浏览器已经存在，直接返回
        if (this.browser) {
            return this.browser;
        }

        // 如果正在启动，等待启动完成
        if (this.isLaunching) {
            return this.launchPromise;
        }

        // 启动新浏览器
        this.isLaunching = true;
        this.launchPromise = this._launchBrowser();

        try {
            this.browser = await this.launchPromise;
            return this.browser;
        } finally {
            this.isLaunching = false;
            this.launchPromise = null;
        }
    }

    async _launchBrowser() {
        try {
            console.log('🚀 启动浏览器实例...');
            const browser = await puppeteer.launch({
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });

            // 监听浏览器关闭事件
            browser.on('disconnected', () => {
                console.log('🔌 浏览器已断开连接');
                this.browser = null;
            });

            console.log('✅ 浏览器实例已启动');
            return browser;
        } catch (error) {
            console.error('❌ 启动浏览器失败:', error.message);
            this.isLaunching = false;
            throw error;
        }
    }

    async close() {
        if (this.browser) {
            try {
                await this.browser.close();
                console.log('✅ 浏览器实例已关闭');
            } catch (error) {
                console.error('❌ 关闭浏览器失败:', error.message);
            }
            this.browser = null;
        }
    }
}

// 创建全局浏览器池
const browserPool = puppeteer ? new BrowserPool() : null;


module.exports = { browserPool, puppeteer };
