# Proposal: Fix Player Video URL Extraction

## Problem Statement

The backend's video URL extraction for the `/api/episode` endpoint is not working correctly. Currently:

1. The system uses Puppeteer to navigate to the player page and intercept network requests
2. This approach is unnecessarily complex and resource-intensive
3. The player page actually returns all necessary data in its HTML response
4. The video URL is AES-encrypted in the `config.url` field with `vkey` as the decryption key

## Investigation Findings

Using Chrome MCP to inspect `https://www.cycani.org/watch/3944/1/21.html`:

1. **Watch Page Structure**: Contains an iframe with src=`https://player.cycanime.com/?url=cycani-dcd01-39aaa93004d357631fea86e2bc8442431756347877`

2. **Player Page HTML**: Returns a `config` object with:
   ```javascript
   var config = {
       "url": "FtcyL807Aewrj4DQZ+WcIF2XEVBDGDWVlI+wOTqOlKckLuRZacrhObXRTvWQ14bA7/9kj0PFPguUmRQKxM/JOnnplj7JE0eecynlSZRwTOZkOQeJvOxNT2hYUIah6d9yrHvbR1lNlBeDNswKeGL/3co0QpV50RutlHUY0ghj0l4ieqxtOzmc3rOJKDhS6FGzl1Zt04e12rCqauDn6YL/brWHiQPLdn+I7d4xLDAx3awjLBU6Ae6yx+xRa0D2wckzVDmfB4EtKQFjbruz05BGjA==",
       "vkey": "5ecbfc7553e01e6e5cc0ba1b660ad193",
       ...
   }
   ```

3. **Real Video URL**: After decryption: `https://p9-dcd-sign.byteimg.com/tos-cn-i-f042mdwyw7/90a2702e43bd4710840781f002feef53~tplv-jxcbcipi3j-image.image?...`

4. **Decryption Method**: The player's `setting.js` uses CryptoJS.AES with:
   - Key derived from MD5 of video ID (first 16 chars)
   - IV from MD5 of video ID (last 16 chars)
   - Mode: ECB
   - Padding: Pkcs7

## Proposed Solution

Replace the Puppeteer-based approach with a simpler HTTP-based solution:

1. **Direct HTML Fetching**: Use axios to fetch the player page HTML
2. **Config Extraction**: Parse the `config` object from `<script>` tags
3. **AES Decryption**: Use crypto-js library to decrypt the URL
4. **Remove Puppeteer Dependency**: No longer need Puppeteer for video URL extraction

## Benefits

1. **Simpler**: No need for headless browser
2. **Faster**: Direct HTTP request instead of browser launch
3. **More Reliable**: No race conditions or timeout issues
4. **Lower Resource Usage**: No Chrome process overhead
5. **Easier to Debug**: Straightforward HTTP request/response

## Dependencies

- Add `crypto-js` package to backend dependencies
- Remove `puppeteer` from video URL extraction flow (can keep for other uses if needed)

## Affected Components

- `cycani-proxy/src/server.js`: Modify `parseWithAxios()` and `parsePlayerPage()` functions
- `cycani-proxy/package.json`: Add crypto-js dependency

## Testing Strategy

1. Use Chrome MCP to verify decryption logic matches player's implementation
2. Test with multiple episodes to ensure consistency
3. Verify error handling for malformed/missing config data
