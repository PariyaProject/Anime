# Design: Fix Player Video URL Extraction

## Architecture Overview

### Current Flow (Broken)
```
/api/episode/:id/:season/:episode
  ↓
Fetch watch page HTML
  ↓
Extract player_aaaa variable
  ↓
parsePlayerPage() → Puppeteer
  ↓
Launch headless Chrome
  ↓
Navigate to player.cycanime.com
  ↓
Intercept network requests for byteimg.com
  ↓
Return video URL (often fails)
```

### Proposed Flow
```
/api/episode/:id/:season/:episode
  ↓
Fetch watch page HTML
  ↓
Extract iframe src or player_aaaa variable
  ↓
Fetch player page HTML directly
  ↓
Parse config object from <script> tags
  ↓
Decrypt config.url using AES with config.vkey
  ↓
Return decrypted video URL
```

## AES Decryption Implementation

### Key Derivation
From analyzing the obfuscated `setting.js`:

```javascript
// 1. Get video ID from URL parameter
const videoId = getUrlParameter('url'); // e.g., "cycani-dcd01-39aaa93004d357631fea86e2bc8442431756347877"

// 2. Derive key from MD5 hash
const fullHash = CryptoJS.MD5(videoId + 'cfg').toString();
const key = CryptoJS.enc.Hex.parse(fullHash.substring(0, 32));  // First 16 bytes
const iv = CryptoJS.enc.Hex.parse(fullHash.substring(32));        // Last 16 bytes

// 3. Decrypt the URL
const decrypted = CryptoJS.AES.decrypt(
    encryptedUrl,  // config.url (Base64 encoded)
    key,
    {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    }
);

// 4. Convert to UTF-8 string
const videoUrl = decrypted.toString(CryptoJS.enc.Utf8);
```

## Error Handling Strategy

1. **Config Missing**: Return player URL for frontend to handle
2. **Decryption Failure**: Try fallback methods (MuiPlayer config, direct URL search)
3. **Invalid URL**: Return error with clear message
4. **Network Error**: Use exponential backoff (existing retry logic)

## Code Structure

### New Function: `decryptPlayerUrl(configUrl, configVkey, videoId)`
```javascript
function decryptPlayerUrl(configUrl, configVkey, videoId) {
    const CryptoJS = require('crypto-js');

    // Derive key and IV from video ID
    const fullHash = CryptoJS.MD5(videoId + 'cfg').toString();
    const key = CryptoJS.enc.Hex.parse(fullHash.substring(0, 32));
    const iv = CryptoJS.enc.Hex.parse(fullHash.substring(32));

    // Decrypt
    const decrypted = CryptoJS.AES.decrypt(configUrl, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
}
```

### Modified Function: `parseWithAxios(playerUrl)`
```javascript
async function parseWithAxios(playerUrl) {
    const response = await httpClient.get(playerUrl);
    const $ = cheerio.load(response.data);

    // Extract config from script tags
    const scripts = $('script').map((_, el) => $(el).html()).get();
    for (const script of scripts) {
        if (script && script.includes('var config = {')) {
            // Parse config object (need safe JSON parsing)
            const configMatch = script.match(/var config = ({[\s\S]*?});/);
            if (configMatch) {
                const config = parseConfigObject(configMatch[1]);
                if (config.url && config.vkey) {
                    const videoId = extractVideoIdFromUrl(playerUrl);
                    const decryptedUrl = decryptPlayerUrl(config.url, config.vkey, videoId);
                    if (decryptedUrl.startsWith('http')) {
                        return decryptedUrl;
                    }
                }
            }
        }
    }

    // Fallback to existing methods...
}
```

## Trade-offs

### Pros
- **Simpler**: ~100 lines of code vs ~500 for Puppeteer handling
- **Faster**: ~100ms vs ~5-12 seconds for Puppeteer
- **More Reliable**: Direct HTTP vs browser automation flakiness
- **Lower Cost**: No Chrome process overhead

### Cons
- **Tight Coupling**: Depends on specific player implementation
- **Breakage Risk**: If player changes encryption, we need to update
- **Debugging**: Harder to debug if decryption fails (can't see browser state)

### Mitigation
- Keep Puppeteer as emergency fallback
- Add extensive logging for decryption failures
- Monitor for player page changes

## Dependencies

### New Dependency
```json
{
  "crypto-js": "^4.2.0"
}
```

### Optional Dependency Removal
- Puppeteer can remain for other scraping tasks
- Only remove from `parsePlayerPage()` and `parseWithPuppeteer()` functions

## Testing Approach

1. **Unit Tests**: Test `decryptPlayerUrl()` with known values
2. **Integration Tests**: Test full flow with real episode URLs
3. **Chrome MCP Verification**: Compare decrypted URLs with browser network requests
4. **Error Cases**: Test missing config, invalid encryption, network failures
