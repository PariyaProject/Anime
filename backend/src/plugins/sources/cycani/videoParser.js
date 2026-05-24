const cheerio = require('cheerio');
const CryptoJS = require('crypto-js');
const { fetchUpstreamHtml, applyBrowserNetworkProfile } = require('../../../upstreamAccess');

const PLAYER_DECRYPTION_SALT = 'YLwJVbXw77pk2eOrAnFdBo2c3mWkLtodMni2wk81GCnP94ZltW';

function decryptVideoUrl(encryptedUrl) {
    try {
        if (!encryptedUrl) return null;
        const base64Decoded = Buffer.from(encryptedUrl, 'base64').toString('utf8');
        return decodeURIComponent(base64Decoded);
    } catch (error) {
        console.error('视频URL解密失败:', error.message);
        return encryptedUrl;
    }
}

function extractPlayerConfigUrl(html) {
    if (!html) return null;
    const urlMatch = html.match(/"url"\s*:\s*"([^"]+)"/);
    return urlMatch?.[1] || null;
}

function decryptPlayerConfigUrl($, html) {
    try {
        const encryptedUrl = extractPlayerConfigUrl(html);
        if (!encryptedUrl) return null;

        const viewportMetaId = $('meta[name="viewport"]').attr('id') || '';
        const charsetMetaId = $('meta[charset="UTF-8"]').attr('id') || $('meta[charset]').attr('id') || '';
        const viewportSeed = viewportMetaId.replace(/^now_/, '');
        const charsetSeed = charsetMetaId.replace(/^now_/, '');

        if (!viewportSeed || !charsetSeed || viewportSeed.length !== charsetSeed.length) {
            return null;
        }

        const orderedSeed = charsetSeed
            .split('')
            .map((digit, index) => ({ id: Number.parseInt(digit, 10), text: viewportSeed[index] || '' }))
            .filter((entry) => Number.isFinite(entry.id) && entry.text)
            .sort((left, right) => left.id - right.id)
            .map((entry) => entry.text)
            .join('');

        if (!orderedSeed) return null;

        const md5 = CryptoJS.MD5(`${orderedSeed}${PLAYER_DECRYPTION_SALT}`).toString();
        const key = CryptoJS.enc.Utf8.parse(md5.slice(16));
        const iv = CryptoJS.enc.Utf8.parse(md5.slice(0, 16));
        const decrypted = CryptoJS.AES.decrypt(encryptedUrl, key, {
            iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7
        }).toString(CryptoJS.enc.Utf8);

        return decrypted && decrypted.startsWith('http') ? decrypted : null;
    } catch (error) {
        console.warn('⚠️ config.url 解密失败:', error.message);
        return null;
    }
}

async function parseWithAxios(playerUrl, refererUrl) {
    try {
        const origin = new URL(refererUrl).origin;
        const html = await fetchUpstreamHtml(playerUrl, {
            timeout: 10000,
            allowBrowserFallback: false,
            useProxy: true,
            headers: { Referer: refererUrl, Origin: origin }
        });

        const $ = cheerio.load(html);
        const decryptedConfigUrl = decryptPlayerConfigUrl($, html);
        if (decryptedConfigUrl) return decryptedConfigUrl;

        const videoElements = $('video');
        if (videoElements.length > 0) {
            const videoSrc = videoElements.first().attr('src') || videoElements.first().attr('data-src') || videoElements.first().attr('current-src');
            if (videoSrc) return videoSrc;
        }

        const urlMatches = html.match(/https:\/\/[^"\s]+\.(?:mp4|m3u8|webm|flv)[^"\s]*/gi);
        if (urlMatches && urlMatches.length > 0) {
            const videoSrc = urlMatches.find(url => url.includes('byteimg.com') || url.includes('tos-cn') || url.includes('video') || url.includes('media'));
            if (videoSrc) return videoSrc;
        }

        let foundVideoSrc = null;
        $('[src]').each((_, element) => {
            const src = $(element).attr('src');
            if (src && (src.includes('video') || src.includes('media') || src.includes('tos-cn') || src.includes('byteimg.com'))) {
                foundVideoSrc = src;
                return false;
            }
        });

        if (foundVideoSrc) return foundVideoSrc;
        return null;
    } catch (error) {
        return null;
    }
}

async function getVideoUrlFromPuppeteer(playerUrl, refererUrl, browserPool) {
    if (!browserPool) return null;
    let page = null;
    try {
        const browser = await browserPool.getBrowser({ useProxy: true });
        page = await browser.newPage();
        await applyBrowserNetworkProfile(page, refererUrl, refererUrl, true);
        await page.goto(refererUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        await page.waitForFunction(() => {
            const iframes = Array.from(document.querySelectorAll('iframe'));
            return iframes.some(iframe => iframe.src && iframe.src.includes('player.cycanime.com'));
        }, { timeout: 5000 });

        const targetFrame = page.frames().find(f => f.url().includes('player.cycanime.com'));
        if (!targetFrame) return null;

        await targetFrame.waitForSelector('video[src]', { timeout: 10000 });
        const videoUrl = await targetFrame.evaluate(() => {
            const video = document.querySelector('video');
            return video ? video.currentSrc : null;
        });

        if (page) await page.close();
        return videoUrl;
    } catch (error) {
        if (page) {
            try { await page.close(); } catch (e) {}
        }
        return null;
    }
}

async function resolveVideoUrl(videoId, refererUrl, browserPool) {
    const playerUrl = `https://player.cycanime.com/?url=${videoId}`;
    const urlFromAxios = await parseWithAxios(playerUrl, refererUrl);
    if (urlFromAxios) return urlFromAxios;

    if (browserPool) {
        const urlFromPuppeteer = await getVideoUrlFromPuppeteer(playerUrl, refererUrl, browserPool);
        if (urlFromPuppeteer) return urlFromPuppeteer;
    }
    return null;
}

module.exports = {
    decryptVideoUrl,
    resolveVideoUrl
};
