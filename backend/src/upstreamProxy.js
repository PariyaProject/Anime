
// This will be populated later dynamically from plugins, but keep a fallback
let dynamicProxyHostSuffixes = ['cycanime.com', 'cycani.org', 'player.cycanime.com'];

function setDynamicProxyHosts(hosts) {
    if (hosts && hosts.length > 0) {
        dynamicProxyHostSuffixes = hosts;
    }
}

function parseCommaSeparatedEnv(name) {
    return String(process.env[name] || '')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
}

function isLoopbackHost(hostname) {
    return hostname === 'localhost'
        || hostname === '127.0.0.1'
        || hostname === '::1'
        || hostname === '[::1]';
}

function isPrivateIpv4Host(hostname) {
    return /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)
        || /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)
        || /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname);
}

function normalizeHostPattern(pattern) {
    if (!pattern) {
        return '';
    }

    const normalized = pattern.trim().toLowerCase();
    return normalized.startsWith('*.') ? normalized.slice(2) : normalized;
}

function shouldUseProxyForHostname(hostname) {
    if (!hostname) {
        return false;
    }

    if (isLoopbackHost(hostname) || isPrivateIpv4Host(hostname)) {
        return false;
    }

    const configuredPatterns = parseCommaSeparatedEnv('UPSTREAM_PROXY_HOSTS')
        .map(normalizeHostPattern);
    const hostPatterns = configuredPatterns.length > 0
        ? configuredPatterns
        : dynamicProxyHostSuffixes;

    return hostPatterns.some((pattern) => (
        pattern === '*'
        || hostname === pattern
        || hostname.endsWith(`.${pattern}`)
    ));
}

function getProxyUrl() {
    return String(
        process.env.UPSTREAM_PROXY_URL
        || process.env.CYCANI_PROXY_URL
        || ''
    ).trim();
}

function parseProxyUrl(rawProxyUrl) {
    if (!rawProxyUrl) {
        return null;
    }

    const parsed = new URL(rawProxyUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('UPSTREAM_PROXY_URL 目前仅支持 http:// 或 https:// 代理');
    }

    const auth = parsed.username || parsed.password
        ? {
            username: decodeURIComponent(parsed.username),
            password: decodeURIComponent(parsed.password)
        }
        : undefined;

    return {
        protocol: parsed.protocol.slice(0, -1),
        host: parsed.hostname,
        port: parsed.port
            ? Number.parseInt(parsed.port, 10)
            : parsed.protocol === 'https:' ? 443 : 80,
        auth,
        server: `${parsed.protocol}//${parsed.host}`
    };
}

function getAxiosProxyConfig(targetUrl) {
    const rawProxyUrl = getProxyUrl();
    if (!rawProxyUrl) {
        return {
            enabled: false,
            config: false,
            label: null
        };
    }

    let hostname = '';
    try {
        hostname = new URL(targetUrl).hostname.toLowerCase();
    } catch (_error) {
        return {
            enabled: false,
            config: false,
            label: null
        };
    }

    if (!shouldUseProxyForHostname(hostname)) {
        return {
            enabled: false,
            config: false,
            label: null
        };
    }

    const proxy = parseProxyUrl(rawProxyUrl);
    return {
        enabled: true,
        config: {
            protocol: proxy.protocol,
            host: proxy.host,
            port: proxy.port,
            auth: proxy.auth
        },
        label: proxy.server
    };
}

function getPuppeteerProxySettings() {
    const rawProxyUrl = String(
        process.env.PUPPETEER_PROXY_URL
        || getProxyUrl()
    ).trim();

    if (!rawProxyUrl) {
        return null;
    }

    return parseProxyUrl(rawProxyUrl);
}

function getPuppeteerLaunchArgs(useProxy = false) {
    if (!useProxy) {
        return [];
    }

    const proxy = getPuppeteerProxySettings();
    if (!proxy) {
        return [];
    }

    return [`--proxy-server=${proxy.server}`];
}

module.exports = {
    shouldUseProxyForHostname,
    getAxiosProxyConfig,
    getPuppeteerLaunchArgs,
    getPuppeteerProxySettings,
    setDynamicProxyHosts
};
