const { httpClient, getEnhancedHeaders } = require('./httpClient');
const { browserPool } = require('./puppeteerPool');
const { getPuppeteerProxySettings } = require('./upstreamProxy');

class UpstreamAccessError extends Error {
    constructor(message, options = {}) {
        super(message);
        this.name = 'UpstreamAccessError';
        this.code = options.code || 'UPSTREAM_ACCESS_ERROR';
        this.statusCode = options.statusCode || 502;
        this.upstreamStatus = options.upstreamStatus || null;
        this.url = options.url || null;
    }
}

async function applyBrowserNetworkProfile(page, url, refererUrl = '', useProxy = false) {
    const headers = getEnhancedHeaders(url);
    await page.setUserAgent(headers['User-Agent']);

    const extraHeaders = {
        'Accept-Language': headers['Accept-Language']
    };

    if (refererUrl) {
        extraHeaders.Referer = refererUrl;
    }

    await page.setExtraHTTPHeaders(extraHeaders);

    const proxy = useProxy ? getPuppeteerProxySettings() : null;
    if (proxy?.auth && (proxy.auth.username || proxy.auth.password)) {
        await page.authenticate(proxy.auth);
    }
}

function analyzeUpstreamHtml({ url, status, body }) {
    const html = typeof body === 'string' ? body : '';
    const normalized = html.toLowerCase();

    if (
        normalized.includes('aegis_challenge_object')
        || normalized.includes('window.axcfg')
        || normalized.includes('verification is in progress')
        || normalized.includes('验证正在进行中')
    ) {
        return {
            type: 'challenge',
            message: '上游站点要求浏览器验证，纯 HTTP 抓取暂时无法直接通过'
        };
    }

    if (
        html.includes('不提供服务')
        && html.includes('法律法规')
    ) {
        return {
            type: 'region_blocked',
            message: '上游站点按当前出口网络/IP 拒绝访问，请为后端配置可访问该站点的代理'
        };
    }

    if (status === 403) {
        return {
            type: 'forbidden',
            message: '上游站点返回 403，通常意味着当前出口网络、请求来源或请求头未通过校验'
        };
    }

    return {
        type: 'ok',
        message: ''
    };
}

function buildUpstreamError(url, status, body) {
    const analysis = analyzeUpstreamHtml({ url, status, body });

    if (analysis.type === 'challenge') {
        return new UpstreamAccessError(
            `${analysis.message}。如果浏览器兜底也失败，请为后端配置代理后重试。`,
            {
                code: 'UPSTREAM_CHALLENGE_REQUIRED',
                statusCode: 502,
                upstreamStatus: status,
                url
            }
        );
    }

    if (analysis.type === 'region_blocked') {
        return new UpstreamAccessError(
            `${analysis.message}。建议配置 UPSTREAM_PROXY_URL，并让该代理能够访问 ${new URL(url).hostname}。`,
            {
                code: 'UPSTREAM_REGION_BLOCKED',
                statusCode: 502,
                upstreamStatus: status,
                url
            }
        );
    }

    if (analysis.type === 'forbidden') {
        return new UpstreamAccessError(
            `${analysis.message}。如果宿主机浏览器可以访问，而后端不行，通常需要为后端单独配置代理。`,
            {
                code: 'UPSTREAM_FORBIDDEN',
                statusCode: 502,
                upstreamStatus: status,
                url
            }
        );
    }

    return new UpstreamAccessError(
        `上游站点请求失败 (${status || 'unknown'})`,
        {
            code: 'UPSTREAM_REQUEST_FAILED',
            statusCode: 502,
            upstreamStatus: status,
            url
        }
    );
}

async function fetchUpstreamHtmlWithBrowser(url, options = {}) {
    const {
        timeout = 15000,
        refererUrl = '',
        useProxy = true
    } = options;

    if (!browserPool) {
        throw new UpstreamAccessError('当前环境未启用 Puppeteer，无法执行浏览器兜底抓取', {
            code: 'UPSTREAM_BROWSER_UNAVAILABLE',
            statusCode: 502,
            url
        });
    }

    let page = null;
    try {
        const browser = await browserPool.getBrowser({ useProxy });
        page = await browser.newPage();
        await applyBrowserNetworkProfile(page, url, refererUrl, useProxy);

        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout
        });

        const settleDeadline = Date.now() + Math.min(Math.max(timeout, 8000), 20000);
        let html = await page.content();

        while (Date.now() < settleDeadline) {
            const analysis = analyzeUpstreamHtml({
                url: page.url(),
                status: 200,
                body: html
            });

            if (analysis.type !== 'challenge') {
                return html;
            }

            await page.waitForNetworkIdle({
                idleTime: 800,
                timeout: 2000
            }).catch(() => {});
            await new Promise((resolve) => setTimeout(resolve, 1200));
            html = await page.content();
        }

        throw buildUpstreamError(page.url(), 403, html);
    } finally {
        if (page) {
            await page.close().catch(() => {});
        }
    }
}

async function fetchUpstreamHtml(url, options = {}) {
    const {
        timeout = 15000,
        headers = {},
        allowBrowserFallback = true,
        refererUrl = '',
        skipRetry = false,
        useProxy = true
    } = options;

    let response;
    try {
        response = await httpClient.get(url, {
            timeout,
            headers,
            responseType: 'text',
            validateStatus: () => true,
            skipRetry,
            useUpstreamProxy: useProxy
        });
    } catch (error) {
        throw new UpstreamAccessError(
            `连接上游站点失败: ${error.message}`,
            {
                code: 'UPSTREAM_NETWORK_ERROR',
                statusCode: 502,
                url
            }
        );
    }

    const analysis = analyzeUpstreamHtml({
        url,
        status: response.status,
        body: response.data
    });

    if (response.status >= 200 && response.status < 300 && analysis.type === 'ok') {
        return response.data;
    }

    if (analysis.type === 'challenge' && allowBrowserFallback) {
        console.log(`🧩 ${url} 命中浏览器验证，切换 Puppeteer 兜底抓取`);
        return fetchUpstreamHtmlWithBrowser(url, {
            timeout: Math.max(timeout, 15000),
            refererUrl,
            useProxy
        });
    }

    throw buildUpstreamError(url, response.status, response.data);
}

module.exports = {
    UpstreamAccessError,
    analyzeUpstreamHtml,
    applyBrowserNetworkProfile,
    fetchUpstreamHtml
};
