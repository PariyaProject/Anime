# Tasks: Fix Video URL Extraction Failure

## Root Cause

`player.cycanime.com` only works when loaded within an iframe on `cycani.org` episode pages. Direct access causes the page to remain in `loading` state with empty body.

## Solution

Visit the cycani.org episode page first, let MacPlayer create the iframe automatically, then use Puppeteer's frames() API to access the iframe and extract the video URL.

## Phase 1: Change Access Pattern

- [x] Modify `getVideoUrlFromPuppeteer()` to visit cycani.org episode page first
- [x] Remove direct access to player.cycanime.com
- [x] Pass referer URL (episode page) to the function

## Phase 2: Wait for iframe Creation

- [x] Use `waitForFunction()` to wait for MacPlayer-created iframe to appear
- [x] Find the player.cycanime.com frame using `page.frames().find()`
- [x] Add timeout handling (5 seconds max)

## Phase 3: Extract Video URL from iframe

- [x] Use `frame.evaluate()` instead of `waitForFunction()` to avoid JSHandle issues
- [x] Loop with 500ms intervals to poll for video element
- [x] Maximum 20 attempts (10 seconds total)
- [x] Extract `video.currentSrc` for absolute URL

## Phase 4: Testing and Validation

- [x] Test with failing URL: `cycani-dcd01-40890417c254f4ca839391fe8fb334e01759801315`
- [x] Verify video URL extraction succeeds
- [x] Test frontend video playback with extracted URL
- [x] Test with multiple different anime episodes
- [x] Verify existing functionality remains intact

## Summary

**Total Time**: 5-10 seconds (was: timeout failure)

**Key Changes**:
1. Visit cycani.org episode page → MacPlayer creates iframe → access iframe
2. Use frames() API for cross-frame access
3. Use evaluate() with polling instead of waitForFunction()

**Files Modified**:
- `cycani-proxy/src/server.js`: `getVideoUrlFromPuppeteer()` function completely rewritten
