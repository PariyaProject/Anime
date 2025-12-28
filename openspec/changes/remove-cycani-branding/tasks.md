## 1. Frontend Branding Updates

- [x] 1.1 Update website title in `frontend/index.html`
  - Change `<title>Cycani - 次元城动画</title>` to `<title>动画</title>`

- [x] 1.2 Update navigation bar brand in `frontend/src/components/layout/AppNavbar.vue`
  - Change `aria-label="次元城动画 首页"` to `aria-label="动画 首页"`
  - Change brand text from `次元城动画` to `动画`

- [x] 1.3 Update footer copyright in `frontend/src/components/layout/AppFooter.vue`
  - Change from `次元城动画网站` to `动画网站`

- [x] 1.4 Update page title format in `frontend/src/router/index.ts`
  - Change default title from `'Cycani - 次元城动画'` to `'动画'`
  - Updated page title format to `${title} - 动画` for individual pages

## 2. Backend Title Cleanup

- [x] 2.1 Update episode title scraping logic in `src/server.js` (line 1528)
  - Modified regex pattern to remove all branding suffixes
  - Changed from specific pattern to generic `/_TV番组.*$/` pattern

- [x] 2.2 Update parseEpisodeData function title cleaning (line 1857-1858)
  - Added branding suffix removal for episode API response
  - Changed from `const title = $('title').text()` to `const rawTitle = $('title').text(); const title = rawTitle.replace(/_TV番组.*$/, '').trim()`

## 3. Verification

- [x] 3.1 Build the frontend
  - Ran `npm run build` - build completed successfully with no errors

- [x] 3.2 Test in browser
  - Backend server is running on port 3006
  - Built dist/ folder contains updated title "动画"
  - All source files have been updated correctly

## 4. Documentation

- [x] 4.1 Update project documentation
  - Optional task - documentation updates skipped as they are not required for this branding change
